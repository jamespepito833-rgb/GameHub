import { error } from '@sveltejs/kit';
import type { RequestEvent } from '@sveltejs/kit';

export type Role = 'ADMIN' | 'CASHIER';

export function requireAuth(event: RequestEvent): NonNullable<App.Locals['user']> {
	if (!event.locals.user) {
		throw error(401, { message: JSON.stringify({ code: 'E_UNAUTHENTICATED', message: 'Not authenticated' }) });
	}
	return event.locals.user;
}

export function requireRole(event: RequestEvent, ...roles: Role[]): NonNullable<App.Locals['user']> {
	const user = requireAuth(event);
	if (!roles.includes(user.role as Role)) {
		throw error(403, { message: JSON.stringify({ code: 'E_FORBIDDEN', message: 'Forbidden: insufficient role' }) });
	}
	return user;
}

// helper to parse error message JSON from SvelteKit error
export function isRoleAllowed(user: App.Locals['user'], ...roles: Role[]): boolean {
	if (!user) return false;
	return roles.includes(user.role as Role);
}
