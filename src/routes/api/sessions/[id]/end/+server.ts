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
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid session id');
	const db = await getDb();
	const _id = new ObjectId(id);
	const session = await db.collection('sessions').findOne({ _id });
	if (!session) return errorJson(404, 'E_NOT_FOUND', 'Session not found');
	if (['COMPLETED', 'VOIDED'].includes(session.status)) {
		return errorJson(422, 'E_SESSION_ALREADY_COMPLETED', 'Session already completed');
	}
	if (session.status !== 'ACTIVE' && session.status !== 'EXTENDED') {
		return errorJson(422, 'E_SESSION_NOT_ACTIVE', 'Session not active');
	}
	const now = new Date();
	const durationMinutes = Math.max(1, Math.ceil((now.getTime() - session.startedAt.getTime()) / 60000));

	await db.collection('sessions').updateOne(
		{ _id },
		{ $set: { endedAt: now, durationMinutes, status: 'ENDED', endedBy: new ObjectId(user._id), updatedAt: now } }
	);
	const after = await db.collection('sessions').findOne({ _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'SESSION_ENDED',
		targetCollection: 'sessions',
		targetId: _id,
		before: session,
		after,
		ip: getIp(event)
	});
	return successJson({ session: after });
};

