import { redirect, type RequestHandler } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ locals, cookies }) => {
	locals.pb.authStore.clear();
	cookies.delete('ff_test_user', { path: '/' });
	redirect(303, '/');
};
