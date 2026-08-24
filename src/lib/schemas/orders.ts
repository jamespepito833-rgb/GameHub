import { z } from 'zod';

export const orderCreateSchema = z.object({
	sessionId: z.string().length(24),
	items: z
		.array(
			z.object({
				productId: z.string().length(24),
				qty: z.number().int().min(1).max(100)
			})
		)
		.min(1)
		.max(20)
});

export const orderUpdateSchema = z.object({
	status: z.enum(['SERVED', 'CANCELLED'])
});

export type OrderCreateInput = z.infer<typeof orderCreateSchema>;
