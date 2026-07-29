import type { LegalCommand } from './commands';
import { getLegalCommands } from './engine';
import type { GameEvent } from './events';
import type { EnemyState, GameState, RunSummary, Stats } from './model';
import { ROOM_TEMPLATES } from './content/rooms';

export interface PlayerProjection {
	name: string;
	className: string;
	level: number;
	experience: number;
	stats: Stats;
	maxHp: number;
	hp: number;
	temporaryHp: number;
	momentum: number;
	recoveryDice: number;
	maxRecoveryDice: number;
	gold: number;
	rank: string;
	defense: string;
	armor: string;
	equippedWeapon: string;
	inventory: string[];
}

export interface EnemyProjection {
	id: string;
	name: string;
	hp: number;
	maxHp: number;
	rank: string;
	guarded: boolean;
}

export interface RunProjection {
	runId: string;
	version: number;
	seed: string;
	contentVersion: string;
	turn: number;
	status: GameState['status'];
	phase: GameState['phase'];
	room: {
		id: string;
		name: string;
		kicker: string;
		description: string;
		visitedCount: number;
	};
	player: PlayerProjection;
	enemies: EnemyProjection[];
	decodeCount: number;
	commands: LegalCommand[];
	events: GameEvent[];
}

function projectEnemy(enemy: EnemyState): EnemyProjection {
	return {
		id: enemy.instanceId,
		name: enemy.name,
		hp: enemy.hp,
		maxHp: enemy.maxHp,
		rank: enemy.rank,
		guarded: enemy.guarded
	};
}

export function projectRun(
	state: GameState,
	version: number,
	events: GameEvent[] = []
): RunProjection {
	const room = ROOM_TEMPLATES[state.graph.nodes[state.roomId].templateId];
	const weapon =
		state.player.weapons.find((candidate) => candidate.id === state.player.equippedWeaponId) ??
		state.player.weapons[0];

	return {
		runId: state.runId,
		version,
		seed: state.seed,
		contentVersion: state.contentVersion,
		turn: state.turn,
		status: state.status,
		phase: state.phase,
		room: {
			id: room.id,
			name: room.name,
			kicker: room.kicker,
			description: room.description,
			visitedCount: state.visitedRooms.length
		},
		player: {
			name: state.player.name,
			className: state.player.className,
			level: state.player.level,
			experience: state.player.experience,
			stats: { ...state.player.stats },
			maxHp: state.player.maxHp,
			hp: state.player.hp,
			temporaryHp: state.player.temporaryHp,
			momentum: state.player.momentum,
			recoveryDice: state.player.recoveryDice,
			maxRecoveryDice: state.player.maxRecoveryDice,
			gold: state.player.gold,
			rank: state.player.rank,
			defense: state.player.defense,
			armor: state.player.armor,
			equippedWeapon: weapon.name,
			inventory: [...state.player.inventory]
		},
		enemies: state.encounter?.enemies.filter((enemy) => enemy.hp > 0).map(projectEnemy) ?? [],
		decodeCount: state.encounter?.decodeCount ?? 0,
		commands: getLegalCommands(state),
		events
	};
}

export function projectSummary(summary: RunSummary): RunSummary {
	return structuredClone(summary);
}
