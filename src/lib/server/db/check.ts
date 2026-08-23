import { getDb, closeMongo } from './mongo.js';
import { ensureIndexes } from './indexes.js';

async function main() {
	const db = await getDb();
	console.log(`DB: ${db.databaseName}`);
	await db.command({ ping: 1 });
	console.log('Ping OK');
	await ensureIndexes(db);
	console.log('Indexes OK');
	const cols = await db.listCollections().toArray();
	console.log('Collections:', cols.map((c) => c.name).sort().join(', ') || '(none yet)');
	const counts: Record<string, number> = {};
	for (const c of ['users', 'tables', 'pricing', 'products', 'reservations', 'sessions']) {
		try {
			counts[c] = await db.collection(c).countDocuments();
		} catch {
			counts[c] = -1;
		}
	}
	console.log('Counts:', counts);
	await closeMongo();
}

main().catch(async (e) => {
	console.error('check failed:', e);
	try {
		await closeMongo();
	} catch {}
	process.exit(1);
});
