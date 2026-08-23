import type { RequestHandler } from './$types';
import { getDb } from '$lib/server/db/mongo';
import { loginSchema } from '$lib/schemas/auth';
import { verifyPassword } from '$lib/server/auth/hash';
import { createAuthSession, getCookieOptions, hashToken } from '$lib/server/auth/session';
import { errorJson, successJson } from '$lib/server/utils/response';
import { logActivity } from '$lib/server/utils/activity';
import { ObjectId } from 'mongodb';

// Simple in-memory rate limit: 5 attempts per IP per 60s
const attempts = new Map<string, number[]>();
function isRateLimited(ip: string): boolean {
	const now = Date.now();
	const arr = attempts.get(ip) ?? [];
	const recent = arr.filter((t) => now - t < 60_000);
	recent.push(now);
	attempts.set(ip, recent);
	return recent.length > 5;
}

function getIp(event: Parameters<RequestHandler>[0]): string {
	return (
		event.getClientAddress?.() ??
		event.request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
		'unknown'
	);
}

export const POST: RequestHandler = async (event) => {
	const ip = getIp(event);

	if (isRateLimited(ip)) {
		await logActivity({ action: 'LOGIN_RATE_LIMITED', ip });
		return errorJson(429, 'E_RATE_LIMITED', 'Too many login attempts, try again in a minute');
	}

	let body: unknown;
	try {
		body = await event.request.json();
	} catch {
		return errorJson(400, 'E_INVALID_JSON', 'Invalid JSON body');
	}

	const parsed = loginSchema.safeParse(body);
	if (!parsed.success) {
		return errorJson(400, 'E_VALIDATION', 'Validation failed', {
			fieldErrors: parsed.error.flatten()
		});
	}

	const { username, password } = parsed.data;

	const db = await getDb();
	const user = await db.collection('users').findOne({ username });

	if (!user || user.status !== 'ACTIVE') {
		await logActivity({ action: 'LOGIN_FAILED', ip, targetCollection: 'users', targetId: null });
		// Do not reveal whether username exists
		return errorJson(401, 'E_INVALID_CREDENTIALS', 'Invalid username or password');
	}

	const ok = await verifyPassword(password, user.passwordHash);
	if (!ok) {
		await logActivity({
			actorId: user._id,
			actorRole: user.role,
			action: 'LOGIN_FAILED',
			ip,
			targetCollection: 'users',
			targetId: user._id
		});
		return errorJson(401, 'E_INVALID_CREDENTIALS', 'Invalid username or password');
	}

	// BR-29 soft schedule check (informational)
	if (user.role === 'CASHIER') {
		try {
			const day = new Date().getDay();
			const schedules = await db
				.collection('cashierSchedules')
				.find({ cashierId: user._id, dayOfWeek: day, isActive: true })
				.toArray();
			if (schedules.length === 0) {
				await logActivity({
					actorId: user._id,
					actorRole: user.role,
					action: 'LOGIN_OUTSIDE_SCHEDULE',
					ip,
					targetCollection: 'users',
					targetId: user._id
				});
			}
		} catch {}
	}

	const userAgent = event.request.headers.get('user-agent');
	const { token, expiresAt } = await createAuthSession(user._id, user.role, ip, userAgent);

	// Set HttpOnly cookie
	const isSecure = event.url.protocol === 'https:';
	event.cookies.set('auth_token', token, getCookieOptions(expiresAt, isSecure));

	await logActivity({
		actorId: user._id,
		actorRole: user.role,
		action: 'LOGIN',
		ip,
		targetCollection: 'users',
		targetId: user._id
	});

	return successJson(
		{
			user: {
				_id: user._id.toString(),
				username: user.username,
				role: user.role,
				displayName: user.displayName
			}
		},
		200
	);
};
