import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { tableCreateSchema } from '$lib/schemas/tables';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
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
	const tables = await db.collection('tables').find().sort({ name: 1 }).toArray();
	return successJson({ tables });
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
	const parsed = tableCreateSchema.safeParse(body);
	if (!parsed.success) {
		return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	}
	const { name, description, status } = parsed.data;

	// OCCUPIED is operational (CASHIER) — ADMIN cannot create as OCCUPIED
	if (status === 'OCCUPIED') {
		return errorJson(403, 'E_FORBIDDEN', 'ADMIN cannot create table as OCCUPIED — use CASHIER operational');
	}

	const db = await getDb();
	const now = new Date();
	try {
		const res = await db.collection('tables').insertOne({
			name: name.trim(),
			description: description?.trim() ?? '',
			status,
			createdAt: now,
			updatedAt: now,
			updatedBy: new ObjectId(user._id)
		});
		const table = await db.collection('tables').findOne({ _id: res.insertedId });
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'TABLE_CREATED',
			targetCollection: 'tables',
			targetId: res.insertedId,
			after: table,
			ip: getIp(event)
		});
		return successJson({ table }, 201);
	} catch (e: any) {
		if (e.code === 11000) {
			return errorJson(409, 'E_DUPLICATE_TABLE', 'Table name already exists');
		}
		console.error('[tables POST]', e);
		return errorJson(500, 'E_INTERNAL', 'Internal error');
	}
};
