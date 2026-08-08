import { redirect, type RequestHandler } from '@sveltejs/kit';
import { ClientResponseError } from 'pocketbase';

const MIN_PASSWORD_LENGTH = 8;
const MAX_DISPLAY_NAME_LENGTH = 80;
const REGISTRATION_ERROR =
	'Account could not be created. Try signing in if you have used this email before.';

export const POST: RequestHandler = async ({ locals, request }) => {
	const form = await request.formData();
	const name = textField(form, 'name').trim();
	const email = textField(form, 'email').trim().toLowerCase();
	const password = textField(form, 'password');
	const passwordConfirm = textField(form, 'passwordConfirm');

	if (!name) redirectWithError('Enter a display name.');
	if (name.length > MAX_DISPLAY_NAME_LENGTH) {
		redirectWithError(`Display name must be ${MAX_DISPLAY_NAME_LENGTH} characters or fewer.`);
	}
	if (!email) redirectWithError('Enter your email address.');
	if (password.length < MIN_PASSWORD_LENGTH) {
		redirectWithError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
	}
	if (password !== passwordConfirm) redirectWithError('Passwords do not match.');

	const users = locals.pb.collection('users');
	try {
		await users.create({ name, email, password, passwordConfirm });
	} catch (error) {
		redirectWithError(registrationErrorMessage(error));
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

function registrationErrorMessage(error: unknown): string {
	if (!(error instanceof ClientResponseError) || error.status !== 400) return REGISTRATION_ERROR;

	const fields = error.response?.data;
	if (!fields || typeof fields !== 'object') return REGISTRATION_ERROR;
	if ('email' in fields) {
		return 'Check your email address. It may be invalid or already in use; try signing in if you have used it before.';
	}
	if ('password' in fields || 'passwordConfirm' in fields) {
		return `Check your password. It must be at least ${MIN_PASSWORD_LENGTH} characters and both entries must match.`;
	}
	if ('name' in fields) return 'Check your display name and try again.';

	return REGISTRATION_ERROR;
}
