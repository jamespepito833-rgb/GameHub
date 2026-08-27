import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
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
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	const db = await getDb();
	const _id = new ObjectId(id);
	const entry = await db.collection('queueEntries').findOne({ _id });
	if (!entry) return errorJson(404, 'E_NOT_FOUND', 'Queue entry not found');
	if (entry.status !== 'WAITING') return errorJson(422, 'E_NOT_WAITING', 'Only WAITING can be called');
	const now = new Date();
	await db.collection('queueEntries').updateOne({ _id }, { $set: { status: 'CALLED', calledAt: now, updatedAt: now } });
	const after = await db.collection('queueEntries').findOne({ _id });
	await logActivity({ actorId: user._id, actorRole: user.role, action: 'QUEUE_CALLED', targetCollection: 'queueEntries', targetId: _id, before: entry, after, ip: getIp(event) });
	return successJson({ queueEntry: after });
};

