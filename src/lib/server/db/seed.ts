import { getDb, closeMongo } from './mongo.js';
import { ensureIndexes } from './indexes.js';
import bcrypt from 'bcryptjs';
import { ObjectId } from 'mongodb';

// Seed is idempotent: upserts by unique keys

async function upsertUser(
	db: Awaited<ReturnType<typeof getDb>>,
	username: string,
	password: string,
	role: 'ADMIN' | 'CASHIER',
	displayName: string
) {
	const hash = await bcrypt.hash(password, 12);
	const now = new Date();
	const existing = await db.collection('users').findOne({ username });
	if (existing) {
		// keep existing hash if username exists, but ensure role/status
		await db.collection('users').updateOne(
			{ username },
			{
				$set: { role, displayName, status: 'ACTIVE', updatedAt: now },
				$setOnInsert: { passwordHash: hash, createdAt: now }
			}
		);
		// If password was requested to be seeded and existing, we update only if env says force? Keep as is.
		return existing._id;
	}
	const res = await db.collection('users').insertOne({
		username,
		passwordHash: hash,
		role,
		displayName,
		status: 'ACTIVE',
		createdAt: now,
		updatedAt: now
	});
	return res.insertedId;
}

async function main() {
	const db = await getDb();
	console.log(`Connected to DB: ${db.databaseName}`);

	await ensureIndexes(db);
	console.log('Indexes ensured');

	// Users
	const adminUser = process.env.SEED_ADMIN_USERNAME || 'admin';
	const adminPass = process.env.SEED_ADMIN_PASSWORD || 'Admin123!';
	const cashierUser = process.env.SEED_CASHIER_USERNAME || 'cashier1';
	const cashierPass = process.env.SEED_CASHIER_PASSWORD || 'Cashier123!';

	const adminId = await upsertUser(db, adminUser, adminPass, 'ADMIN', 'Administrator');
	console.log(`Admin user ready: ${adminUser} (${adminId})`);

	const cashierId = await upsertUser(db, cashierUser, cashierPass, 'CASHIER', 'Cashier One');
	console.log(`Cashier user ready: ${cashierUser} (${cashierId})`);

	// Also ensure second cashier for testing
	await upsertUser(db, 'cashier2', 'Cashier123!', 'CASHIER', 'Cashier Two');

	// Tables 1..8
	for (let i = 1; i <= 8; i++) {
		const name = `Table ${i}`;
		await db.collection('tables').updateOne(
			{ name },
			{
				$set: { updatedAt: new Date() },
				$setOnInsert: {
					name,
					description: `Billiard Table ${i}`,
					status: 'AVAILABLE',
					createdAt: new Date()
				}
			},
			{ upsert: true }
		);
	}
	console.log('Tables seeded (Table 1..8)');

	// Pricing - ensure one active
	const active = await db.collection('pricing').findOne({ isActive: true });
	if (!active) {
		await db.collection('pricing').insertOne({
			ratePerHour: 120,
			effectiveFrom: new Date(),
			effectiveTo: null,
			isActive: true,
			createdAt: new Date(),
			createdBy: adminId
		});
		console.log('Pricing seeded: ₱120/hr active');
	} else {
		console.log(`Pricing active exists: ₱${active.ratePerHour}/hr`);
	}

	// Products
	const products = [
		{ name: 'Coke', category: 'DRINK', unitPrice: 30, isAvailable: true },
		{ name: 'Water', category: 'DRINK', unitPrice: 20, isAvailable: true },
		{ name: 'Beer', category: 'DRINK', unitPrice: 60, isAvailable: true },
		{ name: 'Chips', category: 'SNACK', unitPrice: 35, isAvailable: true },
		{ name: 'Nuts', category: 'SNACK', unitPrice: 40, isAvailable: true },
		{ name: 'Burger', category: 'SNACK', unitPrice: 90, isAvailable: true }
	] as const;

	for (const p of products) {
		await db.collection('products').updateOne(
			{ name: p.name },
			{
				$set: { ...p, updatedAt: new Date() },
				$setOnInsert: { createdAt: new Date() }
			},
			{ upsert: true }
		);
	}
	console.log('Products seeded (6)');

	// Verify counts
	const counts = {
		users: await db.collection('users').countDocuments(),
		tables: await db.collection('tables').countDocuments(),
		pricing: await db.collection('pricing').countDocuments(),
		products: await db.collection('products').countDocuments()
	};
	console.log('Counts:', counts);

	await closeMongo();
	console.log('Seed complete - done');
}

main().catch(async (e) => {
	console.error('Seed failed:', e);
	try {
		await closeMongo();
	} catch {}
	process.exit(1);
});
