import { json, type RequestHandler } from '@sveltejs/kit';
import { validatePartySelections } from '$lib/game/content/party';
import { getRunRepository, RunConflictError } from '$lib/server/run-repository';
import { PocketBaseServiceConfigurationError } from '$lib/server/pocketbase';

export const GET: RequestHandler = async ({ locals }) => {
	if (!locals.session) return json({ message: 'Authentication required.' }, { status: 401 });
	try {
		const repository = getRunRepository();
		return json({
			active: await repository.getActive(locals.session.id),
			history: await repository.history(locals.session.id)
		});
	} catch (error) {
		if (error instanceof PocketBaseServiceConfigurationError) {
			return json({ message: 'Run storage is not configured.' }, { status: 503 });
		}
		throw error;
	}
};

export const POST: RequestHandler = async ({ locals, request }) => {
	if (!locals.session) return json({ message: 'Authentication required.' }, { status: 401 });
	const body = await request.json().catch(() => null);
	if (!isObject(body)) return json({ message: 'Invalid run request.' }, { status: 400 });

	const requestedSeed = typeof body.seed === 'string' ? body.seed.trim() : '';
	let party;
	try {
		party = validatePartySelections(body.party);
	} catch (error) {
		return json(
			{ message: error instanceof Error ? error.message : 'Invalid party selection.' },
			{ status: 400 }
		);
	}
	if (requestedSeed && !/^[a-zA-Z0-9_-]{1,64}$/.test(requestedSeed)) {
		return json(
			{ message: 'Seed may use letters, numbers, hyphens, and underscores.' },
			{ status: 400 }
		);
	}

	try {
		const repository = getRunRepository();
		const projection = await repository.create(locals.session.id, {
			runId: createPocketBaseId(),
			party,
			seed: requestedSeed || createSeed()
		});
		return json({ projection }, { status: 201 });
	} catch (error) {
		if (error instanceof PocketBaseServiceConfigurationError) {
			return json({ message: 'Run storage is not configured.' }, { status: 503 });
		}
		if (error instanceof RunConflictError) return json({ message: error.message }, { status: 409 });
		throw error;
	}
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function createPocketBaseId(): string {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 15);
}

function createSeed(): string {
	return crypto.randomUUID().replaceAll('-', '').slice(0, 12);
}
