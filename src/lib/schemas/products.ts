import { z } from 'zod';

export const productCreateSchema = z.object({
	name: z.string().trim().min(1).max(80),
	category: z.enum(['DRINK', 'SNACK', 'OTHER']),
	unitPrice: z.number().positive().max(10000),
	isAvailable: z.boolean().optional().default(true)
});

export const productUpdateSchema = z.object({
	name: z.string().trim().min(1).max(80).optional(),
	category: z.enum(['DRINK', 'SNACK', 'OTHER']).optional(),
	unitPrice: z.number().positive().max(10000).optional(),
	isAvailable: z.boolean().optional()
}).refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });

export type ProductCreateInput = z.infer<typeof productCreateSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
