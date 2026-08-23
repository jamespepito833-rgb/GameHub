import type { PageServerLoad } from './$types';
import { getDb } from '$lib/server/db/mongo';

export const load: PageServerLoad = async () => {
	const db = await getDb();
	const pricings = await db.collection('pricing').find().sort({ effectiveFrom: -1 }).toArray();
	return {
		pricings: pricings.map((p) => ({
			_id: p._id.toString(),
			ratePerHour: p.ratePerHour,
			isActive: p.isActive,
			effectiveFrom: p.effectiveFrom?.toISOString(),
			effectiveTo: p.effectiveTo?.toISOString() ?? null
		}))
	};
};
