import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'CASHIER', 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const db = await getDb();
	const tables = await db.collection('tables').find().sort({ name: 1 }).toArray();

	// Find active sessions per table
	const activeSessions = await db
		.collection('sessions')
		.find({ status: { $in: ['ACTIVE', 'EXTENDED'] } })
		.toArray();
	const sessionByTable = new Map<string, (typeof activeSessions)[0]>();
	for (const s of activeSessions) sessionByTable.set(s.tableId.toString(), s);

	// Next reservation within 30min for RESERVED hint
	const now = new Date();
	const in30 = new Date(now.getTime() + 30 * 60 * 1000);
	const upcoming = await db
		.collection('reservations')
		.find({ status: 'CONFIRMED', startTime: { $gte: now, $lte: in30 } })
		.toArray();
	const resByTable = new Map<string, (typeof upcoming)[0]>();
	for (const r of upcoming) {
		const key = r.tableId.toString();
		if (!resByTable.has(key)) resByTable.set(key, r);
	}

	const result = tables.map((t) => {
		const sess = sessionByTable.get(t._id.toString());
		const nextRes = resByTable.get(t._id.toString());
		let displayStatus = t.status;
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
						startedAt: sess.startedAt,
						expectedEndAt: sess.expectedEndAt,
						customerName: sess.customerName,
						pricingSnapshot: sess.pricingSnapshot
					}
				: null,
			nextReservation: nextRes
				? { _id: nextRes._id.toString(), startTime: nextRes.startTime, customerName: nextRes.customerName }
				: null
		};
	});

	return successJson({ tables: result });
};
