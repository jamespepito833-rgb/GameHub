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
	const db = await getDb();
	const now = new Date();
	const startOfDay = new Date(now);
	startOfDay.setHours(0, 0, 0, 0);
	const startOfWeek = new Date(startOfDay);
	startOfWeek.setDate(startOfDay.getDate() - startOfDay.getDay());
	const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

	const [incomeToday, incomeWeek, incomeMonth, activeSessions, queueWaiting, tables] = await Promise.all([
		db
			.collection('transactions')
			.aggregate([{ $match: { status: 'PAID', paidAt: { $gte: startOfDay } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }])
			.toArray(),
		db
			.collection('transactions')
			.aggregate([{ $match: { status: 'PAID', paidAt: { $gte: startOfWeek } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }])
			.toArray(),
		db
			.collection('transactions')
			.aggregate([{ $match: { status: 'PAID', paidAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: '$total' }, count: { $sum: 1 } } }])
			.toArray(),
		db.collection('sessions').countDocuments({ status: { $in: ['ACTIVE', 'EXTENDED'] } }),
		db.collection('queueEntries').countDocuments({ status: 'WAITING' }),
		db.collection('tables').find().toArray()
	]);

	// Table utilization: sessions per table (last 30 days) - simple count
	const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
	const utilization = await db
		.collection('sessions')
		.aggregate([
			{ $match: { startedAt: { $gte: thirtyDaysAgo } } },
			{ $group: { _id: '$tableId', sessions: { $sum: 1 }, totalMinutes: { $sum: '$durationMinutes' } } },
			{ $lookup: { from: 'tables', localField: '_id', foreignField: '_id', as: 'table' } },
			{ $unwind: { path: '$table', preserveNullAndEmptyArrays: true } }
		])
		.toArray();

	const totalHoursAgg = await db
		.collection('sessions')
		.aggregate([{ $match: { status: 'COMPLETED' } }, { $group: { _id: null, totalMinutes: { $sum: '$durationMinutes' } } }])
		.toArray();

	return successJson({
		income: {
			today: incomeToday[0]?.total ?? 0,
			week: incomeWeek[0]?.total ?? 0,
			month: incomeMonth[0]?.total ?? 0,
			todayCount: incomeToday[0]?.count ?? 0,
			weekCount: incomeWeek[0]?.count ?? 0,
			monthCount: incomeMonth[0]?.count ?? 0
		},
		activeSessions,
		queueWaiting,
		tables: {
			total: tables.length,
			available: tables.filter((t) => t.status === 'AVAILABLE').length,
			occupied: tables.filter((t) => t.status === 'OCCUPIED').length,
			maintenance: tables.filter((t) => t.status === 'MAINTENANCE').length
		},
		totalHours: (totalHoursAgg[0]?.totalMinutes ?? 0) / 60,
		utilization
	});
};
