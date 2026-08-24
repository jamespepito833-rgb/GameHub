import { z } from 'zod';

export const transactionCreateSchema = z.object({
	sessionId: z.string().length(24),
	method: z.enum(['CASH', 'GCASH']),
	amountTendered: z.number().positive(),
	gcashRef: z.string().min(6).max(20).optional()
}).refine(
	(d) => (d.method === 'GCASH' ? !!d.gcashRef : true),
	{ message: 'gcashRef required for GCASH', path: ['gcashRef'] }
);

export const voidSchema = z.object({
	reason: z.string().trim().min(10).max(500)
});
