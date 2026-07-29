import { getClassKit } from './content/classes';
import { generateDungeon } from './content/dungeon';
import type {
	ClassName,
	GameState,
	PlayerEffects,
	PlayerState,
	RunSummary,
	StatName
} from './model';

export * from './model';

export const CONTENT_VERSION = 'st-bozma-mvp-v1';

export interface NewRunInput {
	runId: string;
	name: string;
	className: ClassName;
	seed: string;
}

function modifier(value: number): number {
	return Math.floor(value / 10);
}

function initialEffects(): PlayerEffects {
	return {
		braced: false,
		hidden: false,
		guidance: 0,
		guidanceExpiresAfterTurn: null,
		bless: 0,
		blessExpiresAfterTurn: null,
		sharpshooterTurns: 0,
		aegisExpiresAfterTurn: null,
		sacredMotes: 0,
		shootingStarSuccesses: 0,
		shootingStarTargetId: null,
		shootingStarExpiresAfterTurn: null,
		tonguesBurn: 0
	};
}

function createPlayer(name: string, className: ClassName): PlayerState {
	const kit = getClassKit(className);
	const stats = { ...kit.stats };
	const highestModifier = Math.max(...Object.values(stats).map(modifier));
	const recoveryDice = 1 + highestModifier * 2;
	const defense =
		className === 'Priest' ? 'soul' : stats.reflex >= stats.heart ? 'reflex' : 'heart';

	return {
		name,
		className,
		level: 1,
		experience: 0,
		stats,
		maxHp: stats.heart,
		hp: stats.heart,
		temporaryHp: 0,
		momentum: 0,
		maxRecoveryDice: recoveryDice,
		recoveryDice,
		gold: 0,
		rank: kit.weapons[0].rank,
		defense,
		armor: kit.armor,
		weapons: kit.weapons.map((weapon) => ({ ...weapon })),
		equippedWeaponId: kit.weapons[0].id,
		inventory: ['Ashwood torch', ...kit.weapons.map((weapon) => weapon.name)],
		usedFeatures: [],
		effects: initialEffects()
	};
}

export function createInitialState(input?: Partial<NewRunInput>): GameState {
	const seed = input?.seed?.trim() || 'bozma-bootstrap';
	const className = input?.className ?? 'Versant';
	const graph = generateDungeon(seed);

	return {
		runId: input?.runId ?? 'local-bozma-001',
		seed,
		contentVersion: CONTENT_VERSION,
		rngCursor: 0,
		turn: 0,
		status: 'active',
		phase: 'exploration',
		roomId: graph.entryId,
		graph,
		visitedRooms: [graph.entryId],
		resolvedRooms: [],
		defeatedEncounters: [],
		player: createPlayer(input?.name?.trim() || 'Mara Vey', className),
		encounter: null,
		patchUpAvailable: false,
		flags: {
			manessaTurned: false,
			bozmanSensor: false,
			tombMercyAttempted: false
		}
	};
}

export function statModifier(state: GameState, stat: StatName): number {
	return modifier(state.player.stats[stat]);
}

export function summarizeRun(state: GameState): RunSummary | null {
	if (state.status === 'active') return null;

	return {
		runId: state.runId,
		characterName: state.player.name,
		className: state.player.className,
		seed: state.seed,
		outcome: state.status,
		roomsVisited: state.visitedRooms.length,
		enemiesDefeated: state.defeatedEncounters.length,
		levelReached: state.player.level,
		notableLoot: state.player.inventory.filter(
			(item) =>
				!['Ashwood torch', ...state.player.weapons.map((weapon) => weapon.name)].includes(item)
		)
	};
}
