import { z } from 'zod';

export const loginSchema = z.object({
	username: z.string().trim().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscore only'),
	password: z.string().min(6).max(100)
});

export type LoginInput = z.infer<typeof loginSchema>;
