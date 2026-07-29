import { error, redirect, type RequestHandler } from '@sveltejs/kit';

const OAUTH_COOKIE_AGE = 10 * 60;

export const GET: RequestHandler = async ({ locals, url, cookies }) => {
	const methods = await locals.pb.collection('users').listAuthMethods();
	const discord = methods.oauth2.providers.find((provider) => provider.name === 'discord');
	if (!discord) error(503, 'Discord sign-in is not available.');

	const callbackUrl = `${url.origin}/auth/callback`;
	const returnTo = safeReturnTo(url.searchParams.get('returnTo'));
	const secure = url.protocol === 'https:';
	const cookieOptions = {
		httpOnly: true,
		sameSite: 'lax' as const,
		secure,
		path: '/',
		maxAge: OAUTH_COOKIE_AGE
	};

	cookies.set('ff_oauth_state', discord.state, cookieOptions);
	cookies.set('ff_oauth_verifier', discord.codeVerifier, cookieOptions);
	cookies.set('ff_oauth_return', returnTo, cookieOptions);

	const authorizationUrl = new URL(discord.authURL);
	authorizationUrl.searchParams.set('redirect_uri', callbackUrl);
	redirect(303, authorizationUrl.toString());
};

function safeReturnTo(value: string | null): string {
	if (!value || !value.startsWith('/') || value.startsWith('//')) return '/';
	return value;
}
