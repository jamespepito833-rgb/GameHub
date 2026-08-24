import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { requireRole } from '$lib/server/auth/rbac';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const POST: RequestHandler = async (event) => {
	let user: NonNullable<App.Locals['user']>;
	try {
		user = requireRole(event, 'CASHIER', 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	const db = await getDb();
	const _id = new ObjectId(id);
	const reservation = await db.collection('reservations').findOne({ _id });
	if (!reservation) return errorJson(404, 'E_NOT_FOUND', 'Reservation not found');

	// BR-09: only CONFIRMED can be checked in
	if (reservation.status !== 'CONFIRMED') {
		return errorJson(422, 'E_RESERVATION_NOT_CHECKINABLE', `Cannot check in reservation with status ${reservation.status}`);
	}

	// BR-14: grace 15min
	const now = new Date();
	const graceMs = 15 * 60 * 1000;
	if (now.getTime() > reservation.startTime.getTime() + graceMs) {
		// auto mark NO_SHOW
		await db.collection('reservations').updateOne({ _id }, { $set: { status: 'NO_SHOW', updatedAt: now } });
		return errorJson(422, 'E_RESERVATION_NO_SHOW', 'Reservation is NO_SHOW (grace exceeded)');
	}

	// Idempotent: if already checked in, return existing session
	if (reservation.status === 'CHECKED_IN' && reservation.checkedInSessionId) {
		const existing = await db.collection('sessions').findOne({ _id: reservation.checkedInSessionId });
		if (existing) return successJson({ session: existing, reservation, alreadyCheckedIn: true });
	}

	// Check table
	const table = await db.collection('tables').findOne({ _id: reservation.tableId });
	if (!table) return errorJson(404, 'E_TABLE_NOT_FOUND', 'Table not found');
	if (table.status === 'MAINTENANCE' || table.status === 'OUT_OF_SERVICE') {
		return errorJson(422, 'E_TABLE_MAINTENANCE', 'Table under maintenance');
	}
	if (table.status === 'OCCUPIED') {
		return errorJson(409, 'E_TABLE_OCCUPIED', 'Table already occupied');
	}
	const active = await db.collection('sessions').findOne({ tableId: reservation.tableId, status: { $in: ['ACTIVE', 'EXTENDED'] } });
	if (active) return errorJson(409, 'E_TABLE_OCCUPIED', 'Table already has active session');

	// Create session from reservation
	const expectedEndAt = new Date(now.getTime() + reservation.durationMinutes * 60 * 1000);
	const sessionDoc: any = {
		tableId: reservation.tableId,
		reservationId: reservation._id,
		customerName: reservation.customerName,
		customerContact: reservation.customerContact,
		status: 'ACTIVE' as const,
		startedAt: now,
		expectedEndAt,
		endedAt: null,
		durationMinutes: null,
		pricingSnapshot: reservation.pricingSnapshot,
		extensions: [],
		startedBy: new ObjectId(user._id),
		endedBy: null,
		createdAt: now,
		updatedAt: now
	};

	try {
		const res = await db.collection('sessions').insertOne(sessionDoc);
		await db.collection('tables').updateOne({ _id: reservation.tableId }, { $set: { status: 'OCCUPIED', updatedAt: now, updatedBy: new ObjectId(user._id) } });
		await db.collection('reservations').updateOne(
			{ _id },
			{ $set: { status: 'CHECKED_IN', checkedInSessionId: res.insertedId, updatedAt: now } }
		);
		const session = await db.collection('sessions').findOne({ _id: res.insertedId });
		const updatedRes = await db.collection('reservations').findOne({ _id });
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'RESERVATION_CHECKED_IN',
			targetCollection: 'reservations',
			targetId: _id,
			before: reservation,
			after: updatedRes,
			ip: getIp(event)
		});
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'SESSION_STARTED',
			targetCollection: 'sessions',
			targetId: res.insertedId,
			after: session,
			ip: getIp(event)
		});
		return successJson({ session, reservation: updatedRes }, 201);
	} catch (e: any) {
		if (e.code === 11000) return errorJson(409, 'E_DUPLICATE', 'Duplicate session for reservation');
		console.error('[checkin]', e);
		return errorJson(500, 'E_INTERNAL', 'Internal error');
	}
};
