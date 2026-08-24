import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async () => {
	const db = await getDb();
	const cashiers = await db.collection('users').find({ role: 'CASHIER' }, { projection: { passwordHash: 0 } }).sort({ username: 1 }).toArray();
	return {
		cashiers: cashiers.map((c) => ({
			_id: c._id.toString(),
			username: c.username,
			displayName: c.displayName,
			status: c.status,
			createdAt: c.createdAt?.toISOString()
		}))
	};
};
