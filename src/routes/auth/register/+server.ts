import { redirect, type RequestHandler } from '@sveltejs/kit';

const MIN_PASSWORD_LENGTH = 8;
const REGISTRATION_ERROR = 'Account could not be created. Check your details and try again.';

export const POST: RequestHandler = async ({ locals, request }) => {
	const form = await request.formData();
	const name = textField(form, 'name').trim();
	const email = textField(form, 'email').trim().toLowerCase();
	const password = textField(form, 'password');
	const passwordConfirm = textField(form, 'passwordConfirm');

	if (!name) redirectWithError('Enter a display name.');
	if (!email) redirectWithError('Enter your email address.');
	if (password.length < MIN_PASSWORD_LENGTH) {
		redirectWithError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
	}
	if (password !== passwordConfirm) redirectWithError('Passwords do not match.');

	const users = locals.pb.collection('users');
	try {
		await users.create({ name, email, password, passwordConfirm });
	} catch {
		redirectWithError(REGISTRATION_ERROR);
	}

	try {
		await users.authWithPassword(email, password);
	} catch {
		redirectWithError('Account created, but sign-in failed. Sign in with your new account.');
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
