import type { LayoutServerLoad } from './$types';
import { redirect, error } from '@sveltejs/kit';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		throw redirect(302, '/login');
	}
	if (locals.user.role !== 'ADMIN') {
		throw error(403, { message: JSON.stringify({ code: 'E_FORBIDDEN', message: 'Admin access required' }) });
	}
	return { user: locals.user };
};
