import type { PageServerLoad } from './$types';
import { ClientResponseError } from 'pocketbase';
import { getRunRepository } from '$lib/server/run-repository';
import { PocketBaseServiceConfigurationError } from '$lib/server/pocketbase';

export const load: PageServerLoad = async ({ locals, url }) => {
	const authError = url.searchParams.get('authError');
	if (!locals.session) {
		return { active: null, history: [], storageReady: true, authError };
	}

	try {
		const repository = getRunRepository();
		const [active, history] = await Promise.all([
			repository.getActive(locals.session.id),
			repository.history(locals.session.id)
		]);
		return { active, history, storageReady: true, authError };
	} catch (error) {
		if (
			error instanceof PocketBaseServiceConfigurationError ||
			(error instanceof ClientResponseError && error.status === 404)
		) {
			return { active: null, history: [], storageReady: false, authError };
		}
		throw error;
	}
};
