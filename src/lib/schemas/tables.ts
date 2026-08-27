import { z } from 'zod';

// ADMIN: config create — may set initial AVAILABLE or UNDER_MAINTENANCE, never OCCUPIED (enforced via RBAC 403)
export const tableCreateSchema = z.object({
	name: z.string().trim().min(1).max(30),
	description: z.string().trim().max(500).optional().default(''),
	status: z.enum(['AVAILABLE', 'MAINTENANCE', 'OUT_OF_SERVICE', 'OCCUPIED']).optional().default('AVAILABLE')
});

// ADMIN: config + UNDER_MAINTENANCE only; AVAILABLE/OCCUPIED are CASHIER operational (enforced via 403, not 400)
export const tableUpdateSchema = z.object({
	name: z.string().trim().min(1).max(30).optional(),
	description: z.string().trim().max(500).optional(),
	status: z.enum(['AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'OUT_OF_SERVICE']).optional()
}).refine((o) => Object.keys(o).length > 0, { message: 'At least one field required' });

// CASHIER: operational AVAILABLE ↔ OCCUPIED
export const cashierTableOperationalSchema = z.object({
	status: z.enum(['AVAILABLE', 'OCCUPIED'])
});

export type TableCreateInput = z.infer<typeof tableCreateSchema>;
export type TableUpdateInput = z.infer<typeof tableUpdateSchema>;
export type CashierTableOperationalInput = z.infer<typeof cashierTableOperationalSchema>;
