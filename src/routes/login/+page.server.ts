import type { PageServerLoad } from './$types';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
	// Already authenticated → redirect to role-appropriate board
	if (locals.user) {
		if (locals.user.role === 'ADMIN') throw redirect(302, '/dashboard');
		throw redirect(302, '/board');
	}
	return {};
};
