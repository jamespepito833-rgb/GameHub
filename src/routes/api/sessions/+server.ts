import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { sessionStartSchema } from '$lib/schemas/sessions';
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

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = sessionStartSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });

	const { tableId, customerName, customerContact, durationMinutes } = parsed.data;
	if (!ObjectId.isValid(tableId)) return errorJson(400, 'E_INVALID_ID', 'Invalid tableId');
	const tableOid = new ObjectId(tableId);
	const db = await getDb();
	const now = new Date();
	const expectedEndAt = new Date(now.getTime() + durationMinutes * 60 * 1000);

	// Validate table
	const table = await db.collection('tables').findOne({ _id: tableOid });
	if (!table) return errorJson(404, 'E_NOT_FOUND', 'Table not found');
	if (table.status === 'MAINTENANCE' || table.status === 'OUT_OF_SERVICE') {
		return errorJson(422, 'E_TABLE_MAINTENANCE', 'Table under maintenance');
	}
	if (table.status === 'OCCUPIED') {
		return errorJson(409, 'E_TABLE_OCCUPIED', 'Table already occupied');
	}
	// Check active session exists (partial unique index also enforces)
	const active = await db.collection('sessions').findOne({ tableId: tableOid, status: { $in: ['ACTIVE', 'EXTENDED'] } });
	if (active) return errorJson(409, 'E_TABLE_OCCUPIED', 'Table already has active session');

	// Check overlapping reservation (10min buffer)
	const bufferMs = 10 * 60 * 1000;
	const effectiveEnd = new Date(expectedEndAt.getTime() + bufferMs);
	const overlappingRes = await db.collection('reservations').findOne({
		tableId: tableOid,
		status: 'CONFIRMED',
		startTime: { $lt: effectiveEnd },
		endTime: { $gt: new Date(now.getTime() - bufferMs) }
	});
	if (overlappingRes) {
		return errorJson(409, 'E_RESERVATION_CONFLICT', 'Table has upcoming reservation that conflicts', {
			reservationId: overlappingRes._id.toString()
		});
	}

	// Get pricing snapshot
	const pricing = await db.collection('pricing').findOne({ isActive: true });
	if (!pricing) return errorJson(500, 'E_NO_PRICING', 'No active pricing');
	const pricingSnapshot = {
		pricingId: pricing._id,
		ratePerHour: pricing.ratePerHour,
		effectiveFrom: pricing.effectiveFrom
	};

	const sessionDoc = {
		tableId: tableOid,
		reservationId: null,
		customerName: customerName.trim() || 'Walk-in',
		customerContact: customerContact?.trim() ?? '',
		status: 'ACTIVE' as const,
		startedAt: now,
		expectedEndAt,
		endedAt: null,
		durationMinutes: null,
		pricingSnapshot,
		extensions: [],
		startedBy: new ObjectId(user._id),
		endedBy: null,
		createdAt: now,
		updatedAt: now
	};

	try {
		// Use direct operations (transactions require replicaSet, fallback to non-transactional for standalone)
		// Partial unique index still enforces BR-05
		const res = await db.collection('sessions').insertOne(sessionDoc);
		await db.collection('tables').updateOne({ _id: tableOid }, { $set: { status: 'OCCUPIED', updatedAt: now, updatedBy: new ObjectId(user._id) } });
		const created = await db.collection('sessions').findOne({ _id: res.insertedId });
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'SESSION_STARTED',
			targetCollection: 'sessions',
			targetId: res.insertedId,
			after: created,
			ip: getIp(event)
		});
		return successJson({ session: created }, 201);
	} catch (e: any) {
		if (e.code === 11000) return errorJson(409, 'E_TABLE_OCCUPIED', 'Table already occupied');
		console.error('[sessions POST]', e);
		return errorJson(500, 'E_INTERNAL', 'Internal error');
	}
};

export const GET: RequestHandler = async (event) => {
	try {
		requireRole(event, 'CASHIER', 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const db = await getDb();
	const url = event.url;
	const status = url.searchParams.get('status');
	const tableId = url.searchParams.get('tableId');
	const filter: Record<string, unknown> = {};
	if (status) filter.status = status;
	if (tableId && ObjectId.isValid(tableId)) filter.tableId = new ObjectId(tableId);
	const sessions = await db.collection('sessions').find(filter).sort({ startedAt: -1 }).limit(100).toArray();
	return successJson({ sessions });
};
