import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async ({ url }) => {
	const db = await getDb();
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
	const logs = await db.collection('activityLogs').find().sort({ createdAt: -1 }).limit(limit).toArray();
	return {
		logs: logs.map((l) => ({
			_id: l._id.toString(),
			action: l.action,
			actorRole: l.actorRole,
			actorId: l.actorId?.toString() ?? null,
			targetCollection: l.targetCollection,
			targetId: l.targetId?.toString() ?? null,
			createdAt: l.createdAt?.toISOString(),
			ip: l.ip
		}))
	};
};
