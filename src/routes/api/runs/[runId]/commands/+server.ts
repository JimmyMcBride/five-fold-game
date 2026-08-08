import { json, type RequestHandler } from '@sveltejs/kit';
import type { GameCommand } from '$lib/game/commands';
import { getRunRepository, RunNotFoundError } from '$lib/server/run-repository';
import { PocketBaseServiceConfigurationError } from '$lib/server/pocketbase';

const COMMAND_TYPES = new Set([
	'move',
	'inspect',
	'attack',
	'shove',
	'use-feature',
	'shift-rank',
	'close-distance',
	'set-defense',
	'patch-up',
	'choose',
	'search',
	'buy',
	'use-item',
	'equip',
	'replace-relic',
	'set-leader',
	'end-turn'
]);

export const POST: RequestHandler = async ({ locals, params, request }) => {
	if (!locals.session) return json({ message: 'Authentication required.' }, { status: 401 });
	if (!params.runId) return json({ message: 'Run not found.' }, { status: 404 });
	const body = await request.json().catch(() => null);
	if (!isObject(body)) return json({ message: 'Invalid command envelope.' }, { status: 400 });

	const commandId = typeof body.commandId === 'string' ? body.commandId : '';
	const expectedVersion = body.expectedVersion;
	const command = body.command;
	if (!/^[a-zA-Z0-9_-]{8,80}$/.test(commandId)) {
		return json({ message: 'A stable commandId is required.' }, { status: 400 });
	}
	if (!Number.isInteger(expectedVersion) || (expectedVersion as number) < 0) {
		return json({ message: 'expectedVersion must be a non-negative integer.' }, { status: 400 });
	}
	if (!isGameCommand(command)) return json({ message: 'Invalid game command.' }, { status: 400 });

	try {
		const result = await getRunRepository().command(locals.session.id, {
			runId: params.runId,
			commandId,
			expectedVersion: expectedVersion as number,
			command
		});
		return json(result, {
			status: result.kind === 'stale' ? 409 : result.kind === 'rejected' ? 422 : 200
		});
	} catch (error) {
		if (error instanceof PocketBaseServiceConfigurationError) {
			return json({ message: 'Run storage is not configured.' }, { status: 503 });
		}
		if (error instanceof RunNotFoundError) return json({ message: error.message }, { status: 404 });
		throw error;
	}
};

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isGameCommand(value: unknown): value is GameCommand {
	if (!isObject(value) || typeof value.type !== 'string' || !COMMAND_TYPES.has(value.type)) {
		return false;
	}
	if (value.actorId !== undefined && typeof value.actorId !== 'string') return false;
	switch (value.type) {
		case 'move':
			return typeof value.exitId === 'string';
		case 'attack':
			return (
				typeof value.targetId === 'string' &&
				(value.economy === undefined || value.economy === 'action' || value.economy === 'maneuver')
			);
		case 'shove':
			return (
				typeof value.targetId === 'string' &&
				(value.economy === 'action' || value.economy === 'maneuver')
			);
		case 'use-feature':
			return (
				typeof value.featureId === 'string' &&
				(value.targetId === undefined || typeof value.targetId === 'string')
			);
		case 'set-defense':
			return value.stat === 'heart' || value.stat === 'reflex' || value.stat === 'soul';
		case 'choose':
			return typeof value.optionId === 'string';
		case 'search':
			return typeof value.interactionId === 'string';
		case 'buy':
			return typeof value.stockId === 'string';
		case 'use-item':
			return (
				(value.itemId === 'healing-potion' || value.itemId === 'blue-hive-wax') &&
				(value.targetId === undefined || typeof value.targetId === 'string')
			);
		case 'equip':
			return typeof value.weaponId === 'string';
		case 'replace-relic':
			return (
				typeof value.incomingRelicId === 'string' &&
				typeof value.outgoingRelicId === 'string' &&
				(value.stockId === undefined || typeof value.stockId === 'string')
			);
		case 'set-leader':
			return typeof value.memberId === 'string';
		case 'shift-rank':
			return (
				value.economy === undefined || value.economy === 'action' || value.economy === 'maneuver'
			);
		default:
			return true;
	}
}
