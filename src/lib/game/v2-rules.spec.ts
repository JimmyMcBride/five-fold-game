import { describe, expect, it } from 'vitest';
import type { GameCommand } from './commands';
import { createEnemy, ENEMIES, LEGACY_ENEMIES } from './content/enemies';
import { getLegalCommands, resolveCommand } from './engine';
import type { EncounterState, GameState } from './model';
import type { RandomSource } from './rng';
import {
	createInitialState,
	decodeGameState,
	LEGACY_CONTENT_VERSION,
	V2_CONTENT_VERSION
} from './state';

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

function combatState(className: GameState['player']['className'] = 'Warrior'): GameState {
	const state = createInitialState({
		seed: `v2-${className}`,
		className,
		contentVersion: V2_CONTENT_VERSION
	});
	state.phase = 'combat';
	state.encounter = {
		id: 'v2-test',
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
	state.player.rank = 'near';
	return state;
}

function command<T extends GameCommand['type']>(
	state: GameState,
	type: T
): Extract<GameCommand, { type: T }> {
	const found = getLegalCommands(state).find((candidate) => candidate.command.type === type);
	if (!found || found.command.type !== type) throw new Error(`No ${type} command.`);
	return found.command as Extract<GameCommand, { type: T }>;
}

function featureCommand(
	state: GameState,
	featureId: string
): Extract<GameCommand, { type: 'use-feature' }> {
	const found = getLegalCommands(state).find(
		(candidate) =>
			candidate.command.type === 'use-feature' && candidate.command.featureId === featureId
	);
	if (!found || found.command.type !== 'use-feature') {
		throw new Error(`No ${featureId} feature command.`);
	}
	return found.command;
}

describe('Fivefold v0.8.5 v2', () => {
	it('seeds starting health once while preserving the byte shape of v1 initialization', () => {
		const first = createInitialState({
			seed: 'health-seed',
			className: 'Warrior',
			contentVersion: V2_CONTENT_VERSION
		});
		const replay = createInitialState({
			seed: 'health-seed',
			className: 'Warrior',
			contentVersion: V2_CONTENT_VERSION
		});
		const legacy = createInitialState({
			seed: 'health-seed',
			className: 'Warrior',
			contentVersion: LEGACY_CONTENT_VERSION
		});

		expect(first).toEqual(replay);
		expect(first.contentVersion).toBe(V2_CONTENT_VERSION);
		expect(first.player.healthRolls).toHaveLength(1);
		expect(first.player.maxHp).toBe(
			first.player.stats.heart +
				(first.player.healthRolls?.[0] ?? 0) +
				Math.floor(first.player.stats.heart / 10)
		);
		expect(first.rngCursor).toBe(1);
		expect(legacy.player.maxHp).toBe(legacy.player.stats.heart);
		expect(legacy.rngCursor).toBe(0);
		expect('healthRolls' in legacy.player).toBe(false);
	});

	it('rejects unknown content versions without state or RNG mutation', () => {
		const state = createInitialState({ contentVersion: 'future-version' });
		const rng = sequenceRng(1);
		const result = resolveCommand(state, { type: 'inspect' }, rng);

		expect(result.state).toBe(state);
		expect(result.events[0].text).toContain('Unsupported content version');
		expect(rng.snapshot?.().cursor).toBe(0);
	});

	it('decodes explicit v1/v2 snapshots and refuses incomplete v2 state', () => {
		const legacy = createInitialState({ contentVersion: LEGACY_CONTENT_VERSION });
		const current = createInitialState({ contentVersion: V2_CONTENT_VERSION });
		const incomplete = structuredClone(current);
		delete incomplete.player.healthRolls;

		expect(decodeGameState(legacy)).toBe(legacy);
		expect(decodeGameState(current)).toBe(current);
		expect(() => decodeGameState(incomplete)).toThrow('health rolls are missing');
		expect(() => decodeGameState({ ...current, encounter: {} })).toThrow(
			'Invalid v2 snapshot: AP state is missing.'
		);
		expect(() => decodeGameState({ ...legacy, contentVersion: 'future-version' })).toThrow(
			'Unsupported content version'
		);

		const combat = combatState();
		if (!combat.encounter) throw new Error('Expected encounter.');
		delete combat.encounter.turn.actionPoints;
		delete combat.encounter.turn.usedActionIds;
		const rng = sequenceRng(1);
		const rejected = resolveCommand(combat, { type: 'end-turn' }, rng);
		expect(rejected.state).toBe(combat);
		expect(rejected.events[0].text).toContain('Invalid snapshot');
		expect(rng.snapshot?.().cursor).toBe(0);
	});

	it('spends two AP on different actions and locks the repeated action identity', () => {
		let state = combatState('Warrior');
		state = resolveCommand(state, command(state, 'attack'), sequenceRng(95)).state;

		expect(state.encounter?.turn.actionPoints).toBe(1);
		expect(state.encounter?.turn.usedActionIds).toEqual(['weapon:longsword']);
		expect(getLegalCommands(state).some((item) => item.command.type === 'attack')).toBe(false);
		expect(getLegalCommands(state).some((item) => item.command.type === 'shift-rank')).toBe(true);
		const rejectedRng = sequenceRng(1);
		const rejected = resolveCommand(
			state,
			{
				type: 'attack',
				targetId: state.encounter?.enemies[0].instanceId ?? '',
				economy: 'action'
			},
			rejectedRng
		);
		expect(rejected.state).toBe(state);
		expect(rejectedRng.snapshot?.().cursor).toBe(0);

		state = resolveCommand(state, command(state, 'shift-rank'), sequenceRng()).state;
		expect(state.encounter?.turn.actionPoints).toBe(0);
		expect(state.encounter?.turn.usedActionIds).toEqual(['weapon:longsword', 'shift-rank']);
	});

	it('defaults legacy-shaped v2 attack and rank-shift commands to actions', () => {
		let state = combatState('Warrior');
		const targetId = state.encounter?.enemies[0].instanceId ?? '';

		state = resolveCommand(state, { type: 'attack', targetId }, sequenceRng(95)).state;
		expect(state.encounter?.turn.actionPoints).toBe(1);
		expect(state.encounter?.turn.usedActionIds).toEqual(['weapon:longsword']);

		state = resolveCommand(state, { type: 'shift-rank' }, sequenceRng()).state;
		expect(state.encounter?.turn.actionPoints).toBe(0);
		expect(state.encounter?.turn.usedActionIds).toEqual(['weapon:longsword', 'shift-rank']);
	});

	it('keeps maneuvers outside AP and prevents a repeated maneuver until momentum returns', () => {
		let state = combatState('Warrior');
		if (!state.encounter) throw new Error('Expected encounter.');
		state.encounter.turn.maneuverAvailable = true;

		const brace = getLegalCommands(state).find(
			(item) => item.command.type === 'use-feature' && item.command.featureId === 'brace'
		)?.command;
		if (!brace) throw new Error('Expected Brace.');
		state = resolveCommand(state, brace, sequenceRng()).state;

		expect(state.encounter?.turn.actionPoints).toBe(2);
		expect(state.encounter?.turn.maneuverAvailable).toBe(false);
	});

	it('offers weapon attack and rank shift as basic Maneuvers without AP cost', () => {
		let attackState = combatState('Warrior');
		if (!attackState.encounter) throw new Error('Expected encounter.');
		attackState.encounter.turn.maneuverAvailable = true;
		const maneuverAttack = getLegalCommands(attackState).find(
			(item) => item.command.type === 'attack' && item.command.economy === 'maneuver'
		)?.command;
		if (!maneuverAttack || maneuverAttack.type !== 'attack') {
			throw new Error('Expected maneuver attack.');
		}
		attackState = resolveCommand(attackState, maneuverAttack, sequenceRng(95)).state;
		expect(attackState.encounter?.turn.actionPoints).toBe(2);
		expect(attackState.encounter?.turn.maneuverAvailable).toBe(false);

		let shiftState = combatState('Warrior');
		if (!shiftState.encounter) throw new Error('Expected encounter.');
		shiftState.encounter.turn.maneuverAvailable = true;
		const maneuverShift = getLegalCommands(shiftState).find(
			(item) => item.command.type === 'shift-rank' && item.command.economy === 'maneuver'
		)?.command;
		if (!maneuverShift || maneuverShift.type !== 'shift-rank') {
			throw new Error('Expected maneuver rank shift.');
		}
		shiftState = resolveCommand(shiftState, maneuverShift, sequenceRng()).state;
		expect(shiftState.player.rank).toBe('far');
		expect(shiftState.encounter?.turn.actionPoints).toBe(2);
		expect(shiftState.encounter?.turn.maneuverAvailable).toBe(false);
	});

	it('lets Far weapons shoot Barnabe through a Near Raider but blocks Near weapons', () => {
		const finale = (className: 'Scout' | 'Warrior') => {
			const state = combatState(className);
			if (!state.encounter) throw new Error('Expected encounter.');
			state.encounter.kind = 'finale';
			state.encounter.enemies = [createEnemy('scorched-raider', '1'), createEnemy('barnabe', '2')];
			state.player.rank = state.player.weapons[0].rank;
			return state;
		};

		const scoutTargets = getLegalCommands(finale('Scout'))
			.filter((item) => item.command.type === 'attack')
			.map((item) => (item.command as Extract<GameCommand, { type: 'attack' }>).targetId);
		const warriorTargets = getLegalCommands(finale('Warrior'))
			.filter((item) => item.command.type === 'attack')
			.map((item) => (item.command as Extract<GameCommand, { type: 'attack' }>).targetId);

		expect(scoutTargets).toEqual(['scorched-raider-1', 'barnabe-2']);
		expect(warriorTargets).toEqual(['scorched-raider-1']);
	});

	it('closes distance for free when Near is empty', () => {
		let state = combatState('Warrior');
		if (!state.encounter) throw new Error('Expected encounter.');
		state.encounter.enemies[0].rank = 'far';
		state.player.rank = 'far';

		state = resolveCommand(state, command(state, 'close-distance'), sequenceRng()).state;

		expect(state.player.rank).toBe('near');
		expect(state.encounter?.enemies[0].rank).toBe('near');
		expect(state.encounter?.turn.actionPoints).toBe(2);
	});

	it('supports Shove as an Action or Maneuver with size-based difficulty', () => {
		let actionState = combatState('Warrior');
		const actionShove = getLegalCommands(actionState).find(
			(item) => item.command.type === 'shove' && item.command.economy === 'action'
		);
		expect(actionShove?.detail).toBe('Roll Heart. Success pushes the target from Near to Far.');
		actionState = resolveCommand(actionState, command(actionState, 'shove'), sequenceRng(50)).state;
		expect(actionState.encounter?.enemies[0].rank).toBe('far');
		expect(actionState.encounter?.turn.actionPoints).toBe(1);

		let maneuverState = combatState('Warrior');
		if (!maneuverState.encounter) throw new Error('Expected encounter.');
		maneuverState.encounter.enemies[0] = createEnemy('zeboul');
		maneuverState.encounter.turn.maneuverAvailable = true;
		const maneuverCommand = getLegalCommands(maneuverState).find(
			(item) => item.command.type === 'shove' && item.command.economy === 'maneuver'
		);
		expect(maneuverCommand?.detail).toBe(
			'Roll Heart. Success pushes the target from Near to Far. Hard roll: Size 3+.'
		);
		const maneuver = maneuverCommand?.command;
		if (!maneuver || maneuver.type !== 'shove') throw new Error('Expected maneuver Shove.');
		maneuverState = resolveCommand(maneuverState, maneuver, sequenceRng(40)).state;
		expect(maneuverState.encounter?.enemies[0].rank).toBe('near');
		expect(maneuverState.encounter?.turn.actionPoints).toBe(2);
		expect(maneuverState.encounter?.turn.maneuverAvailable).toBe(false);

		let hardSuccess = combatState('Warrior');
		if (!hardSuccess.encounter) throw new Error('Expected encounter.');
		hardSuccess.encounter.enemies[0] = createEnemy('zeboul');
		hardSuccess = resolveCommand(hardSuccess, command(hardSuccess, 'shove'), sequenceRng(35)).state;
		expect(hardSuccess.encounter?.enemies[0].rank).toBe('far');
	});

	it.each([
		['normal', 70, 0],
		['hard', 30, 1],
		['critical', 7, 2]
	])('applies the %s Dodge band', (_band, roll, expectedMomentum) => {
		let state = combatState('Scout');
		if (!state.encounter) throw new Error('Expected encounter.');
		state.player.defense = 'reflex';
		state.player.rank = 'far';
		state.encounter.enemies[0] = createEnemy('hellhornet');
		state = resolveCommand(state, { type: 'end-turn' }, sequenceRng(roll, 5)).state;
		expect(state.player.hp).toBe(state.player.maxHp);
		expect(state.player.momentum).toBe(expectedMomentum);
	});

	it.each([
		['normal', 80, 2],
		['hard', 50, 0],
		['critical', 20, 0]
	])('applies the %s Block band', (_band, roll, expectedDamage) => {
		let state = combatState('Warrior');
		if (!state.encounter) throw new Error('Expected encounter.');
		state.player.defense = 'heart';
		state.player.rank = 'far';
		state.encounter.enemies[0] = createEnemy('hellhornet');
		const before = state.player.hp;
		state = resolveCommand(state, { type: 'end-turn' }, sequenceRng(roll, 5)).state;
		expect(state.player.hp).toBe(before - expectedDamage);
	});

	it('applies Dodge momentum and Block reduction bands', () => {
		let dodge = combatState('Scout');
		dodge.player.defense = 'reflex';
		dodge.player.rank = 'far';
		if (!dodge.encounter) throw new Error('Expected encounter.');
		dodge.encounter.enemies[0] = createEnemy('hellhornet');
		dodge = resolveCommand(dodge, { type: 'end-turn' }, sequenceRng(30, 5)).state;
		expect(dodge.player.momentum).toBe(1);
		expect(dodge.player.hp).toBe(dodge.player.maxHp);

		let block = combatState('Warrior');
		block.player.defense = 'heart';
		const before = block.player.hp;
		block = resolveCommand(block, { type: 'end-turn' }, sequenceRng(60, 5, 5)).state;
		expect(block.player.hp).toBe(before - 8);
	});

	it('counterattacks on a critical Block without spending AP', () => {
		let state = combatState('Warrior');
		state.player.defense = 'heart';
		const before = state.encounter?.enemies[0].hp ?? 0;

		state = resolveCommand(state, { type: 'end-turn' }, sequenceRng(7, 5, 5, 50)).state;

		expect(state.encounter?.enemies[0].hp).toBeLessThan(before);
		expect(state.encounter?.turn.actionPoints).toBe(2);
	});

	it('Deathblows any target on a natural 1', () => {
		let state = combatState('Warrior');
		const result = resolveCommand(state, command(state, 'attack'), sequenceRng(1));
		state = result.state;

		expect(state.encounter).toBeNull();
		expect(result.events.some((entry) => entry.text.includes('Deathblow'))).toBe(true);
	});

	it('doubles the full Bolt damage packet on a critical', () => {
		const state = combatState('Magi');
		const result = resolveCommand(state, featureCommand(state, 'bolt'), sequenceRng(7, 10));

		expect(result.state.encounter?.enemies[0].hp).toBe(2);
		expect(result.events.some((entry) => entry.text.includes('Bolt roll 7: 34 damage'))).toBe(true);
	});

	it.each([
		['hard', 30, 17],
		['critical', 7, 34]
	])('keeps Black Cloud Blind while applying %s damage', (_band, roll, expectedDamage) => {
		const state = combatState('Magi');
		const result = resolveCommand(
			state,
			featureCommand(state, 'black-cloud'),
			sequenceRng(roll, 10)
		);

		expect(result.state.encounter?.enemies[0].hp).toBe(36 - expectedDamage);
		expect(result.state.encounter?.enemies[0].blinded).toBe(true);
	});

	it.each([
		['normal', 70, 7, false],
		['hard', 30, 7, true],
		['critical', 7, 14, true]
	])(
		'applies %s Hushing Flame damage without changing its Silence rider',
		(_band, roll, expectedDamage, expectedSilence) => {
			const state = combatState('Versant');
			const result = resolveCommand(
				state,
				featureCommand(state, 'hushing-flame'),
				sequenceRng(roll)
			);

			expect(result.state.encounter?.enemies[0].hp).toBe(36 - expectedDamage);
			expect(result.state.encounter?.enemies[0].silencedTurns).toBe(expectedSilence ? 1 : 0);
		}
	);

	it('uses the same doubled damage for both Tongues of Fire ticks', () => {
		let state = combatState('Versant');
		if (!state.encounter) throw new Error('Expected encounter.');
		state.encounter.enemies[0].stunnedTurns = 1;

		state = resolveCommand(state, featureCommand(state, 'tongues-of-fire'), sequenceRng(7)).state;
		expect(state.encounter?.enemies[0].hp).toBe(22);
		expect(state.player.effects.tonguesBurn).toBe(14);

		const delayed = resolveCommand(state, { type: 'end-turn' }, sequenceRng());
		expect(delayed.state.encounter?.enemies[0].hp).toBe(8);
		expect(delayed.state.player.effects.tonguesBurn).toBe(0);
		expect(
			delayed.events.some((entry) =>
				entry.text.includes('Tongues of Fire burns Scorched Raider again for 14 damage')
			)
		).toBe(true);
	});

	it('keeps damaging ability natural 1 rolls as Deathblows', () => {
		const state = combatState('Magi');
		const result = resolveCommand(state, featureCommand(state, 'bolt'), sequenceRng(1));

		expect(result.state.encounter).toBeNull();
		expect(result.events.some((entry) => entry.text.includes('Deathblow'))).toBe(true);
	});

	it('caps stats at 85 and records seeded level-up health growth', () => {
		let state = combatState('Warrior');
		if (!state.encounter) throw new Error('Expected encounter.');
		state.player.experience = 5;
		state.player.stats.heart = 85;
		state.encounter.enemies[0].hp = 1;
		const beforeMax = state.player.maxHp;

		state = resolveCommand(
			state,
			command(state, 'attack'),
			sequenceRng(2, 99, 99, 99, 99, 5)
		).state;

		expect(state.player.stats.heart).toBe(85);
		expect(state.player.healthRolls?.at(-1)).toBe(5);
		expect(state.player.maxHp).toBe(beforeMax + 13);
	});

	it('uses the selected v0.8.5 enemy values while retaining v1 definitions', () => {
		expect(ENEMIES.hellhornet.maxHp).toBe(18);
		expect(ENEMIES['scorched-raider'].maxHp).toBe(36);
		expect(ENEMIES.zeboul.damageModifier).toBe(9);
		expect(ENEMIES.barnabe.maxHp).toBe(75);
		expect(LEGACY_ENEMIES.hellhornet.maxHp).toBe(20);
		expect(LEGACY_ENEMIES['scorched-raider'].maxHp).toBe(44);
		expect(LEGACY_ENEMIES.zeboul.damageModifier).toBe(7);
		expect(LEGACY_ENEMIES.barnabe.maxHp).toBe(60);
	});

	it('preserves the exact legacy turn-state shape', () => {
		const state = createInitialState({
			seed: 'legacy-shape',
			className: 'Warrior',
			contentVersion: LEGACY_CONTENT_VERSION
		});
		const encounter: EncounterState = {
			id: 'legacy',
			kind: 'normal',
			enemies: [createEnemy('hellhornet', '1', true)],
			turn: {
				round: 1,
				playerTurnsCompleted: 0,
				actionUsed: false,
				abilityUsed: false,
				maneuverAvailable: false
			},
			decodeCount: 0
		};

		expect(Object.keys(encounter.turn)).toEqual([
			'round',
			'playerTurnsCompleted',
			'actionUsed',
			'abilityUsed',
			'maneuverAvailable'
		]);
		expect('sizeRank' in encounter.enemies[0]).toBe(false);
		expect(state.contentVersion).toBe(LEGACY_CONTENT_VERSION);
	});
});
