import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async () => {
	const db = await getDb();
	const products = await db.collection('products').find().sort({ name: 1 }).toArray();
	return {
		products: products.map((p) => ({
			_id: p._id.toString(),
			name: p.name,
			category: p.category,
			unitPrice: p.unitPrice,
			isAvailable: p.isAvailable
		}))
	};
};
