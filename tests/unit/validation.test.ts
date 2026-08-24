import { describe, it, expect } from 'vitest';
import { loginSchema } from '../../src/lib/schemas/auth';
import { reservationCreateSchema } from '../../src/lib/schemas/reservations';
import { tableCreateSchema } from '../../src/lib/schemas/tables';
import { sessionStartSchema } from '../../src/lib/schemas/sessions';

describe('BR-28 Auth validation', () => {
	it('rejects short username', () => {
		const r = loginSchema.safeParse({ username: 'ab', password: '123456' });
		expect(r.success).toBe(false);
	});
	it('accepts valid login', () => {
		const r = loginSchema.safeParse({ username: 'admin', password: 'Admin123!' });
		expect(r.success).toBe(true);
	});
});

describe('BR-02/04 Reservation validation', () => {
	it('rejects invalid phone', () => {
		const r = reservationCreateSchema.safeParse({
			tableId: '6a8b079c7d6a141b12b93c1b',
			customerName: 'Test',
			customerContact: '123',
			date: '2026-08-25',
			startTime: '10:00',
			durationMinutes: 60
		});
		expect(r.success).toBe(false);
	});
	it('rejects duration <30', () => {
		const r = reservationCreateSchema.safeParse({
			tableId: '6a8b079c7d6a141b12b93c1b',
			customerName: 'Test',
			customerContact: '09171234567',
			date: '2026-08-25',
			startTime: '10:00',
			durationMinutes: 10
		});
		expect(r.success).toBe(false);
	});
	it('accepts valid reservation', () => {
		const r = reservationCreateSchema.safeParse({
			tableId: '6a8b079c7d6a141b12b93c1b',
			customerName: 'Alice',
			customerContact: '09171234567',
			date: '2026-08-25',
			startTime: '10:00',
			durationMinutes: 60
		});
		expect(r.success).toBe(true);
	});
});

describe('BR-12 Table validation', () => {
	it('rejects empty name', () => {
		const r = tableCreateSchema.safeParse({ name: '', status: 'AVAILABLE' });
		expect(r.success).toBe(false);
	});
});

describe('BR-17 Session validation', () => {
	it('rejects duration <15', () => {
		const r = sessionStartSchema.safeParse({ tableId: '6a8b079c7d6a141b12b93c1b', durationMinutes: 10 });
		expect(r.success).toBe(false);
	});
	it('accepts 60min', () => {
		const r = sessionStartSchema.safeParse({ tableId: '6a8b079c7d6a141b12b93c1b', durationMinutes: 60 });
		expect(r.success).toBe(true);
	});
});
