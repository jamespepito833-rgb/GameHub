import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { reservationCreateSchema } from '$lib/schemas/reservations';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

function normalizeContact(c: string): string {
	// +639... -> 09...
	if (c.startsWith('+639')) return '09' + c.slice(4);
	return c;
}

function isWithinOperatingHours(date: Date, operatingHours: string): boolean {
	// operatingHours e.g. "09:00-02:00" overnight
	const [startStr, endStr] = operatingHours.split('-');
	const [sh, sm] = startStr.split(':').map(Number);
	const [eh, em] = endStr.split(':').map(Number);
	const startMin = sh * 60 + sm;
	const endMin = eh * 60 + em;
	const curMin = date.getHours() * 60 + date.getMinutes();
	if (startMin <= endMin) {
		return curMin >= startMin && curMin < endMin;
	} else {
		// overnight
		return curMin >= startMin || curMin < endMin;
	}
}

export const POST: RequestHandler = async (event) => {
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = reservationCreateSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });

	const { tableId, customerName, customerContact, customerEmail, date, startTime, durationMinutes } = parsed.data;
	if (!ObjectId.isValid(tableId)) return errorJson(400, 'E_INVALID_ID', 'Invalid tableId');
	const tableOid = new ObjectId(tableId);
	const db = await getDb();

	// Validate table
	const table = await db.collection('tables').findOne({ _id: tableOid });
	if (!table) return errorJson(404, 'E_NOT_FOUND', 'Table not found');
	if (table.status === 'MAINTENANCE' || table.status === 'OUT_OF_SERVICE') {
		return errorJson(422, 'E_TABLE_MAINTENANCE', 'Table under maintenance');
	}

	const start = new Date(`${date}T${startTime}:00`);
	const end = new Date(start.getTime() + durationMinutes * 60 * 1000);
	const now = new Date();

	if (start < now) return errorJson(400, 'E_RESERVATION_IN_PAST', 'Cannot reserve in the past');
	const maxAdvance = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
	if (start > maxAdvance) return errorJson(422, 'E_RESERVATION_TOO_FAR', 'Max 7 days advance');

	const operatingHours = process.env.OPERATING_HOURS ?? '09:00-02:00';
	if (!isWithinOperatingHours(start, operatingHours) || !isWithinOperatingHours(new Date(end.getTime() - 1), operatingHours)) {
		return errorJson(422, 'E_OUTSIDE_OPERATING_HOURS', `Outside operating hours ${operatingHours}`);
	}

	// Overlapping check with buffer 10min
	const bufferMs = 10 * 60 * 1000;
	const effectiveEnd = new Date(end.getTime() + bufferMs);
	const effectiveStart = new Date(start.getTime() - bufferMs);

	const overlapping = await db.collection('reservations').findOne({
		tableId: tableOid,
		status: 'CONFIRMED',
		startTime: { $lt: effectiveEnd },
		endTime: { $gt: effectiveStart }
	});
	if (overlapping) {
		return errorJson(409, 'E_RESERVATION_CONFLICT', 'Table already reserved for that time', {
			conflictingId: overlapping._id.toString()
		});
	}

	// One per contact overlapping (any table)
	const contactNorm = normalizeContact(customerContact);
	const overlappingContact = await db.collection('reservations').findOne({
		customerContact: contactNorm,
		status: 'CONFIRMED',
		startTime: { $lt: effectiveEnd },
		endTime: { $gt: effectiveStart }
	});
	if (overlappingContact) {
		return errorJson(409, 'E_CONTACT_CONFLICT', 'You already have a reservation at that time');
	}

	// Pricing snapshot
	const pricing = await db.collection('pricing').findOne({ isActive: true });
	if (!pricing) return errorJson(500, 'E_NO_PRICING', 'No active pricing');

	const pricingSnapshot = {
		pricingId: pricing._id,
		ratePerHour: pricing.ratePerHour,
		effectiveFrom: pricing.effectiveFrom
	};

	const doc = {
		tableId: tableOid,
		customerName: customerName.trim(),
		customerContact: contactNorm,
		customerEmail: customerEmail?.trim() || null,
		date,
		startTime: start,
		endTime: end,
		durationMinutes,
		status: 'CONFIRMED' as const,
		pricingSnapshot,
		createdAt: now,
		updatedAt: now,
		checkedInSessionId: null,
		cancelledAt: null,
		cancelledBy: null
	};

	const res = await db.collection('reservations').insertOne(doc);
	const reservation = await db.collection('reservations').findOne({ _id: res.insertedId });
	await logActivity({
		actorId: null,
		actorRole: 'GUEST',
		action: 'RESERVATION_CREATED',
		targetCollection: 'reservations',
		targetId: res.insertedId,
		after: { _id: res.insertedId, tableId, date, startTime },
		ip: getIp(event)
	});

	return successJson({ reservation }, 201);
};

export const GET: RequestHandler = async (event) => {
	// For cashier/admin: list with filters, or for guest: require contact?
	// If unauth and no contact, return 401. But for MVP, allow cashier/admin to list, and guest can use /api/reservations/[id]?contact=
	const db = await getDb();
	const url = event.url;
	const date = url.searchParams.get('date');
	const status = url.searchParams.get('status');
	const tableId = url.searchParams.get('tableId');
	const filter: Record<string, unknown> = {};
	if (date) filter.date = date;
	if (status) filter.status = status;
	if (tableId && ObjectId.isValid(tableId)) filter.tableId = new ObjectId(tableId);
	// If not cashier/admin, check if this is public list? For now, require auth for list
	const user = event.locals.user;
	if (!user) {
		return errorJson(401, 'E_UNAUTHENTICATED', 'Authentication required for listing reservations');
	}
	// CASHIER only for operational list (ADMIN not expected to do daily ops)
	if (user.role !== 'CASHIER') {
		return errorJson(403, 'E_FORBIDDEN', 'CASHIER only');
	}
	const reservations = await db.collection('reservations').find(filter).sort({ startTime: 1 }).limit(100).toArray();
	return successJson({ reservations });
};
