import { redirect, type RequestHandler } from '@sveltejs/kit';

const SIGN_IN_ERROR = 'Email or password is incorrect.';

export const POST: RequestHandler = async ({ locals, request }) => {
	const form = await request.formData();
	const email = textField(form, 'email').trim().toLowerCase();
	const password = textField(form, 'password');

	if (!email || !password) redirectWithError('Enter your email and password.');

	try {
		await locals.pb.collection('users').authWithPassword(email, password);
	} catch {
		redirectWithError(SIGN_IN_ERROR);
	}

	redirect(303, '/');
};

function textField(form: FormData, name: string): string {
	const value = form.get(name);
	return typeof value === 'string' ? value : '';
}

function redirectWithError(message: string): never {
	redirect(303, `/?authError=${encodeURIComponent(message)}`);
}
