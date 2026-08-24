import { z } from 'zod';

export const sessionStartSchema = z.object({
	tableId: z.string().length(24),
	customerName: z.string().trim().min(2).max(80).optional().default('Walk-in'),
	customerContact: z.string().trim().min(4).max(20).optional().default(''),
	durationMinutes: z.number().int().min(15).max(480)
});

export const sessionExtendSchema = z.object({
	addedMinutes: z.number().int().min(15).max(240)
});

export type SessionStartInput = z.infer<typeof sessionStartSchema>;
export type SessionExtendInput = z.infer<typeof sessionExtendSchema>;
