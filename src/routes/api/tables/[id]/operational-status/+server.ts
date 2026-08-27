import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { cashierTableOperationalSchema } from '$lib/schemas/tables';
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
		return errorJson(403, 'E_FORBIDDEN', 'CASHIER only — ADMIN cannot set operational status');
	}

	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid table id');

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = cashierTableOperationalSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });

	const { status } = parsed.data;
	const db = await getDb();
	const _id = new ObjectId(id);
	const table = await db.collection('tables').findOne({ _id });
	if (!table) return errorJson(404, 'E_NOT_FOUND', 'Table not found');

	// Cannot set operational if under maintenance
	if (table.status === 'MAINTENANCE' || table.status === 'OUT_OF_SERVICE') {
		return errorJson(409, 'E_TABLE_MAINTENANCE', 'Table is under maintenance — ADMIN must remove maintenance first');
	}

	// Idempotent
	if (table.status === status) {
		return successJson({ table });
	}

	// OCCUPIED checks
	if (status === 'OCCUPIED') {
		const active = await db.collection('sessions').findOne({ tableId: _id, status: { $in: ['ACTIVE', 'EXTENDED'] } });
		if (active) return errorJson(409, 'E_TABLE_OCCUPIED', 'Table already has active session');
		// Also check overlapping reservation? For direct mark, we don't check reservation, but could.
	}

	// AVAILABLE checks: cannot set AVAILABLE if there's an active session (should be ended first)
	if (status === 'AVAILABLE') {
		const active = await db.collection('sessions').findOne({ tableId: _id, status: { $in: ['ACTIVE', 'EXTENDED'] } });
		if (active) return errorJson(409, 'E_TABLE_OCCUPIED', 'Cannot mark AVAILABLE while active session exists — end session first');
	}

	const before = { ...table };
	const now = new Date();
	await db.collection('tables').updateOne({ _id }, { $set: { status, updatedAt: now, updatedBy: new ObjectId(user._id) } });
	const after = await db.collection('tables').findOne({ _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: status === 'OCCUPIED' ? 'TABLE_MARKED_OCCUPIED' : 'TABLE_MARKED_AVAILABLE',
		targetCollection: 'tables',
		targetId: _id,
		before,
		after,
		ip: getIp(event)
	});
	return successJson({ table: after });
};
