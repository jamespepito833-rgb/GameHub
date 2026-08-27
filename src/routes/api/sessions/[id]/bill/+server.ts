import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'CASHIER');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid session id');
	const db = await getDb();
	const _id = new ObjectId(id);
	const session = await db.collection('sessions').findOne({ _id });
	if (!session) return errorJson(404, 'E_NOT_FOUND', 'Session not found');

	// If ENDED, use stored duration; if ACTIVE/EXTENDED, compute current elapsed
	let durationMinutes: number;
	if (session.status === 'ENDED' || session.status === 'COMPLETED') {
		durationMinutes = session.durationMinutes ?? 0;
	} else if (session.status === 'ACTIVE' || session.status === 'EXTENDED') {
		durationMinutes = Math.max(1, Math.ceil((Date.now() - session.startedAt.getTime()) / 60000));
	} else {
		durationMinutes = 0;
	}
	const rate = session.pricingSnapshot.ratePerHour;
	const sessionCost = Math.round(durationMinutes * (rate / 60) * 100) / 100;

	const orders = await db.collection('orders').find({ sessionId: _id, status: { $ne: 'CANCELLED' } }).toArray();
	const ordersCost = orders.reduce((sum, o) => sum + (o.total ?? 0), 0);
	const total = Math.round((sessionCost + ordersCost) * 100) / 100;

	return successJson({
		bill: {
			sessionId: id,
			durationMinutes,
			ratePerHour: rate,
			sessionCost,
			ordersCost,
			total,
			orders,
			sessionStatus: session.status
		}
	});
};

