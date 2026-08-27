import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { transactionCreateSchema } from '$lib/schemas/transactions';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const POST: RequestHandler = async (event) => {
	let user: NonNullable<App.Locals['user']>;
	try {
		user = requireRole(event, 'CASHIER');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'CASHIER only');
	}
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = transactionCreateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const { sessionId, method, amountTendered, gcashRef } = parsed.data;
	const sessOid = new ObjectId(sessionId);
	const db = await getDb();
	const session = await db.collection('sessions').findOne({ _id: sessOid });
	if (!session) return errorJson(404, 'E_NOT_FOUND', 'Session not found');
	if (session.status !== 'ENDED') return errorJson(422, 'E_SESSION_NOT_ENDED', 'Session must be ENDED before payment');
	// Check already paid
	const existingTx = await db.collection('transactions').findOne({ sessionId: sessOid, status: 'PAID' });
	if (existingTx) return successJson({ transaction: existingTx, alreadyPaid: true });

	// Calculate bill
	let durationMinutes = session.durationMinutes;
	if (!durationMinutes) {
		durationMinutes = Math.max(1, Math.ceil((session.endedAt.getTime() - session.startedAt.getTime()) / 60000));
	}
	const rate = session.pricingSnapshot.ratePerHour;
	const sessionCost = Math.round(durationMinutes * (rate / 60) * 100) / 100;
	const orders = await db.collection('orders').find({ sessionId: sessOid, status: { $ne: 'CANCELLED' } }).toArray();
	const ordersCost = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
	const total = Math.round((sessionCost + ordersCost) * 100) / 100;

	if (amountTendered < total) return errorJson(422, 'E_INSUFFICIENT_PAYMENT', `Insufficient payment, need ₱${total}`, { total, sessionCost, ordersCost });

	const change = Math.round((amountTendered - total) * 100) / 100;
	const now = new Date();

	// Check if GCash ref provided when needed
	if (method === 'GCASH' && !gcashRef) return errorJson(400, 'E_MISSING_GCASH_REF', 'GCash ref required');

	const txDoc = {
		sessionId: sessOid,
		reservationId: session.reservationId ?? null,
		tableId: session.tableId,
		cashierId: new ObjectId(user._id),
		status: 'PAID' as const,
		method,
		gcashRef: gcashRef ?? null,
		sessionCost,
		ordersCost,
		total,
		amountTendered,
		change,
		pricingSnapshot: session.pricingSnapshot,
		paidAt: now,
		createdAt: now
	};

	const res = await db.collection('transactions').insertOne(txDoc);
	// Update session to COMPLETED and table to AVAILABLE
	await db.collection('sessions').updateOne({ _id: sessOid }, { $set: { status: 'COMPLETED', updatedAt: now } });
	await db.collection('tables').updateOne({ _id: session.tableId }, { $set: { status: 'AVAILABLE', updatedAt: now } });

	const transaction = await db.collection('transactions').findOne({ _id: res.insertedId });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'TRANSACTION_PAID',
		targetCollection: 'transactions',
		targetId: res.insertedId,
		after: transaction,
		ip: getIp(event)
	});

	return successJson({ transaction, change }, 201);
};

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'CASHIER', 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const db = await getDb();
	const txs = await db.collection('transactions').find().sort({ paidAt: -1 }).limit(100).toArray();
	return successJson({ transactions: txs });
};
