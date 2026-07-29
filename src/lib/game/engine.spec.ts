import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import type { GameCommand } from './commands';
import { ENEMIES } from './content/enemies';
import { getLegalCommands, resolveCommand } from './engine';
import type { EncounterState } from './model';
import { createRng, type RandomSource } from './rng';
import {
	createInitialState as createVersionedInitialState,
	LEGACY_CONTENT_VERSION,
	type NewRunInput
} from './state';

function createInitialState(input?: Partial<NewRunInput>) {
	return createVersionedInitialState({ ...input, contentVersion: LEGACY_CONTENT_VERSION });
}

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

function commandOfType<T extends GameCommand['type']>(
	state: ReturnType<typeof createInitialState>,
	type: T
): Extract<GameCommand, { type: T }> {
	const command = getLegalCommands(state).find(
		(candidate) => candidate.command.type === type
	)?.command;
	if (!command || command.type !== type) throw new Error(`No ${type} command.`);
	return command as Extract<GameCommand, { type: T }>;
}

describe('resolveCommand', () => {
	it('pins the legacy v1 initial state and legal-command fixture', () => {
		const state = createInitialState({ seed: 'legacy-fixture', className: 'Warrior' });
		const fixture = JSON.stringify({ state, legal: getLegalCommands(state) });

		expect(fixture).toHaveLength(3556);
		expect(createHash('sha256').update(fixture).digest('hex')).toBe(
			'9d78e3eb1b0183c23ed9787c988c0b34e1e467ab8fbbad3e450cefedf8350973'
		);
	});

	it('enters the first seeded encounter without mutating the prior state', () => {
		const initial = createInitialState({ seed: 'reference', className: 'Warrior' });
		const move = commandOfType(initial, 'move');
		const result = resolveCommand(initial, move, sequenceRng(10, 1));

		expect(initial.roomId).toBe('monastery-grounds');
		expect(result.state.roomId).not.toBe(initial.roomId);
		expect(result.state.phase).toBe('combat');
		expect(result.events.map((entry) => entry.kind)).toEqual([
			'room-entered',
			'encounter-started',
			'initiative-resolved'
		]);
	});

	it('resolves initiative ties in favor of the solo player', () => {
		const initial = createInitialState({ seed: 'initiative-tie', className: 'Warrior' });
		const definitionId =
			initial.graph.nodes[initial.graph.nodes[initial.graph.entryId].exits[0].to]
				.encounterDefinitionId;
		if (!definitionId) throw new Error('Expected an encounter definition.');
		const playerRoll = 5;
		const enemyRoll =
			playerRoll +
			Math.floor(initial.player.stats.reflex / 10) -
			ENEMIES[definitionId].reflexModifier;

		const result = resolveCommand(
			initial,
			commandOfType(initial, 'move'),
			sequenceRng(playerRoll, enemyRoll)
		);

		expect(result.events.some((entry) => entry.kind === 'damage-taken')).toBe(false);
		expect(result.events.find((entry) => entry.kind === 'initiative-resolved')?.tone).toBe(
			'success'
		);
	});

	it('rejects an illegal command without advancing state or RNG', () => {
		const initial = createInitialState();
		const rng = sequenceRng(4);
		const result = resolveCommand(initial, { type: 'attack', targetId: 'missing' }, rng);

		expect(result.state).toBe(initial);
		expect(result.state.turn).toBe(0);
		expect(rng.snapshot?.().cursor).toBe(0);
		expect(result.events[0].kind).toBe('command-rejected');
	});

	it('accepts a legal command regardless of object property insertion order', () => {
		const initial = createInitialState({ seed: 'property-order', className: 'Warrior' });
		const move = commandOfType(initial, 'move');
		const reorderedMove = { exitId: move.exitId, type: 'move' } satisfies GameCommand;
		const result = resolveCommand(initial, reorderedMove, sequenceRng(10, 1));

		expect(result.events[0].kind).toBe('room-entered');
		expect(result.state.roomId).not.toBe(initial.roomId);
	});

	it('awards fixed XP and performs deterministic advancement after two normal victories', () => {
		let state = createInitialState({ seed: 'two-victories', className: 'Warrior' });
		state = resolveCommand(state, commandOfType(state, 'move'), sequenceRng(10, 1)).state;
		if (!state.encounter) throw new Error('Expected first encounter.');
		state.encounter.enemies[0].hp = 1;
		state.encounter.enemies[0].rank = 'near';
		state.player.rank = 'near';
		state = resolveCommand(state, commandOfType(state, 'attack'), sequenceRng(1)).state;

		expect(state.player.experience).toBe(5);
		expect(state.player.level).toBe(1);

		state = resolveCommand(state, commandOfType(state, 'move'), sequenceRng()).state;
		state = resolveCommand(state, commandOfType(state, 'move'), sequenceRng(10, 1)).state;
		if (!state.encounter) throw new Error('Expected second encounter.');
		state.encounter.enemies[0].hp = 1;
		state.encounter.enemies[0].rank = 'near';
		state.player.rank = 'near';
		state = resolveCommand(
			state,
			commandOfType(state, 'attack'),
			sequenceRng(1, 99, 99, 99, 99)
		).state;

		expect(state.player.experience).toBe(10);
		expect(state.player.level).toBe(2);
		expect(state.player.stats.heart).toBe(75);
	});

	it('ends the run on Barnabe’s third Decode', () => {
		let state = createInitialState({ className: 'Warrior' });
		const barnabe = {
			id: 'barnabe',
			instanceId: 'barnabe-1',
			name: 'Barnabe Fearstricken',
			maxHp: 60,
			hp: 60,
			reflexModifier: 4,
			rank: 'far' as const,
			attackName: 'Dark Far',
			attackRank: 'far' as const,
			damageDice: 1,
			damageModifier: 5,
			source: 'approved spec',
			turnsTaken: 0,
			guarded: false,
			blinded: false,
			stunnedTurns: 0,
			silencedTurns: 0,
			damagedPlayerLastTurn: false
		};
		const encounter: EncounterState = {
			id: 'barnabe-finale',
			kind: 'finale',
			enemies: [barnabe],
			turn: {
				round: 1,
				playerTurnsCompleted: 0,
				actionUsed: false,
				abilityUsed: false,
				maneuverAvailable: false
			},
			decodeCount: 0
		};
		state.phase = 'combat';
		state.encounter = encounter;
		state.player.defense = 'reflex';

		const rng = sequenceRng(1, 1, 1, 1, 1, 1);
		for (let index = 0; index < 6 && state.status === 'active'; index += 1) {
			state = resolveCommand(state, { type: 'end-turn' }, rng).state;
		}

		expect(state.status).toBe('objective-failure');
		expect(state.phase).toBe('defeat');
	});

	it('ends immediately on 0 HP and wins when Barnabe reaches 0 HP', () => {
		const finale = (): EncounterState => ({
			id: 'barnabe-finale',
			kind: 'finale',
			enemies: [
				{
					id: 'barnabe',
					instanceId: 'barnabe-1',
					name: 'Barnabe Fearstricken',
					maxHp: 60,
					hp: 60,
					reflexModifier: 4,
					rank: 'far',
					attackName: 'Dark Far',
					attackRank: 'far',
					damageDice: 1,
					damageModifier: 5,
					source: 'approved spec',
					turnsTaken: 0,
					guarded: false,
					blinded: false,
					stunnedTurns: 0,
					silencedTurns: 0,
					damagedPlayerLastTurn: false
				}
			],
			turn: {
				round: 1,
				playerTurnsCompleted: 0,
				actionUsed: false,
				abilityUsed: false,
				maneuverAvailable: false
			},
			decodeCount: 0
		});

		let doomed = createInitialState({ className: 'Magi' });
		doomed.phase = 'combat';
		doomed.encounter = finale();
		doomed.player.hp = 1;
		doomed = resolveCommand(doomed, { type: 'end-turn' }, sequenceRng(100, 10)).state;
		expect(doomed.status).toBe('death');

		let victorious = createInitialState({ className: 'Magi' });
		victorious.phase = 'combat';
		victorious.encounter = finale();
		victorious.encounter.enemies[0].hp = 1;
		victorious = resolveCommand(
			victorious,
			commandOfType(victorious, 'attack'),
			sequenceRng(1, 1)
		).state;
		expect(victorious.status).toBe('victory');
	});

	it('enforces one Action while leaving the Ability allowance available', () => {
		let state = createInitialState({ className: 'Warrior' });
		state = resolveCommand(state, commandOfType(state, 'move'), sequenceRng(10, 1)).state;
		const target = state.encounter?.enemies[0];
		if (!target) throw new Error('Expected an enemy.');
		target.rank = 'near';
		state.player.rank = 'near';

		state = resolveCommand(state, commandOfType(state, 'attack'), sequenceRng(95)).state;
		const commands = getLegalCommands(state);

		expect(commands.some((candidate) => candidate.command.type === 'attack')).toBe(false);
		expect(
			commands.some(
				(candidate) =>
					candidate.command.type === 'use-feature' && candidate.command.featureId === 'aegis-raised'
			)
		).toBe(true);
	});

	it('replays identical state and events for every class template', () => {
		for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant'] as const) {
			const replay = () => {
				let state = createInitialState({ seed: 'replay', className });
				const rng = createRng(`${state.seed}:commands`);
				const events = [];
				for (const command of [commandOfType(state, 'inspect'), commandOfType(state, 'move')]) {
					const result = resolveCommand(state, command, rng);
					state = result.state;
					events.push(...result.events);
				}
				return { state, events };
			};

			expect(replay()).toEqual(replay());
		}
	});

	it('offers a distinct signature command for every class', () => {
		const expected = {
			Warrior: 'aegis-raised',
			Scout: 'sharpshooter',
			Priest: 'prayer-of-healing',
			Magi: 'black-cloud',
			Versant: 'tongues-of-fire'
		} as const;

		for (const [className, featureId] of Object.entries(expected)) {
			const state = createInitialState({ className: className as keyof typeof expected });
			state.phase = 'combat';
			state.encounter = {
				id: 'test',
				kind: 'normal',
				enemies: [
					{
						id: 'hellhornet',
						instanceId: 'hellhornet-1',
						name: 'Hellhornet',
						maxHp: 20,
						hp: 20,
						reflexModifier: 7,
						rank: 'far',
						attackName: 'Cutting Wings',
						attackRank: 'far',
						damageDice: 1,
						damageModifier: 4,
						source: 'canonical',
						turnsTaken: 0,
						guarded: false,
						blinded: false,
						stunnedTurns: 0,
						silencedTurns: 0,
						damagedPlayerLastTurn: false
					}
				],
				turn: {
					round: 1,
					playerTurnsCompleted: 0,
					actionUsed: false,
					abilityUsed: false,
					maneuverAvailable: true
				},
				decodeCount: 0
			};

			expect(
				getLegalCommands(state).some(
					(candidate) =>
						candidate.command.type === 'use-feature' && candidate.command.featureId === featureId
				)
			).toBe(true);
		}
	});

	it('keeps terminal states closed and immutable', () => {
		const terminal = createInitialState({ className: 'Magi' });
		terminal.status = 'victory';
		terminal.phase = 'victory';
		const rng = sequenceRng(1);

		expect(getLegalCommands(terminal)).toEqual([]);
		const result = resolveCommand(terminal, { type: 'inspect' }, rng);
		expect(result.state).toBe(terminal);
		expect(result.state.turn).toBe(0);
		expect(result.events[0].kind).toBe('command-rejected');
		expect(rng.snapshot?.().cursor).toBe(0);
	});
});
