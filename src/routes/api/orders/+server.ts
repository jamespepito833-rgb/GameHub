import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { orderCreateSchema } from '$lib/schemas/orders';
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
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = orderCreateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const { sessionId, items } = parsed.data;
	const sessOid = new ObjectId(sessionId);
	const db = await getDb();
	const session = await db.collection('sessions').findOne({ _id: sessOid });
	if (!session) return errorJson(404, 'E_NOT_FOUND', 'Session not found');
	if (['COMPLETED', 'VOIDED'].includes(session.status)) return errorJson(422, 'E_SESSION_COMPLETED', 'Cannot add order to completed session');

	// Build order items with snapshot
	const orderItems: any[] = [];
	let total = 0;
	for (const it of items) {
		const prod = await db.collection('products').findOne({ _id: new ObjectId(it.productId) });
		if (!prod) return errorJson(404, 'E_PRODUCT_NOT_FOUND', `Product ${it.productId} not found`);
		if (!prod.isAvailable) return errorJson(422, 'E_PRODUCT_UNAVAILABLE', `Product ${prod.name} unavailable`);
		const lineTotal = prod.unitPrice * it.qty;
		total += lineTotal;
		orderItems.push({
			productId: prod._id,
			nameSnapshot: prod.name,
			unitPriceSnapshot: prod.unitPrice,
			qty: it.qty,
			lineTotal
		});
	}

	const now = new Date();
	const orderDoc = {
		sessionId: sessOid,
		tableId: session.tableId,
		items: orderItems,
		total,
		status: 'PENDING' as const,
		createdBy: new ObjectId(user._id),
		createdAt: now,
		updatedAt: now,
		servedAt: null
	};
	const res = await db.collection('orders').insertOne(orderDoc);
	const order = await db.collection('orders').findOne({ _id: res.insertedId });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'ORDER_CREATED',
		targetCollection: 'orders',
		targetId: res.insertedId,
		after: order,
		ip: getIp(event)
	});
	return successJson({ order }, 201);
};

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'CASHIER');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const db = await getDb();
	const sessionId = event.url.searchParams.get('sessionId');
	const filter: Record<string, unknown> = {};
	if (sessionId && ObjectId.isValid(sessionId)) filter.sessionId = new ObjectId(sessionId);
	const orders = await db.collection('orders').find(filter).sort({ createdAt: -1 }).limit(100).toArray();
	return successJson({ orders });
};

