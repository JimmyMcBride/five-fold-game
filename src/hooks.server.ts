import type { Handle } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { createPocketBase, sanitizeSession } from '$lib/server/pocketbase';

export const handle: Handle = async ({ event, resolve }) => {
	const pb = createPocketBase();
	pb.authStore.loadFromCookie(event.request.headers.get('cookie') ?? '');

	event.locals.pb = pb;
	event.locals.user = pb.authStore.isValid ? pb.authStore.record : null;
	event.locals.session = sanitizeSession(event.locals.user);
	if (env.FIVEFOLD_TEST_MODE === 'true') {
		const testUser = event.cookies.get('ff_test_user');
		if (testUser) event.locals.session = { id: testUser, displayName: 'Test Delver' };
	}

	const response = await resolve(event);
	response.headers.append(
		'set-cookie',
		pb.authStore.exportToCookie({
			httpOnly: true,
			sameSite: 'lax',
			secure: event.url.protocol === 'https:'
		})
	);

	return response;
};
