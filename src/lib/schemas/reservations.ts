import { z } from 'zod';

export const reservationCreateSchema = z.object({
	tableId: z.string().length(24),
	customerName: z.string().trim().min(2).max(80),
	customerContact: z.string().trim().min(4).max(20).regex(/^(\+639|09)\d{9}$/, 'PH phone 09... or +639...'),
	customerEmail: z.string().trim().email().optional().or(z.literal('')),
	date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD'),
	startTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
	durationMinutes: z.number().int().min(30).max(480)
});

export type ReservationCreateInput = z.infer<typeof reservationCreateSchema>;
