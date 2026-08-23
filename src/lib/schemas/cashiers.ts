import { z } from 'zod';

export const cashierCreateSchema = z.object({
	username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only'),
	password: z.string().min(6).max(100),
	displayName: z.string().trim().min(2).max(80)
});

export const cashierUpdateSchema = z.object({
	displayName: z.string().trim().min(2).max(80).optional(),
	status: z.enum(['ACTIVE', 'DISABLED']).optional(),
	password: z.string().min(6).max(100).optional()
}).refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });

export const scheduleSchema = z.object({
	dayOfWeek: z.number().int().min(0).max(6),
	startTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
	endTime: z.string().regex(/^\d{2}:\d{2}$/, 'HH:MM'),
	isActive: z.boolean().optional().default(true)
});

export type CashierCreateInput = z.infer<typeof cashierCreateSchema>;
export type CashierUpdateInput = z.infer<typeof cashierUpdateSchema>;
