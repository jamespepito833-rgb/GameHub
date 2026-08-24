import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { cashierCreateSchema } from '$lib/schemas/cashiers';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { hashPassword } from '$lib/server/auth/hash';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const db = await getDb();
	const cashiers = await db
		.collection('users')
		.find({ role: 'CASHIER' }, { projection: { passwordHash: 0 } })
		.sort({ username: 1 })
		.toArray();
	return successJson({ cashiers });
};

export const POST: RequestHandler = async (event) => {
	let user: NonNullable<App.Locals['user']>;
	try {
		user = requireRole(event, 'ADMIN');
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
	const parsed = cashierCreateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const { username, password, displayName } = parsed.data;
	const db = await getDb();
	const now = new Date();
	const passwordHash = await hashPassword(password);
	try {
		const res = await db.collection('users').insertOne({
			username: username.trim(),
			passwordHash,
			role: 'CASHIER',
			displayName: displayName.trim(),
			status: 'ACTIVE',
			createdAt: now,
			updatedAt: now,
			createdBy: new ObjectId(user._id)
		});
		const cashier = await db.collection('users').findOne({ _id: res.insertedId }, { projection: { passwordHash: 0 } });
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'CASHIER_CREATED',
			targetCollection: 'users',
			targetId: res.insertedId,
			after: cashier,
			ip: getIp(event)
		});
		return successJson({ cashier }, 201);
	} catch (e: any) {
		if (e.code === 11000) return errorJson(409, 'E_DUPLICATE_USERNAME', 'Username already exists');
		console.error('[cashiers POST]', e);
		return errorJson(500, 'E_INTERNAL', 'Internal error');
	}
};
