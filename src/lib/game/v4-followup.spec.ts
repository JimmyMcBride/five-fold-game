import { describe, expect, it } from 'vitest';
import { createEnemy } from './content/enemies';
import { getLegalCommands, resolveCommand } from './engine';
import type { GameCommand } from './commands';
import type { GameState } from './model';
import type { RandomSource } from './rng';
import { CONTENT_VERSION, createInitialState, decodeGameState, V3_CONTENT_VERSION } from './state';

function sequenceRng(...initialValues: number[]): RandomSource {
	const values = [...initialValues];
	let cursor = 0;
	return {
		int(min, max) {
			const value = values.shift();
			if (value === undefined || value < min || value > max) {
				throw new Error(`Missing RNG value in range ${min}-${max}.`);
			}
			cursor += 1;
			return value;
		},
		snapshot() {
			return { seed: 1, cursor };
		}
	};
}

function legal<T extends GameCommand['type']>(
	state: GameState,
	type: T
): Extract<GameCommand, { type: T }> {
	const command = getLegalCommands(state).find((entry) => entry.command.type === type)?.command;
	if (!command || command.type !== type) throw new Error(`Missing ${type} command.`);
	return command as Extract<GameCommand, { type: T }>;
}

function combatState(contentVersion: string): GameState {
	const state = createInitialState({
		seed: `combat-swap-${contentVersion}`,
		className: 'Scout',
		contentVersion
	});
	state.phase = 'combat';
	state.encounter = {
		id: 'combat-swap',
		kind: 'normal',
		enemies: [createEnemy('scorched-raider')],
		turn: {
			round: 1,
			playerTurnsCompleted: 0,
			actionUsed: false,
			abilityUsed: false,
			maneuverAvailable: false,
			actionPoints: 2,
			usedActionIds: []
		},
		decodeCount: 0
	};
	state.player.rank = 'far';
	state.encounter.enemies[0].rank = 'near';
	return state;
}

function noisyAmbush(contentVersion: string): GameState {
	let state = createInitialState({ seed: `ambush-xp-${contentVersion}`, contentVersion });
	const interaction = Object.values(state.expedition?.interactions ?? {}).find(
		(entry) => (entry.ambushEnemyIds?.length ?? 0) > 0
	);
	if (!interaction) throw new Error('Missing noisy interaction.');
	state.roomId = interaction.roomId;
	state.phase = 'exploration';
	state = resolveCommand(
		state,
		{ type: 'search', interactionId: interaction.id },
		sequenceRng(96, 10, 1)
	).state;
	if (!state.encounter) throw new Error('Expected ambush encounter.');
	state.encounter.enemies.forEach((enemy, index) => {
		enemy.hp = index === 0 ? 1 : 0;
		enemy.rank = 'near';
	});
	state.player.rank = 'near';
	return state;
}

describe('st-bozma expedition follow-up version', () => {
	it('uses v4 for new runs while retaining the stable v3 identifier', () => {
		expect(CONTENT_VERSION).toBe('st-bozma-expedition-v4');
		expect(V3_CONTENT_VERSION).toBe('st-bozma-expedition-v3');
		expect(createInitialState().contentVersion).toBe(CONTENT_VERSION);
	});

	it('keeps v3 ambush rewards and combat equip legality unchanged', () => {
		const v3 = noisyAmbush(V3_CONTENT_VERSION);
		const v3Victory = resolveCommand(v3, legal(v3, 'attack'), sequenceRng(1));

		expect(v3Victory.state.player.experience).toBe(0);
		expect(v3Victory.state.player.gold).toBe(5);
		expect(getLegalCommands(combatState(V3_CONTENT_VERSION))).not.toEqual(
			expect.arrayContaining([expect.objectContaining({ command: { type: 'equip' } })])
		);
		expect(decodeGameState(structuredClone(v3Victory.state))).toEqual(v3Victory.state);
	});

	it('awards v4 ambush XP and authored gold exactly once', () => {
		const state = noisyAmbush(CONTENT_VERSION);
		const result = resolveCommand(state, legal(state, 'attack'), sequenceRng(1));

		expect(result.state.player.experience).toBe(5);
		expect(result.state.player.gold).toBe(5);
		expect(result.events.filter((event) => event.kind === 'experience-gained')).toHaveLength(1);
		expect(result.events).toEqual(
			expect.arrayContaining([
				expect.objectContaining({ kind: 'experience-gained', text: 'Victory grants 5 XP.' })
			])
		);
		expect(result.state.expedition?.pendingOutcome).toBeNull();
	});

	it('uses the existing deterministic level-up path when ambush XP reaches 10', () => {
		const state = noisyAmbush(CONTENT_VERSION);
		state.player.experience = 5;
		const result = resolveCommand(state, legal(state, 'attack'), sequenceRng(1, 50, 50, 50, 50, 5));

		expect(result.state.player.experience).toBe(10);
		expect(result.state.player.level).toBe(2);
		expect(result.events.filter((event) => event.kind === 'level-gained')).toHaveLength(1);
	});

	it('spends 1 AP to swap the reserve weapon once without changing rank', () => {
		const state = combatState(CONTENT_VERSION);
		const equipped = state.player.equippedWeaponId;
		const reserve = state.expedition?.inventory.reserveWeaponId;
		const equip = getLegalCommands(state).find((entry) => entry.command.type === 'equip');
		if (!equip || equip.command.type !== 'equip') throw new Error('Missing combat equip.');

		expect(equip.economy).toBe('action');
		expect(equip.command.weaponId).toBe(reserve);
		const result = resolveCommand(state, equip.command, sequenceRng());

		expect(result.state.player.equippedWeaponId).toBe(reserve);
		expect(result.state.expedition?.inventory.reserveWeaponId).toBe(equipped);
		expect(result.state.player.rank).toBe('far');
		expect(result.state.encounter?.turn.actionPoints).toBe(1);
		expect(result.state.encounter?.turn.usedActionIds).toContain('equip');
		expect(getLegalCommands(result.state).some((entry) => entry.command.type === 'equip')).toBe(
			false
		);
		expect(
			getLegalCommands(result.state).some(
				(entry) => entry.command.type === 'attack' && entry.economy === 'action'
			)
		).toBe(false);
		expect(state.player.equippedWeaponId).toBe(equipped);
	});

	it('rejects combat equip with zero AP or a manipulated weapon id without mutation', () => {
		const zeroAp = combatState(CONTENT_VERSION);
		if (!zeroAp.encounter) throw new Error('Expected encounter.');
		zeroAp.encounter.turn.actionPoints = 0;
		expect(getLegalCommands(zeroAp).some((entry) => entry.command.type === 'equip')).toBe(false);

		const state = combatState(CONTENT_VERSION);
		const result = resolveCommand(
			state,
			{ type: 'equip', weaponId: 'manipulated-weapon' },
			sequenceRng()
		);
		expect(result.state).toEqual(state);
		expect(result.events).toEqual([
			expect.objectContaining({ kind: 'command-rejected', tone: 'danger' })
		]);
	});
});
