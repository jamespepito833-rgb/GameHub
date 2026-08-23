import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const url = event.url;
	const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '50'), 200);
	const offset = parseInt(url.searchParams.get('offset') ?? '0');
	const action = url.searchParams.get('action');
	const actorId = url.searchParams.get('actorId');

	const filter: Record<string, unknown> = {};
	if (action) filter.action = action;
	if (actorId) {
		try {
			const { ObjectId } = await import('mongodb');
			filter.actorId = new ObjectId(actorId);
		} catch {}
	}

	const db = await getDb();
	const logs = await db
		.collection('activityLogs')
		.find(filter)
		.sort({ createdAt: -1 })
		.skip(offset)
		.limit(limit)
		.toArray();
	const total = await db.collection('activityLogs').countDocuments(filter);
	return successJson({ logs, total, limit, offset });
};
