import type { RequestHandler } from './$types';
import { createHash } from 'node:crypto';
import { getDb } from '$lib/server/db/mongo';
import { logActivity } from '$lib/server/utils/activity';
import { successJson } from '$lib/server/utils/response';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return (
		event.getClientAddress?.() ??
		event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	);
}

export const POST: RequestHandler = async (event) => {
	const token = event.cookies.get('auth_token');
	const ip = getIp(event);

	if (token) {
		try {
			const tokenHash = createHash('sha256').update(token).digest('hex');
			const db = await getDb();
			const session = await db.collection('authSessions').findOne({ tokenHash });
			if (session) {
				await db.collection('authSessions').deleteOne({ _id: session._id });
				// try to find user for logging
				const user = await db.collection('users').findOne({ _id: session.userId });
				await logActivity({
					actorId: session.userId,
					actorRole: session.role,
					action: 'LOGOUT',
					ip,
					targetCollection: 'users',
					targetId: session.userId
				});
			}
		} catch (e) {
			console.error('[logout] failed', e);
		}
	}

	// Clear cookie regardless
	event.cookies.delete('auth_token', { path: '/' });

	return successJson({ ok: true });
};
