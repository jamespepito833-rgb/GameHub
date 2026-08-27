import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { sessionExtendSchema } from '$lib/schemas/sessions';
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
		user = requireRole(event, 'CASHIER');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden');
	}
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid session id');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = sessionExtendSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const { addedMinutes } = parsed.data;

	const db = await getDb();
	const _id = new ObjectId(id);
	const session = await db.collection('sessions').findOne({ _id });
	if (!session) return errorJson(404, 'E_NOT_FOUND', 'Session not found');
	if (['COMPLETED', 'VOIDED'].includes(session.status)) {
		return errorJson(422, 'E_SESSION_NOT_EXTENDABLE', 'Completed/voided session cannot be extended');
	}
	if (!['ACTIVE', 'EXTENDED', 'ENDED'].includes(session.status)) {
		return errorJson(422, 'E_SESSION_NOT_EXTENDABLE', 'Session not extendable');
	}
	// Check table not maintenance
	const table = await db.collection('tables').findOne({ _id: session.tableId });
	if (table && (table.status === 'MAINTENANCE' || table.status === 'OUT_OF_SERVICE')) {
		return errorJson(422, 'E_TABLE_MAINTENANCE', 'Table under maintenance');
	}

	// Check overlapping future reservation
	const newExpectedEndAt = new Date(session.expectedEndAt.getTime() + addedMinutes * 60 * 1000);
	const bufferMs = 10 * 60 * 1000;
	const effectiveEnd = new Date(newExpectedEndAt.getTime() + bufferMs);
	const overlapping = await db.collection('reservations').findOne({
		tableId: session.tableId,
		status: 'CONFIRMED',
		startTime: { $lt: effectiveEnd },
		endTime: { $gt: session.expectedEndAt }
	});
	if (overlapping) {
		return errorJson(409, 'E_EXTENSION_CONFLICTS_RESERVATION', 'Extension conflicts with upcoming reservation', {
			reservationId: overlapping._id.toString()
		});
	}

	const prevEnd = session.expectedEndAt;
	const now = new Date();
	const extension = {
		extendedAt: now,
		addedMinutes,
		previousExpectedEndAt: prevEnd,
		newExpectedEndAt,
		approvedBy: new ObjectId(user._id)
	};

	const newStatus = session.status === 'ACTIVE' ? 'EXTENDED' : session.status === 'ENDED' ? 'EXTENDED' : 'EXTENDED';

	await db.collection('sessions').updateOne(
		{ _id },
		{
			$set: { expectedEndAt: newExpectedEndAt, status: newStatus, updatedAt: now },
			$push: { extensions: extension as any }
		}
	);
	const after = await db.collection('sessions').findOne({ _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'SESSION_EXTENDED',
		targetCollection: 'sessions',
		targetId: _id,
		before: session,
		after,
		ip: getIp(event)
	});
	return successJson({ session: after });
};

