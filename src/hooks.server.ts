import type { Handle } from '@sveltejs/kit';
import { getDb } from '$lib/server/db/mongo';
import { ensureIndexes } from '$lib/server/db/indexes';
import { createHash } from 'node:crypto';

let indexesEnsured = false;

async function ensureIndexesOnce() {
	if (indexesEnsured) return;
	try {
		const db = await getDb();
		await ensureIndexes(db);
		indexesEnsured = true;
	} catch (e) {
		console.error('[hooks] ensureIndexes failed:', e);
	}
}

export const handle: Handle = async ({ event, resolve }) => {
	// Lazy ensure indexes on first request (non-blocking for speed, but await)
	if (!indexesEnsured) {
		await ensureIndexesOnce();
	}

	const token = event.cookies.get('auth_token');
	if (token) {
		try {
			const tokenHash = createHash('sha256').update(token).digest('hex');
			const db = await getDb();
			const session = await db.collection('authSessions').findOne({ tokenHash });
			if (session && session.expiresAt > new Date()) {
				const user = await db.collection('users').findOne(
					{ _id: session.userId, status: 'ACTIVE' },
					{ projection: { passwordHash: 0 } }
				);
				if (user) {
					event.locals.user = {
						_id: user._id.toString(),
						username: user.username,
						role: user.role,
						displayName: user.displayName
					};
					// touch lastActiveAt fire-and-forget
					db.collection('authSessions').updateOne(
						{ _id: session._id },
						{ $set: { lastActiveAt: new Date() } }
					);
				}
			}
		} catch (e) {
			console.error('[hooks] auth lookup failed:', e);
		}
	}

	return resolve(event);
};
