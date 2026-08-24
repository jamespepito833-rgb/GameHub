import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { productCreateSchema } from '$lib/schemas/products';
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
	const products = await db.collection('products').find().sort({ name: 1 }).toArray();
	return successJson({ products });
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
	const parsed = productCreateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const { name, category, unitPrice, isAvailable } = parsed.data;
	const db = await getDb();
	const now = new Date();
	try {
		const res = await db.collection('products').insertOne({
			name: name.trim(),
			category,
			unitPrice,
			isAvailable,
			createdAt: now,
			updatedAt: now
		});
		const product = await db.collection('products').findOne({ _id: res.insertedId });
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'PRODUCT_CREATED',
			targetCollection: 'products',
			targetId: res.insertedId,
			after: product,
			ip: getIp(event)
		});
		return successJson({ product }, 201);
	} catch (e: any) {
		if (e.code === 11000) return errorJson(409, 'E_DUPLICATE_PRODUCT', 'Product name already exists');
		console.error('[products POST]', e);
		return errorJson(500, 'E_INTERNAL', 'Internal error');
	}
};
