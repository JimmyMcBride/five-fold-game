import { describe, expect, it, vi } from 'vitest';
import type { RequestHandler } from '@sveltejs/kit';
import { POST as signIn } from './password/+server';
import { POST as register } from './register/+server';

describe('password authentication routes', () => {
	it('signs in with a normalized email and redirects home', async () => {
		const users = authCollection();
		const outcome = await captureRedirect(
			submit(signIn, users, { email: ' Delver@Example.com ', password: 'secret-pass' })
		);

		expect(users.authWithPassword).toHaveBeenCalledWith('delver@example.com', 'secret-pass');
		expect(outcome).toMatchObject({ status: 303, location: '/' });
	});

	it('returns a generic sign-in error without exposing credentials', async () => {
		const users = authCollection();
		users.authWithPassword.mockRejectedValueOnce(new Error('PocketBase details'));
		const outcome = await captureRedirect(
			submit(signIn, users, { email: 'private@example.com', password: 'secret-pass' })
		);

		expect(outcome).toMatchObject({ status: 303 });
		expect(outcome.location).toContain(encodeURIComponent('Email or password is incorrect.'));
		expect(outcome.location).not.toContain('private@example.com');
		expect(outcome.location).not.toContain('secret-pass');
	});

	it('rejects missing sign-in fields before calling PocketBase', async () => {
		const users = authCollection();
		const outcome = await captureRedirect(submit(signIn, users, { email: '', password: '' }));

		expect(users.authWithPassword).not.toHaveBeenCalled();
		expect(outcome.location).toContain(encodeURIComponent('Enter your email and password.'));
	});

	it('creates an account and signs it in immediately', async () => {
		const users = authCollection();
		const outcome = await captureRedirect(
			submit(register, users, {
				name: 'Aster Vale',
				email: ' Aster@Example.com ',
				password: 'eightfold',
				passwordConfirm: 'eightfold'
			})
		);

		expect(users.create).toHaveBeenCalledWith({
			name: 'Aster Vale',
			email: 'aster@example.com',
			password: 'eightfold',
			passwordConfirm: 'eightfold'
		});
		expect(users.authWithPassword).toHaveBeenCalledWith('aster@example.com', 'eightfold');
		expect(outcome).toMatchObject({ status: 303, location: '/' });
	});

	it.each([
		[
			'missing display name',
			{ name: '', email: 'aster@example.com', password: 'eightfold', passwordConfirm: 'eightfold' },
			'Enter a display name.'
		],
		[
			'missing email',
			{ name: 'Aster', email: '', password: 'eightfold', passwordConfirm: 'eightfold' },
			'Enter your email address.'
		],
		[
			'short password',
			{ name: 'Aster', email: 'aster@example.com', password: 'short', passwordConfirm: 'short' },
			'Password must be at least 8 characters.'
		],
		[
			'mismatched passwords',
			{
				name: 'Aster',
				email: 'aster@example.com',
				password: 'eightfold',
				passwordConfirm: 'different'
			},
			'Passwords do not match.'
		]
	])('rejects %s before creating an account', async (_name, fields, message) => {
		const users = authCollection();
		const outcome = await captureRedirect(submit(register, users, fields));

		expect(users.create).not.toHaveBeenCalled();
		expect(users.authWithPassword).not.toHaveBeenCalled();
		expect(outcome.location).toContain(encodeURIComponent(message));
	});

	it('returns a safe registration error and does not attempt sign-in when creation fails', async () => {
		const users = authCollection();
		users.create.mockRejectedValueOnce(new Error('email already exists'));
		const outcome = await captureRedirect(
			submit(register, users, {
				name: 'Aster',
				email: 'private@example.com',
				password: 'secret-pass',
				passwordConfirm: 'secret-pass'
			})
		);

		expect(users.authWithPassword).not.toHaveBeenCalled();
		expect(outcome.location).toContain(
			encodeURIComponent('Account could not be created. Check your details and try again.')
		);
		expect(outcome.location).not.toContain('private@example.com');
		expect(outcome.location).not.toContain('secret-pass');
	});

	it('explains when account creation succeeds but automatic sign-in fails', async () => {
		const users = authCollection();
		users.authWithPassword.mockRejectedValueOnce(new Error('temporary auth failure'));
		const outcome = await captureRedirect(
			submit(register, users, {
				name: 'Aster',
				email: 'aster@example.com',
				password: 'secret-pass',
				passwordConfirm: 'secret-pass'
			})
		);

		expect(users.create).toHaveBeenCalledOnce();
		expect(outcome.location).toContain(
			encodeURIComponent('Account created, but sign-in failed. Sign in with your new account.')
		);
	});
});

function authCollection() {
	return {
		authWithPassword: vi.fn(async () => ({})),
		create: vi.fn(async () => ({}))
	};
}

function submit(
	handler: RequestHandler,
	users: ReturnType<typeof authCollection>,
	fields: Record<string, string>
) {
	const request = new Request('http://localhost/auth', {
		method: 'POST',
		body: new URLSearchParams(fields)
	});

	return handler({
		locals: {
			pb: { collection: () => users }
		},
		request
	} as never);
}

async function captureRedirect(promise: ReturnType<RequestHandler>) {
	try {
		await promise;
		throw new Error('Expected a redirect.');
	} catch (error) {
		if (
			typeof error === 'object' &&
			error !== null &&
			'status' in error &&
			'location' in error &&
			typeof error.location === 'string'
		) {
			return error as { status: number; location: string };
		}
		throw error;
	}
}
