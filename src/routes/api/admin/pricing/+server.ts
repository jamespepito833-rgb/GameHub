import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { pricingCreateSchema } from '$lib/schemas/pricing';
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
	const pricings = await db.collection('pricing').find().sort({ effectiveFrom: -1 }).toArray();
	return successJson({ pricings });
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
	const parsed = pricingCreateSchema.safeParse(body);
	if (!parsed.success) {
		return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	}
	const { ratePerHour } = parsed.data;
	const db = await getDb();
	const now = new Date();

	// Atomically deactivate previous active and insert new
	const prev = await db.collection('pricing').findOne({ isActive: true });
	if (prev) {
		await db.collection('pricing').updateOne({ _id: prev._id }, { $set: { isActive: false, effectiveTo: now } });
	}
	const res = await db.collection('pricing').insertOne({
		ratePerHour,
		effectiveFrom: now,
		effectiveTo: null,
		isActive: true,
		createdAt: now,
		createdBy: new ObjectId(user._id)
	});
	const pricing = await db.collection('pricing').findOne({ _id: res.insertedId });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'PRICING_CREATED',
		targetCollection: 'pricing',
		targetId: res.insertedId,
		after: pricing,
		ip: getIp(event)
	});
	return successJson({ pricing }, 201);
};
