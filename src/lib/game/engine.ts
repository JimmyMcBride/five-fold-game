import type { GameCommand } from './commands';
import type { GameEvent } from './events';
import type { RandomSource } from './rng';
import type { EnemyState, GameState } from './state';
import { ROOMS } from './content/rooms';

export interface CommandResolution {
	state: GameState;
	events: GameEvent[];
}

function event(
	turn: number,
	kind: GameEvent['kind'],
	text: string,
	tone: GameEvent['tone'] = 'neutral'
): GameEvent {
	return { kind, text, tone, turn };
}

function copyState(state: GameState): GameState {
	return {
		...state,
		visitedRooms: [...state.visitedRooms],
		defeatedEncounters: [...state.defeatedEncounters],
		player: { ...state.player, inventory: [...state.player.inventory] },
		enemy: state.enemy ? { ...state.enemy } : null
	};
}

function enemyStrike(next: GameState, rng: RandomSource, events: GameEvent[]): void {
	if (!next.enemy) return;

	const rolledDamage = rng.int(2, 5);
	const damage = next.player.braced ? Math.max(0, rolledDamage - 2) : rolledDamage;
	const defense = next.player.braced ? ' Your brace turns part of the blow.' : '';
	next.player.braced = false;
	next.player.hp = Math.max(0, next.player.hp - damage);
	events.push(
		event(
			next.turn,
			'damage-taken',
			`${next.enemy.name} tears for ${damage} damage.${defense}`,
			'danger'
		)
	);

	if (next.player.hp === 0) {
		next.phase = 'defeat';
		events.push(
			event(
				next.turn,
				'damage-taken',
				'Your torch gutters. The tomb closes over the run.',
				'danger'
			)
		);
	}
}

function resolveMove(
	next: GameState,
	command: Extract<GameCommand, { type: 'move' }>
): GameEvent[] {
	const destination = ROOMS[next.roomId].exits[command.direction];

	if (next.phase === 'combat') {
		return [
			event(
				next.turn,
				'passage-blocked',
				'The way is barred while the creature still stands.',
				'danger'
			)
		];
	}

	if (!destination) {
		return [
			event(next.turn, 'passage-blocked', `No passage opens ${command.direction}.`, 'neutral')
		];
	}

	next.roomId = destination;
	if (!next.visitedRooms.includes(destination)) next.visitedRooms.push(destination);

	const events = [
		event(next.turn, 'room-entered', `You enter ${ROOMS[destination].name}.`, 'command')
	];

	if (destination === 'ossuary' && !next.defeatedEncounters.includes('ossuary-rat')) {
		const enemy: EnemyState = {
			id: 'ossuary-rat',
			name: 'Chain-starved tomb rat',
			maxHp: 7,
			hp: 7
		};
		next.enemy = enemy;
		next.phase = 'combat';
		events.push(
			event(
				next.turn,
				'encounter-started',
				'A chain-starved tomb rat uncoils from the reliquary. Combat begins.',
				'danger'
			)
		);
	}

	return events;
}

function resolveAttack(next: GameState, rng: RandomSource): GameEvent[] {
	if (next.phase !== 'combat' || !next.enemy) {
		return [event(next.turn, 'inspection', 'No enemy offers itself to the knife.', 'neutral')];
	}

	const events: GameEvent[] = [];
	const roll = rng.int(1, 100);
	const hit = roll <= next.player.reflex && roll < 96;

	if (!hit) {
		events.push(
			event(
				next.turn,
				'attack-resolved',
				`Knife roll ${roll} — failure. Bone sparks in the dark.`,
				'danger'
			)
		);
		enemyStrike(next, rng, events);
		return events;
	}

	const damage = rng.int(4, 7);
	next.enemy.hp = Math.max(0, next.enemy.hp - damage);
	events.push(
		event(
			next.turn,
			'attack-resolved',
			`Knife roll ${roll} — success. ${damage} damage bites through grave-fur.`,
			'success'
		)
	);

	if (next.enemy.hp > 0) {
		enemyStrike(next, rng, events);
		return events;
	}

	const enemyName = next.enemy.name;
	next.defeatedEncounters.push(next.enemy.id);
	next.enemy = null;
	next.phase = 'exploration';
	next.player.experience += 12;
	next.player.gold += 3;
	next.player.inventory.push('Ossuary key');
	events.push(event(next.turn, 'enemy-defeated', `${enemyName} goes still.`, 'success'));
	events.push(
		event(next.turn, 'loot-found', 'Loot: Ossuary key, 3 gold, 12 experience.', 'success')
	);

	if (next.player.level === 1 && next.player.experience >= 10) {
		next.player.level = 2;
		events.push(
			event(
				next.turn,
				'level-gained',
				'The tomb has taught you something cruel. Level 2.',
				'command'
			)
		);
	}

	return events;
}

export function resolveCommand(
	state: GameState,
	command: GameCommand,
	rng: RandomSource
): CommandResolution {
	const next = copyState(state);
	next.turn += 1;

	let events: GameEvent[];

	switch (command.type) {
		case 'move':
			events = resolveMove(next, command);
			break;
		case 'attack':
			events = resolveAttack(next, rng);
			break;
		case 'brace':
			if (next.phase !== 'combat') {
				events = [
					event(next.turn, 'inspection', 'You steady your breathing. Nothing answers.', 'neutral')
				];
				break;
			}
			next.player.braced = true;
			events = [event(next.turn, 'braced', 'You brace behind the ashwood torch.', 'command')];
			enemyStrike(next, rng, events);
			break;
		case 'inspect':
			events = [
				event(
					next.turn,
					'inspection',
					next.phase === 'combat'
						? `${next.enemy?.name ?? 'The threat'} watches your hands, not your eyes.`
						: 'Wax, bone dust, and one set of fresh tracks lead deeper.',
					'neutral'
				)
			];
	}

	return { state: next, events };
}
