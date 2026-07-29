import { describe, expect, it } from 'vitest';
import type { RandomSource } from './rng';
import { resolveCommand } from './engine';
import { createInitialState } from './state';

function sequenceRng(...values: number[]): RandomSource {
	return {
		int(min, max) {
			const value = values.shift();
			if (value === undefined || value < min || value > max) {
				throw new Error(`Missing RNG value in range ${min}-${max}.`);
			}
			return value;
		}
	};
}

describe('resolveCommand', () => {
	it('enters the ossuary and starts its encounter without mutating the prior state', () => {
		const initial = createInitialState();
		const result = resolveCommand(initial, { type: 'move', direction: 'north' }, sequenceRng());

		expect(initial.roomId).toBe('threshold');
		expect(result.state.roomId).toBe('ossuary');
		expect(result.state.phase).toBe('combat');
		expect(result.events.map((entry) => entry.kind)).toEqual(['room-entered', 'encounter-started']);
	});

	it('resolves victory, loot, and progression from injected rolls', () => {
		const encounter = resolveCommand(
			createInitialState(),
			{ type: 'move', direction: 'north' },
			sequenceRng()
		).state;
		const result = resolveCommand(encounter, { type: 'attack' }, sequenceRng(12, 7));

		expect(result.state.phase).toBe('exploration');
		expect(result.state.enemy).toBeNull();
		expect(result.state.player.inventory).toContain('Ossuary key');
		expect(result.state.player.gold).toBe(10);
		expect(result.state.player.level).toBe(2);
		expect(result.events.map((entry) => entry.kind)).toEqual([
			'attack-resolved',
			'enemy-defeated',
			'loot-found',
			'level-gained'
		]);
	});

	it('applies brace mitigation to the next enemy strike', () => {
		const encounter = resolveCommand(
			createInitialState(),
			{ type: 'move', direction: 'north' },
			sequenceRng()
		).state;
		const result = resolveCommand(encounter, { type: 'brace' }, sequenceRng(5));

		expect(result.state.player.hp).toBe(17);
		expect(result.state.player.braced).toBe(false);
		expect(result.events.at(-1)?.text).toContain('brace');
	});
});
