import type { RequestHandler } from './$types';
import { errorJson, successJson } from '$lib/server/utils/response';

export const GET: RequestHandler = async (event) => {
	const user = event.locals.user;
	if (!user) {
		return errorJson(401, 'E_UNAUTHENTICATED', 'Not authenticated');
	}
	return successJson({ user });
};
