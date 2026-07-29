import type { Handle } from '@sveltejs/kit';
import { createPocketBase, sanitizeSession } from '$lib/server/pocketbase';

export const handle: Handle = async ({ event, resolve }) => {
	const pb = createPocketBase();
	pb.authStore.loadFromCookie(event.request.headers.get('cookie') ?? '');

	event.locals.pb = pb;
	event.locals.user = pb.authStore.isValid ? pb.authStore.record : null;
	event.locals.session = sanitizeSession(event.locals.user);

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
