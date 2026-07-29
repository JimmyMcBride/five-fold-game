import { describe, expect, it } from 'vitest';
import type { LegalCommand } from '$lib/game/commands';
import {
	commandTargetId,
	commandsForSelectedTarget,
	eligibleEnemyIds,
	healthProgress,
	reconcileSelectedEnemy
} from './combat';

const enemies = [
	{ id: 'far-first', rank: 'far' },
	{ id: 'near-first', rank: 'near' },
	{ id: 'near-second', rank: 'near' }
];

const commands: LegalCommand[] = [
	{
		id: 'inspect',
		label: 'Inspect',
		detail: 'Read the room.',
		command: { type: 'inspect' }
	},
	{
		id: 'attack:far-first',
		label: 'Attack Far',
		detail: 'Shortbow',
		command: { type: 'attack', targetId: 'far-first' },
		economy: 'action'
	},
	{
		id: 'feature:bolt:near-first',
		label: 'Bolt',
		detail: 'Spell',
		command: { type: 'use-feature', featureId: 'bolt', targetId: 'near-first' },
		economy: 'ability'
	},
	{
		id: 'shove:near-second',
		label: 'Shove',
		detail: 'Heart',
		command: { type: 'shove', targetId: 'near-second', economy: 'action' },
		economy: 'action'
	}
];

describe('combat UI helpers', () => {
	it('clamps health progress while keeping a safe semantic range', () => {
		expect(healthProgress(18, 44)).toEqual({ now: 18, max: 44, percent: 41 });
		expect(healthProgress(-2, 44)).toEqual({ now: 0, max: 44, percent: 0 });
		expect(healthProgress(50, 44)).toEqual({ now: 44, max: 44, percent: 100 });
		expect(healthProgress(0, 0)).toEqual({ now: 0, max: 1, percent: 0 });
	});

	it('reads target IDs only from targeted offensive commands', () => {
		expect(commandTargetId(commands[0].command)).toBeNull();
		expect(commandTargetId(commands[1].command)).toBe('far-first');
		expect(commandTargetId(commands[2].command)).toBe('near-first');
		expect(commandTargetId(commands[3].command)).toBe('near-second');
	});

	it('orders eligible enemies Near-first and preserves encounter tie order', () => {
		expect(eligibleEnemyIds(enemies, commands)).toEqual(['near-first', 'near-second', 'far-first']);
	});

	it('preserves a legal target and falls back deterministically when it becomes invalid', () => {
		expect(reconcileSelectedEnemy('far-first', enemies, commands)).toBe('far-first');
		expect(reconcileSelectedEnemy('missing', enemies, commands)).toBe('near-first');
		expect(reconcileSelectedEnemy(null, enemies, [commands[0]])).toBeNull();
	});

	it('keeps utility commands and only the selected enemy offensive commands', () => {
		expect(commandsForSelectedTarget(commands, 'near-first').map((command) => command.id)).toEqual([
			'inspect',
			'feature:bolt:near-first'
		]);
		expect(commandsForSelectedTarget(commands, null).map((command) => command.id)).toEqual([
			'inspect'
		]);
	});
});
