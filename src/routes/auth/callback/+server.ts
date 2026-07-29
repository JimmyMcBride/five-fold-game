import { redirect, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const returnTo = safeReturnTo(cookies.get('ff_oauth_return'));
	const expectedState = cookies.get('ff_oauth_state');
	const verifier = cookies.get('ff_oauth_verifier');
	const state = url.searchParams.get('state');
	const code = url.searchParams.get('code');
	const providerError = url.searchParams.get('error');

	clearOAuthCookies(cookies);

	if (providerError) {
		redirect(303, `/?authError=${encodeURIComponent('Discord sign-in was cancelled.')}`);
	}
	if (!expectedState || !verifier || !state || state !== expectedState || !code) {
		redirect(303, `/?authError=${encodeURIComponent('Discord sign-in could not be verified.')}`);
	}

	const callbackUrl = `${url.origin}/auth/callback`;
	try {
		await locals.pb.collection('users').authWithOAuth2Code('discord', code, verifier, callbackUrl);
	} catch {
		redirect(303, `/?authError=${encodeURIComponent('Discord sign-in failed. Please try again.')}`);
	}

	redirect(303, returnTo);
};

function clearOAuthCookies(cookies: Parameters<RequestHandler>[0]['cookies']): void {
	for (const name of ['ff_oauth_state', 'ff_oauth_verifier', 'ff_oauth_return']) {
		cookies.delete(name, { path: '/' });
	}
}

function safeReturnTo(value: string | undefined): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
	return value;
}
