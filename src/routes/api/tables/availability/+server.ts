import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { successJson, errorJson } from '$lib/server/utils/response';
import { ObjectId } from 'mongodb';

export const GET: RequestHandler = async (event) => {
	const date = event.url.searchParams.get('date'); // YYYY-MM-DD
	const startTime = event.url.searchParams.get('startTime'); // HH:MM
	const duration = parseInt(event.url.searchParams.get('duration') ?? '60', 10);

	if (!date || !startTime) {
		// If no filter, return all tables with basic availability (not MAINTENANCE)
		const db = await getDb();
		const tables = await db.collection('tables').find({ status: { $ne: 'MAINTENANCE' } }).sort({ name: 1 }).toArray();
		return successJson({ tables: tables.map((t) => ({ _id: t._id.toString(), name: t.name, status: t.status })) });
	}

	// Validate date/time
	const start = new Date(`${date}T${startTime}:00`);
	if (isNaN(start.getTime())) return errorJson(400, 'E_INVALID_DATE', 'Invalid date/startTime');
	if (duration < 30 || duration > 480) return errorJson(400, 'E_INVALID_DURATION', 'Duration 30-480');

	const end = new Date(start.getTime() + duration * 60 * 1000);
	const bufferMs = 10 * 60 * 1000;
	const effectiveEnd = new Date(end.getTime() + bufferMs);
	const effectiveStart = new Date(start.getTime() - bufferMs);

	const db = await getDb();
	const tables = await db.collection('tables').find({ status: { $ne: 'MAINTENANCE' } }).sort({ name: 1 }).toArray();

	// For each table, check overlapping CONFIRMED reservations and active sessions
	const result = [];
	for (const t of tables) {
		const overlappingRes = await db.collection('reservations').findOne({
			tableId: t._id,
			status: 'CONFIRMED',
			startTime: { $lt: effectiveEnd },
			endTime: { $gt: effectiveStart }
		});
		const activeSession = await db.collection('sessions').findOne({
			tableId: t._id,
			status: { $in: ['ACTIVE', 'EXTENDED'] }
		});
		// Also check if table is OCCUPIED (should be unavailable)
		const isAvailable = !overlappingRes && !activeSession && t.status === 'AVAILABLE';
		result.push({
			_id: t._id.toString(),
			name: t.name,
			status: t.status,
			isAvailable,
			reason: !isAvailable ? (activeSession ? 'OCCUPIED' : overlappingRes ? 'RESERVED' : t.status) : null
		});
	}

	return successJson({ tables: result, date, startTime, durationMinutes: duration });
};
