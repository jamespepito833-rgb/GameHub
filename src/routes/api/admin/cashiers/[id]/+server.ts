import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { cashierUpdateSchema } from '$lib/schemas/cashiers';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { hashPassword } from '$lib/server/auth/hash';
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
	if (!isValidId(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = cashierUpdateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const updates = parsed.data as Record<string, unknown>;
	const db = await getDb();
	const _id = new ObjectId(id);
	const existing = await db.collection('users').findOne({ _id, role: 'CASHIER' });
	if (!existing) return errorJson(404, 'E_NOT_FOUND', 'Cashier not found');
	const before = { ...existing, passwordHash: undefined };
	const set: Record<string, unknown> = { updatedAt: new Date() };
	if (typeof updates.displayName === 'string') set.displayName = (updates.displayName as string).trim();
	if (updates.status) set.status = updates.status;
	if (typeof updates.password === 'string') {
		set.passwordHash = await hashPassword(updates.password as string);
	}
	await db.collection('users').updateOne({ _id }, { $set: set });
	const after = await db.collection('users').findOne({ _id }, { projection: { passwordHash: 0 } });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'CASHIER_UPDATED',
		targetCollection: 'users',
		targetId: _id,
		before,
		after,
		ip: getIp(event)
	});
	// If disabling, also invalidate sessions? Optional: delete authSessions
	if (updates.status === 'DISABLED') {
		await db.collection('authSessions').deleteMany({ userId: _id });
	}
	return successJson({ cashier: after });
};

export const DELETE: RequestHandler = async (event) => {
	// For MVP, DELETE disables instead of hard delete
	let user: NonNullable<App.Locals['user']>;
	try {
		user = requireRole(event, 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const id = event.params.id;
	if (!isValidId(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	const db = await getDb();
	const _id = new ObjectId(id);
	const existing = await db.collection('users').findOne({ _id, role: 'CASHIER' });
	if (!existing) return errorJson(404, 'E_NOT_FOUND', 'Cashier not found');
	await db.collection('users').updateOne({ _id }, { $set: { status: 'DISABLED', updatedAt: new Date() } });
	await db.collection('authSessions').deleteMany({ userId: _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'CASHIER_DISABLED',
		targetCollection: 'users',
		targetId: _id,
		before: { ...existing, passwordHash: undefined },
		ip: getIp(event)
	});
	return successJson({ ok: true });
};
