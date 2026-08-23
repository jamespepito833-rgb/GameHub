import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { productUpdateSchema } from '$lib/schemas/products';
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
	if (!isValidId(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = productUpdateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const updates = parsed.data as Record<string, unknown>;
	if (typeof updates.name === 'string') updates.name = (updates.name as string).trim();
	const db = await getDb();
	const _id = new ObjectId(id);
	const existing = await db.collection('products').findOne({ _id });
	if (!existing) return errorJson(404, 'E_NOT_FOUND', 'Product not found');
	const before = { ...existing };
	const set: Record<string, unknown> = { updatedAt: new Date() };
	for (const k of Object.keys(updates)) set[k] = (updates as any)[k];
	try {
		await db.collection('products').updateOne({ _id }, { $set: set });
		const after = await db.collection('products').findOne({ _id });
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'PRODUCT_UPDATED',
			targetCollection: 'products',
			targetId: _id,
			before,
			after,
			ip: getIp(event)
		});
		return successJson({ product: after });
	} catch (e: any) {
		if (e.code === 11000) return errorJson(409, 'E_DUPLICATE_PRODUCT', 'Product name exists');
		console.error('[products PATCH]', e);
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
	if (!isValidId(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	const db = await getDb();
	const _id = new ObjectId(id);
	const existing = await db.collection('products').findOne({ _id });
	if (!existing) return errorJson(404, 'E_NOT_FOUND', 'Product not found');
	await db.collection('products').deleteOne({ _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'PRODUCT_DELETED',
		targetCollection: 'products',
		targetId: _id,
		before: existing,
		ip: getIp(event)
	});
	return successJson({ ok: true });
};
