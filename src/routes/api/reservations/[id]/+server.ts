import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { errorJson, successJson } from '$lib/server/utils/response';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async (event) => {
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	const contact = event.url.searchParams.get('contact');
	if (!contact) return errorJson(400, 'E_CONTACT_REQUIRED', 'contact query required');

	const db = await getDb();
	const _id = new ObjectId(id);
	const resv = await db.collection('reservations').findOne({ _id });
	if (!resv) return errorJson(404, 'E_NOT_FOUND', 'Reservation not found');

	// Verify contact matches (normalize)
	const norm = contact.startsWith('+639') ? '09' + contact.slice(4) : contact;
	if (resv.customerContact !== norm && resv.customerContact !== contact) {
		return errorJson(403, 'E_CONTACT_MISMATCH', 'Contact does not match');
	}

	// Mask contact for response? For guest, return full but we can mask? For MVP return full
	const table = await db.collection('tables').findOne({ _id: resv.tableId });
	return successJson({
		reservation: {
			...resv,
			_id: resv._id.toString(),
			tableId: resv.tableId.toString(),
			tableName: table?.name ?? null
		}
	});
};
