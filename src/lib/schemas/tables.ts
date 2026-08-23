import { z } from 'zod';

export const tableCreateSchema = z.object({
	name: z.string().trim().min(1).max(30),
	description: z.string().trim().max(500).optional().default(''),
	status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'OCCUPIED']).optional().default('AVAILABLE')
});

export const tableUpdateSchema = z.object({
	name: z.string().trim().min(1).max(30).optional(),
	description: z.string().trim().max(500).optional(),
	status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional()
}).refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });

export type TableCreateInput = z.infer<typeof tableCreateSchema>;
export type TableUpdateInput = z.infer<typeof tableUpdateSchema>;
