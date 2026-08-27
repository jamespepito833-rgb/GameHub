import type { LayoutServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	if (locals.user.role !== 'CASHIER') {
		throw error(403, { message: JSON.stringify({ code: 'E_FORBIDDEN', message: 'CASHIER only — ADMIN cannot perform operational' }) });
	}
	return { user: locals.user };
};
