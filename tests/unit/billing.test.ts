import { describe, it, expect } from 'vitest';
import { toMoney, calcSessionCost } from '../../src/lib/utils/money';

describe('BR-19 Per-minute billing', () => {
	it('ceil billing 1min', () => {
		expect(calcSessionCost(150, 1)).toBe(2.5);
	});
	it('90min at 100/hr = 150', () => {
		expect(calcSessionCost(100, 90)).toBe(150);
	});
	it('449min at 150/hr = 1122.5', () => {
		expect(calcSessionCost(150, 449)).toBe(1122.5);
	});
	it('rounds to 2 decimals', () => {
		expect(toMoney(1.006)).toBe(1.01);
		expect(toMoney(1.004)).toBe(1);
	});
});

describe('BR-07 Timer', () => {
	it('duration ceil', () => {
		const startedAt = new Date('2026-08-24T05:20:38.930Z');
		const endedAt = new Date('2026-08-24T12:49:16.781Z');
		const durationMinutes = Math.max(1, Math.ceil((endedAt.getTime() - startedAt.getTime()) / 60000));
		expect(durationMinutes).toBe(449);
	});
});
