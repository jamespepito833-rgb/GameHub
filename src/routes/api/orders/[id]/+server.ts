import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { orderUpdateSchema } from '$lib/schemas/orders';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const PATCH: RequestHandler = async (event) => {
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
	const parsed = orderUpdateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const db = await getDb();
	const _id = new ObjectId(id);
	const order = await db.collection('orders').findOne({ _id });
	if (!order) return errorJson(404, 'E_NOT_FOUND', 'Order not found');
	if (order.status !== 'PENDING') return errorJson(422, 'E_ORDER_NOT_PENDING', 'Only PENDING orders can be updated');
	const { status } = parsed.data;
	const now = new Date();
	const set: Record<string, unknown> = { status, updatedAt: now };
	if (status === 'SERVED') set.servedAt = now;
	await db.collection('orders').updateOne({ _id }, { $set: set });
	const after = await db.collection('orders').findOne({ _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: status === 'SERVED' ? 'ORDER_SERVED' : 'ORDER_CANCELLED',
		targetCollection: 'orders',
		targetId: _id,
		before: order,
		after,
		ip: getIp(event)
	});
	return successJson({ order: after });
};
