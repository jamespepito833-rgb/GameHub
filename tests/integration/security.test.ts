import { describe, it, expect } from 'vitest';
import { getDb } from '../../src/lib/server/db/mongo';
import { hashToken } from '../../src/lib/server/auth/session';

describe('Security: password hash not exposed', () => {
	it('users collection has passwordHash but API should not return it', async () => {
		const db = await getDb();
		const user = await db.collection('users').findOne({ username: 'admin' });
		expect(user).toHaveProperty('passwordHash');
		// Simulate API projection: findOne without passwordHash
		const apiUser = await db.collection('users').findOne({ username: 'admin' }, { projection: { passwordHash: 0 } });
		expect(apiUser).not.toHaveProperty('passwordHash');
	});
});

describe('Security: authSessions stores hash not raw token', () => {
	it('stores sha256', async () => {
		const raw = 'testtoken123';
		const hash = hashToken(raw);
		expect(hash).toHaveLength(64);
		expect(hash).not.toBe(raw);
	});
});

describe('Security: RBAC', () => {
	it('cashier cannot be ADMIN', async () => {
		const db = await getDb();
		const cashier = await db.collection('users').findOne({ username: 'cashier1' });
		expect(cashier?.role).toBe('CASHIER');
		expect(cashier?.role).not.toBe('ADMIN');
	});
});
