import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async ({ locals }) => {
	const db = await getDb();
	const now = new Date();
	const startOfDay = new Date(now);
	startOfDay.setHours(0, 0, 0, 0);
	const startOfWeek = new Date(startOfDay);
	startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
	const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

	const [incomeToday, incomeWeek, incomeMonth, activeSessions, tables, recentLogs] = await Promise.all([
		db
			.collection('transactions')
			.aggregate([{ $match: { status: 'PAID', paidAt: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }])
			.toArray(),
		db
			.collection('transactions')
			.aggregate([{ $match: { status: 'PAID', paidAt: { $gte: startOfWeek } } }, { $group: { _id: null, total: { $sum: '$total' } } }])
			.toArray(),
		db
			.collection('transactions')
			.aggregate([{ $match: { status: 'PAID', paidAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$total' } } }])
			.toArray(),
		db.collection('sessions').countDocuments({ status: { $in: ['ACTIVE', 'EXTENDED'] } }),
		db.collection('tables').find().toArray(),
		db.collection('activityLogs').find().sort({ createdAt: -1 }).limit(5).toArray()
	]);

	return {
		user: locals.user!,
		stats: {
			incomeToday: incomeToday[0]?.total ?? 0,
			incomeWeek: incomeWeek[0]?.total ?? 0,
			incomeMonth: incomeMonth[0]?.total ?? 0,
			activeSessions,
			tablesTotal: tables.length,
			tablesAvailable: tables.filter((t) => t.status === 'AVAILABLE').length,
			tablesOccupied: tables.filter((t) => t.status === 'OCCUPIED').length,
			tablesMaintenance: tables.filter((t) => t.status === 'MAINTENANCE').length
		},
		recentLogs: recentLogs.map((l) => ({
			action: l.action,
			actorRole: l.actorRole,
			createdAt: l.createdAt?.toISOString()
		}))
	};
};
