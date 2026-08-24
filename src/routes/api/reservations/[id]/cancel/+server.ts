import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

function getIp(event: Parameters<RequestHandler>[0]): string {
	return event.getClientAddress?.() ?? event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
}

export const POST: RequestHandler = async (event) => {
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const contact = (body as any)?.contact as string | undefined;
	if (!contact) return errorJson(400, 'E_CONTACT_REQUIRED', 'contact required');

	const db = await getDb();
	const _id = new ObjectId(id);
	const resv = await db.collection('reservations').findOne({ _id });
	if (!resv) return errorJson(404, 'E_NOT_FOUND', 'Reservation not found');

	const norm = contact.startsWith('+639') ? '09' + contact.slice(4) : contact;
	const matchesContact = resv.customerContact === norm || resv.customerContact === contact;
	const isCashierOrAdmin = event.locals.user && ['CASHIER', 'ADMIN'].includes(event.locals.user.role);

	if (!matchesContact && !isCashierOrAdmin) {
		return errorJson(403, 'E_CONTACT_MISMATCH', 'Contact does not match');
	}

	if (resv.status !== 'CONFIRMED') return errorJson(422, 'E_NOT_CANCELLABLE', `Cannot cancel reservation with status ${resv.status}`);
	if (new Date() >= resv.startTime) return errorJson(422, 'E_CANNOT_CANCEL', 'Cannot cancel after start time');

	const now = new Date();
	await db.collection('reservations').updateOne(
		{ _id },
		{ $set: { status: 'CANCELLED', cancelledAt: now, cancelledBy: isCashierOrAdmin ? new ObjectId(event.locals.user!._id) : 'GUEST', updatedAt: now } }
	);
	const after = await db.collection('reservations').findOne({ _id });
	await logActivity({
		actorId: event.locals.user?._id ?? null,
		actorRole: event.locals.user?.role ?? 'GUEST',
		action: 'RESERVATION_CANCELLED',
		targetCollection: 'reservations',
		targetId: _id,
		before: resv,
		after,
		ip: getIp(event)
	});

	return successJson({ reservation: after });
};
