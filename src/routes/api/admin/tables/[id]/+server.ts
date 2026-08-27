import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { tableUpdateSchema } from '$lib/schemas/tables';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function isValidId(id: string): boolean {
	return ObjectId.isValid(id);
}

export const PATCH: RequestHandler = async (event) => {
	let user: NonNullable<App.Locals['user']>;
	try {
		user = requireRole(event, 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}

	const id = event.params.id;
	if (!isValidId(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid table id');

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = tableUpdateSchema.safeParse(body);
	if (!parsed.success) {
		return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	}
	const updates = parsed.data as Record<string, unknown>;

	const db = await getDb();
	const _id = new ObjectId(id);
	const existing = await db.collection('tables').findOne({ _id });
	if (!existing) return errorJson(404, 'E_NOT_FOUND', 'Table not found');

	// Role-separated: ADMIN may only touch UNDER_MAINTENANCE + config.
	// OCCUPIED always forbidden for ADMIN; AVAILABLE only allowed when removing UNDER_MAINTENANCE.
	if (updates.status === 'OCCUPIED') {
		return errorJson(403, 'E_FORBIDDEN', 'ADMIN cannot set OCCUPIED — use CASHIER operational endpoint');
	}
	if (updates.status === 'AVAILABLE' && !['MAINTENANCE', 'OUT_OF_SERVICE'].includes(existing.status as string)) {
		return errorJson(403, 'E_FORBIDDEN', 'ADMIN cannot set AVAILABLE except when removing UNDER_MAINTENANCE');
	}

	// BR-01 / BR-12: cannot set MAINTENANCE/OUT_OF_SERVICE if active session exists
	if (updates.status === 'MAINTENANCE' || updates.status === 'OUT_OF_SERVICE') {
		const active = await db.collection('sessions').findOne({
			tableId: _id,
			status: { $in: ['ACTIVE', 'EXTENDED'] }
		});
		if (active) {
			return errorJson(409, 'E_TABLE_OCCUPIED', 'Cannot set to maintenance while table has active session', {
				sessionId: active._id.toString()
			});
		}
	}

	// Handle name trim
	if (typeof updates.name === 'string') updates.name = (updates.name as string).trim();
	if (typeof updates.description === 'string') updates.description = (updates.description as string).trim();

	const before = { ...existing };
	const now = new Date();
	const set: Record<string, unknown> = { updatedAt: now, updatedBy: new ObjectId(user._id) };
	if (updates.name !== undefined) set.name = updates.name;
	if (updates.description !== undefined) set.description = updates.description;
	if (updates.status !== undefined) set.status = updates.status;

	try {
		await db.collection('tables').updateOne({ _id }, { $set: set });
		const after = await db.collection('tables').findOne({ _id });
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'TABLE_UPDATED',
			targetCollection: 'tables',
			targetId: _id,
			before,
			after,
			ip: getIp(event)
		});
		return successJson({ table: after });
	} catch (e: any) {
		if (e.code === 11000) return errorJson(409, 'E_DUPLICATE_TABLE', 'Table name already exists');
		console.error('[tables PATCH]', e);
		return errorJson(500, 'E_INTERNAL', 'Internal error');
	}
};

export const DELETE: RequestHandler = async (event) => {
	let user: NonNullable<App.Locals['user']>;
	try {
		user = requireRole(event, 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const id = event.params.id;
	if (!isValidId(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid table id');
	const db = await getDb();
	const _id = new ObjectId(id);
	const existing = await db.collection('tables').findOne({ _id });
	if (!existing) return errorJson(404, 'E_NOT_FOUND', 'Table not found');

	// Prevent delete if active session or future confirmed reservation exists
	const activeSession = await db.collection('sessions').findOne({ tableId: _id, status: { $in: ['ACTIVE', 'EXTENDED'] } });
	if (activeSession) return errorJson(409, 'E_TABLE_OCCUPIED', 'Cannot delete table with active session');
	const futureRes = await db.collection('reservations').findOne({ tableId: _id, status: 'CONFIRMED', startTime: { $gte: new Date() } });
	if (futureRes) return errorJson(409, 'E_TABLE_HAS_RESERVATION', 'Cannot delete table with future reservation');

	await db.collection('tables').deleteOne({ _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'TABLE_DELETED',
		targetCollection: 'tables',
		targetId: _id,
		before: existing,
		ip: getIp(event)
	});
	return successJson({ ok: true });
};
