import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
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
		user = requireRole(event, 'CASHIER', 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const tableId = (body as any)?.tableId;
	if (!tableId || !ObjectId.isValid(tableId)) return errorJson(400, 'E_INVALID_TABLE', 'tableId required');
	const db = await getDb();
	const _id = new ObjectId(id);
	const entry = await db.collection('queueEntries').findOne({ _id });
	if (!entry) return errorJson(404, 'E_NOT_FOUND', 'Queue entry not found');
	if (entry.status !== 'CALLED') return errorJson(422, 'E_NOT_CALLED', 'Only CALLED can be seated');
	const tableOid = new ObjectId(tableId);
	const table = await db.collection('tables').findOne({ _id: tableOid });
	if (!table) return errorJson(404, 'E_TABLE_NOT_FOUND', 'Table not found');
	if (table.status !== 'AVAILABLE') return errorJson(409, 'E_TABLE_OCCUPIED', 'Table not available');
	const active = await db.collection('sessions').findOne({ tableId: tableOid, status: { $in: ['ACTIVE', 'EXTENDED'] } });
	if (active) return errorJson(409, 'E_TABLE_OCCUPIED', 'Table already occupied');

	const pricing = await db.collection('pricing').findOne({ isActive: true });
	if (!pricing) return errorJson(500, 'E_NO_PRICING', 'No active pricing');
	const now = new Date();
	const durationMinutes = 60; // default 60 for queue seat
	const expectedEndAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
	const pricingSnapshot = { pricingId: pricing._id, ratePerHour: pricing.ratePerHour, effectiveFrom: pricing.effectiveFrom };

	const sessionDoc: any = {
		tableId: tableOid,
		customerName: entry.customerName,
		customerContact: entry.customerContact,
		status: 'ACTIVE' as const,
		startedAt: now,
		expectedEndAt,
		endedAt: null,
		durationMinutes: null,
		pricingSnapshot,
		extensions: [],
		startedBy: new ObjectId(user._id),
		endedBy: null,
		createdAt: now,
		updatedAt: now
	};

	try {
		const res = await db.collection('sessions').insertOne(sessionDoc);
		await db.collection('tables').updateOne({ _id: tableOid }, { $set: { status: 'OCCUPIED', updatedAt: now, updatedBy: new ObjectId(user._id) } });
		await db.collection('queueEntries').updateOne(
			{ _id },
			{ $set: { status: 'SEATED', seatedAt: now, seatedTableId: tableOid, seatedSessionId: res.insertedId, updatedAt: now } }
		);
		const session = await db.collection('sessions').findOne({ _id: res.insertedId });
		const afterEntry = await db.collection('queueEntries').findOne({ _id });
		await logActivity({ actorId: user._id, actorRole: user.role, action: 'QUEUE_SEATED', targetCollection: 'queueEntries', targetId: _id, before: entry, after: afterEntry, ip: getIp(event) });
		return successJson({ session, queueEntry: afterEntry }, 201);
	} catch (e: any) {
		console.error('[queue seat]', e);
		return errorJson(500, 'E_INTERNAL', e.message ?? 'Internal error');
	}
};
