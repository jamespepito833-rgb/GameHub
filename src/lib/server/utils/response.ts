import { json } from '@sveltejs/kit';

export function errorJson(
	status: number,
	code: string,
	message: string,
	details?: Record<string, unknown>
) {
	return json({ error: { code, message, ...(details ? { details } : {}) } }, { status });
}

export function successJson(data: unknown, status = 200) {
	return json({ data }, { status });
}
