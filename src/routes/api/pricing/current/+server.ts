import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { successJson, errorJson } from '$lib/server/utils/response';

export const GET: RequestHandler = async () => {
	const db = await getDb();
	const current = await db.collection('pricing').findOne({ isActive: true });
	if (!current) return errorJson(404, 'E_NO_PRICING', 'No active pricing');
	return successJson({ pricing: current });
};
