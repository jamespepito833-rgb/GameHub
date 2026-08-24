import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { queueCreateSchema } from '$lib/schemas/queue';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'CASHIER', 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const db = await getDb();
	// Expire CALLED >10min
	const tenAgo = new Date(Date.now() - 10 * 60 * 1000);
	await db.collection('queueEntries').updateMany({ status: 'CALLED', calledAt: { $lt: tenAgo } }, { $set: { status: 'EXPIRED', updatedAt: new Date() } });

	const status = event.url.searchParams.get('status') ?? 'WAITING';
	const filter: Record<string, unknown> = {};
	if (status !== 'all') filter.status = status;
	const entries = await db.collection('queueEntries').find(filter).sort({ createdAt: 1 }).limit(100).toArray();
	return successJson({ queue: entries });
};

export const POST: RequestHandler = async (event) => {
	let user: NonNullable<App.Locals['user']>;
	try {
		user = requireRole(event, 'CASHIER', 'ADMIN');
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
	const parsed = queueCreateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const { customerName, customerContact, partySize, preferredTableId } = parsed.data;
	const db = await getDb();
	// One WAITING/CALLED per contact
	const existing = await db.collection('queueEntries').findOne({ customerContact, status: { $in: ['WAITING', 'CALLED'] } });
	if (existing) return errorJson(409, 'E_ALREADY_IN_QUEUE', 'Contact already in queue');
	const now = new Date();
	const doc: Record<string, unknown> = {
		customerName: customerName.trim(),
		customerContact: customerContact.trim(),
		partySize: partySize ?? null,
		preferredTableId: preferredTableId ? new ObjectId(preferredTableId) : null,
		status: 'WAITING',
		createdAt: now,
		updatedAt: now,
		calledAt: null,
		seatedAt: null,
		seatedTableId: null,
		seatedSessionId: null
	};
	const res = await db.collection('queueEntries').insertOne(doc);
	const entry = await db.collection('queueEntries').findOne({ _id: res.insertedId });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'QUEUE_ADDED',
		targetCollection: 'queueEntries',
		targetId: res.insertedId,
		after: entry,
		ip: getIp(event)
	});
	return successJson({ queueEntry: entry }, 201);
};
