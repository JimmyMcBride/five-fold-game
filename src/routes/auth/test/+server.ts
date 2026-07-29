import { env } from '$env/dynamic/private';
import { error, redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = ({ cookies, url }) => {
	if (env.FIVEFOLD_TEST_MODE !== 'true') error(404, 'Not found.');
	cookies.set('ff_test_user', 'test-user-00001', {
		httpOnly: true,
		sameSite: 'lax',
		secure: url.protocol === 'https:',
		path: '/'
	});
	redirect(303, '/');
};
