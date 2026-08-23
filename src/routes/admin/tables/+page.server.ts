import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async () => {
	const db = await getDb();
	const tables = await db.collection('tables').find().sort({ name: 1 }).toArray();
	// serialize ObjectIds
	return {
		tables: tables.map((t) => ({
			_id: t._id.toString(),
			name: t.name,
			description: t.description,
			status: t.status,
			createdAt: t.createdAt?.toISOString(),
			updatedAt: t.updatedAt?.toISOString()
		}))
	};
};
