import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async ({ locals }) => {
	const db = await getDb();
	const tables = await db.collection('tables').find().sort({ name: 1 }).toArray();
	const activeSessions = await db.collection('sessions').find({ status: { $in: ['ACTIVE', 'EXTENDED'] } }).toArray();
	const sessionByTable = new Map<string, (typeof activeSessions)[0]>();
	for (const s of activeSessions) sessionByTable.set(s.tableId.toString(), s);
	const now = new Date();
	const in30 = new Date(now.getTime() + 30 * 60 * 1000);
	const upcoming = await db.collection('reservations').find({ status: 'CONFIRMED', startTime: { $gte: now, $lte: in30 } }).toArray();
	const resByTable = new Map<string, (typeof upcoming)[0]>();
	for (const r of upcoming) if (!resByTable.has(r.tableId.toString())) resByTable.set(r.tableId.toString(), r);

	const result = tables.map((t) => {
		const sess = sessionByTable.get(t._id.toString());
		const nextRes = resByTable.get(t._id.toString());
		let displayStatus = t.status as string;
		if (t.status === 'AVAILABLE' && nextRes) displayStatus = 'RESERVED';
		return {
			_id: t._id.toString(),
			name: t.name,
			description: t.description,
			status: t.status,
			displayStatus,
			currentSession: sess
				? {
						_id: sess._id.toString(),
						status: sess.status,
						startedAt: sess.startedAt.toISOString(),
						expectedEndAt: sess.expectedEndAt.toISOString(),
						customerName: sess.customerName
					}
				: null
		};
	});

	return { user: locals.user!, tables: result };
};
