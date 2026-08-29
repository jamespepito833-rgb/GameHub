import type { Db } from 'mongodb';

export async function ensureIndexes(db: Db): Promise<void> {
	// users
	await db.collection('users').createIndex({ username: 1 }, { unique: true });
	await db.collection('users').createIndex({ role: 1, status: 1 });

	// tables
	await db.collection('tables').createIndex({ name: 1 }, { unique: true });
	await db.collection('tables').createIndex({ status: 1 });

	// pricing
	await db
		.collection('pricing')
		.createIndex({ isActive: 1 }, { partialFilterExpression: { isActive: true }, unique: true });
	await db.collection('pricing').createIndex({ effectiveFrom: -1 });

	// products
	await db.collection('products').createIndex({ name: 1 }, { unique: true });
	await db.collection('products').createIndex({ category: 1, isAvailable: 1 });

	// reservations
	await db.collection('reservations').createIndex({ tableId: 1, startTime: 1, endTime: 1 });
	await db.collection('reservations').createIndex({ status: 1, date: 1, startTime: 1 });
	await db.collection('reservations').createIndex({ customerContact: 1, startTime: 1 });
	await db.collection('reservations').createIndex({ tableId: 1, status: 1 });

	// sessions
	await db
		.collection('sessions')
		.createIndex(
			{ tableId: 1, status: 1 },
			{ unique: true, partialFilterExpression: { status: { $in: ['ACTIVE', 'EXTENDED'] } } }
		);
	await db.collection('sessions').createIndex({ status: 1, startedAt: -1 });
	await db
		.collection('sessions')
		.createIndex({ reservationId: 1 }, { unique: true, sparse: true });
	await db.collection('sessions').createIndex({ tableId: 1, startedAt: -1 });

	// transactions
	await db
		.collection('transactions')
		.createIndex({ sessionId: 1 }, { unique: true, partialFilterExpression: { status: 'PAID' } });
	await db.collection('transactions').createIndex({ tableId: 1, paidAt: -1 });
	await db.collection('transactions').createIndex({ cashierId: 1, paidAt: -1 });
	await db.collection('transactions').createIndex({ status: 1, paidAt: -1 });
	await db.collection('transactions').createIndex({ paidAt: -1 });

	// orders
	await db.collection('orders').createIndex({ sessionId: 1, createdAt: 1 });
	await db.collection('orders').createIndex({ tableId: 1, status: 1 });
	await db.collection('orders').createIndex({ status: 1, createdAt: -1 });

	// cashierSchedules
	await db.collection('cashierSchedules').createIndex({ cashierId: 1, dayOfWeek: 1 });

	// activityLogs (append-only, forever per BR-30)
	await db.collection('activityLogs').createIndex({ createdAt: -1 });
	await db.collection('activityLogs').createIndex({ actorId: 1, createdAt: -1 });
	await db.collection('activityLogs').createIndex({ action: 1, createdAt: -1 });
	await db.collection('activityLogs').createIndex({ targetCollection: 1, targetId: 1 });

	// authSessions (TTL 7 days)
	await db.collection('authSessions').createIndex({ tokenHash: 1 }, { unique: true });
	await db.collection('authSessions').createIndex({ userId: 1 });
	await db.collection('authSessions').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
}
