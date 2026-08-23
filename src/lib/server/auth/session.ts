import { createHash, randomBytes } from 'node:crypto';
import { getDb } from '$lib/server/db/mongo';
import { ObjectId } from 'mongodb';

export function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
	return randomBytes(32).toString('hex'); // 64 hex chars
}

export interface SessionUser {
	_id: string;
	username: string;
	role: 'ADMIN' | 'CASHIER';
	displayName: string;
}

export async function createAuthSession(
	userId: ObjectId,
	role: 'ADMIN' | 'CASHIER',
	ip?: string | null,
	userAgent?: string | null
): Promise<{ token: string; tokenHash: string; expiresAt: Date }> {
	const token = generateToken();
	const tokenHash = hashToken(token);
	const now = new Date();
	const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
	const db = await getDb();
	await db.collection('authSessions').insertOne({
		userId,
		role,
		tokenHash,
		createdAt: now,
		expiresAt,
		lastActiveAt: now,
		ip: ip ?? null,
		userAgent: userAgent ?? null
	});
	return { token, tokenHash, expiresAt };
}

export async function findSessionByTokenHash(tokenHash: string) {
	const db = await getDb();
	return db.collection('authSessions').findOne({ tokenHash });
}

export async function deleteSessionByTokenHash(tokenHash: string): Promise<void> {
	const db = await getDb();
	await db.collection('authSessions').deleteOne({ tokenHash });
}

export async function deleteAllSessionsForUser(userId: ObjectId): Promise<void> {
	const db = await getDb();
	await db.collection('authSessions').deleteMany({ userId });
}

export function getCookieOptions(expiresAt: Date, isSecureProd: boolean) {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: isSecureProd,
		expires: expiresAt,
		maxAge: 60 * 60 * 24 * 7
	};
}
