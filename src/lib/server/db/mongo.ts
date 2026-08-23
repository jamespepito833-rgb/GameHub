import { MongoClient, Db } from 'mongodb';

const uri =
	process.env.MONGODB_URI ??
	process.env.MONGODB_URL ??
	'mongodb://localhost:27017/gamehub';

const dbName =
	process.env.MONGODB_DB ??
	(() => {
		try {
			const u = new URL(uri.replace('mongodb://', 'http://').replace('mongodb+srv://', 'https://'));
			const path = u.pathname.replace(/^\//, '');
			return path.split('?')[0] || 'gamehub';
		} catch {
			return 'gamehub';
		}
	})();

let client: MongoClient | null = null;
let db: Db | null = null;

export function getMongoUri(): string {
	return uri;
}

export function getDbName(): string {
	return dbName;
}

export async function getClient(): Promise<MongoClient> {
	if (client) return client;
	client = new MongoClient(uri);
	await client.connect();
	return client;
}

export async function getDb(): Promise<Db> {
	if (db) return db;
	const c = await getClient();
	db = c.db(dbName);
	return db;
}

export async function closeMongo(): Promise<void> {
	if (client) {
		await client.close();
		client = null;
		db = null;
	}
}

// For SvelteKit hooks / server startup: ensure connection on demand
export async function ping(): Promise<boolean> {
	const d = await getDb();
	await d.command({ ping: 1 });
	return true;
}
