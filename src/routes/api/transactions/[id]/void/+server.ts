import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { voidSchema } from '$lib/schemas/transactions';
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
		user = requireRole(event, 'ADMIN');
	} catch (e: any) {
		if (e.status === 401) return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
		return errorJson(403, 'E_FORBIDDEN', 'Forbidden: ADMIN only');
	}
	const id = event.params.id;
	if (!ObjectId.isValid(id)) return errorJson(400, 'E_INVALID_ID', 'Invalid id');
	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}
	const parsed = voidSchema.safeParse(body);
	if (!parsed.success) return errorJson(400, 'E_VALIDATION', 'Validation failed', { fieldErrors: parsed.error.flatten() });
	const { reason } = parsed.data;
	const db = await getDb();
	const _id = new ObjectId(id);
	const tx = await db.collection('transactions').findOne({ _id });
	if (!tx) return errorJson(404, 'E_NOT_FOUND', 'Transaction not found');
	if (tx.status === 'VOIDED') return errorJson(422, 'E_ALREADY_VOIDED', 'Already voided');
	const now = new Date();
	await db.collection('transactions').updateOne(
		{ _id },
		{ $set: { status: 'VOIDED', voidedAt: now, voidedBy: new ObjectId(user._id), voidReason: reason, updatedAt: now } }
	);
	const after = await db.collection('transactions').findOne({ _id });
	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'TRANSACTION_VOIDED',
		targetCollection: 'transactions',
		targetId: _id,
		before: tx,
		after,
		ip: getIp(event)
	});
	return successJson({ transaction: after });
};
