import { z } from 'zod';

export const pricingCreateSchema = z.object({
	ratePerHour: z.number().positive().max(10000)
});

export type PricingCreateInput = z.infer<typeof pricingCreateSchema>;
