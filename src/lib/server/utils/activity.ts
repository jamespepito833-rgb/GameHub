import { getDb } from '$lib/server/db/mongo';
import { ObjectId } from 'mongodb';

export type ActivityAction =
	| 'LOGIN'
	| 'LOGIN_FAILED'
	| 'LOGIN_RATE_LIMITED'
	| 'LOGOUT'
	| 'LOGIN_OUTSIDE_SCHEDULE';

export async function logActivity(params: {
	actorId?: ObjectId | string | null;
	actorRole?: string | null;
	action: ActivityAction | string;
	targetCollection?: string | null;
	targetId?: ObjectId | string | null;
	before?: unknown;
	after?: unknown;
	ip?: string | null;
}) {
	try {
		const db = await getDb();
		await db.collection('activityLogs').insertOne({
			actorId: params.actorId ? new ObjectId(String(params.actorId)) : null,
			actorRole: params.actorRole ?? null,
			action: params.action,
			targetCollection: params.targetCollection ?? null,
			targetId: params.targetId ?? null,
			before: params.before ?? null,
			after: params.after ?? null,
			ip: params.ip ?? null,
			createdAt: new Date()
		});
	} catch (e) {
		console.error('[activity] log failed', e);
	}
}
