import { z } from 'zod';

export const queueCreateSchema = z.object({
	customerName: z.string().trim().min(2).max(80),
	customerContact: z.string().trim().min(4).max(20),
	partySize: z.number().int().min(1).max(20).optional(),
	preferredTableId: z.string().length(24).optional()
});

export type QueueCreateInput = z.infer<typeof queueCreateSchema>;
