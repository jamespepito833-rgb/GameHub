import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async ({ locals }) => {
	const db = await getDb();
	// Expire CALLED >10min
	const tenAgo = new Date(Date.now() - 10 * 60 * 1000);
	await db.collection('queueEntries').updateMany({ status: 'CALLED', calledAt: { $lt: tenAgo } }, { $set: { status: 'EXPIRED', updatedAt: new Date() } });
	const queue = await db.collection('queueEntries').find({ status: { $in: ['WAITING', 'CALLED'] } }).sort({ createdAt: 1 }).toArray();
	return {
		user: locals.user!,
		queue: queue.map((q) => ({
			_id: q._id.toString(),
			customerName: q.customerName,
			customerContact: q.customerContact,
			partySize: q.partySize,
			status: q.status,
			createdAt: q.createdAt?.toISOString()
		}))
	};
};
