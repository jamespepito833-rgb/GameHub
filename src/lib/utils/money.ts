export function toMoney(n: number): number {
	return Math.round(n * 100) / 100;
}

export function calcSessionCost(ratePerHour: number, durationMinutes: number): number {
	return toMoney(durationMinutes * (ratePerHour / 60));
}
