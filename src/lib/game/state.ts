import { getClassKit } from './content/classes';
import { generateDungeon } from './content/dungeon';
import { createExpeditionState, itemDefinition } from './content/expedition';
import { createRng, type RandomSource } from './rng';
import type {
	ClassName,
	CombatTurnState,
	GameState,
	PlayerEffects,
	PlayerState,
	RunSummary,
	StatName
} from './model';

export * from './model';

export const LEGACY_CONTENT_VERSION = 'st-bozma-mvp-v1';
export const V2_CONTENT_VERSION = 'st-bozma-v0.8.5-v2';
export const CONTENT_VERSION = 'st-bozma-expedition-v3';
export const SUPPORTED_CONTENT_VERSIONS = [
	LEGACY_CONTENT_VERSION,
	V2_CONTENT_VERSION,
	CONTENT_VERSION
] as const;

export interface NewRunInput {
	runId: string;
	name: string;
	className: ClassName;
	seed: string;
	contentVersion?: string;
}

export class UnsupportedContentVersionError extends Error {}

export function decodeGameState(value: unknown): GameState {
	if (!value || typeof value !== 'object') throw new Error('Invalid game-state snapshot.');
	const candidate = value as Partial<GameState>;
	if (candidate.contentVersion === LEGACY_CONTENT_VERSION) return value as GameState;
	if (
		candidate.contentVersion !== V2_CONTENT_VERSION &&
		candidate.contentVersion !== CONTENT_VERSION
	) {
		throw new UnsupportedContentVersionError(
			`Unsupported content version: ${String(candidate.contentVersion)}`
		);
	}

	const player = candidate.player as Partial<PlayerState> | undefined;
	if (!player || !Array.isArray(player.healthRolls)) {
		throw new Error('Invalid v2 snapshot: health rolls are missing.');
	}
	if (candidate.encounter !== null && candidate.encounter !== undefined) {
		if (typeof candidate.encounter !== 'object') {
			throw new Error('Invalid v2 snapshot: AP state is missing.');
		}
		const turn = candidate.encounter.turn as Partial<CombatTurnState> | undefined;
		if (
			!turn ||
			!Number.isInteger(turn.actionPoints) ||
			!Array.isArray(turn.usedActionIds) ||
			!turn.usedActionIds.every((id: unknown) => typeof id === 'string')
		) {
			throw new Error('Invalid v2 snapshot: AP state is missing.');
		}
	}
	if (candidate.contentVersion === CONTENT_VERSION) {
		const expedition = candidate.expedition;
		if (
			!expedition ||
			typeof expedition !== 'object' ||
			!Array.isArray(expedition.resolvedInteractionIds) ||
			!expedition.inventory ||
			!Array.isArray(expedition.inventory.relicIds) ||
			!Array.isArray(expedition.inventory.questItemIds) ||
			!Array.isArray(expedition.merchant?.stock)
		) {
			throw new Error('Invalid v3 snapshot: expedition state is missing.');
		}
	}
	return value as GameState;
}

function usesV2Rules(contentVersion: string): boolean {
	return contentVersion === V2_CONTENT_VERSION || contentVersion === CONTENT_VERSION;
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

function createPlayer(
	name: string,
	className: ClassName,
	contentVersion: string,
	rng: RandomSource
): PlayerState {
	const kit = getClassKit(className);
	const stats = { ...kit.stats };
	const highestModifier = Math.max(...Object.values(stats).map(modifier));
	const recoveryDice = 1 + highestModifier * 2;
	const defense =
		className === 'Priest' ? 'soul' : stats.reflex >= stats.heart ? 'reflex' : 'heart';

	const healthRolls = usesV2Rules(contentVersion) ? [rng.int(1, 10)] : [];
	const maxHp = usesV2Rules(contentVersion)
		? stats.heart + healthRolls[0] + modifier(stats.heart)
		: stats.heart;

	return {
		name,
		className,
		level: 1,
		experience: 0,
		stats,
		maxHp,
		hp: maxHp,
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
		...(usesV2Rules(contentVersion) ? { healthRolls } : {}),
		effects: initialEffects()
	};
}

export function createInitialState(input?: Partial<NewRunInput>): GameState {
	const seed = input?.seed?.trim() || 'bozma-bootstrap';
	const className = input?.className ?? 'Versant';
	const contentVersion = input?.contentVersion ?? CONTENT_VERSION;
	const graph = generateDungeon(seed, contentVersion === CONTENT_VERSION);
	const rng = createRng(`${seed}:commands`);
	const player = createPlayer(input?.name?.trim() || 'Mara Vey', className, contentVersion, rng);
	const expedition =
		contentVersion === CONTENT_VERSION ? createExpeditionState(seed, graph) : undefined;
	if (expedition) {
		expedition.inventory.reserveWeaponId =
			player.weapons.find((weapon) => weapon.id !== player.equippedWeaponId)?.id ?? null;
	}

	return {
		runId: input?.runId ?? 'local-bozma-001',
		seed,
		contentVersion,
		rngCursor: rng.snapshot?.().cursor ?? 0,
		turn: 0,
		status: 'active',
		phase: 'exploration',
		roomId: graph.entryId,
		graph,
		visitedRooms: [graph.entryId],
		resolvedRooms: [],
		defeatedEncounters: [],
		player,
		encounter: null,
		patchUpAvailable: false,
		flags: {
			manessaTurned: false,
			bozmanSensor: false,
			tombMercyAttempted: false
		},
		...(expedition ? { expedition } : {})
	};
}

export function statModifier(state: GameState, stat: StatName): number {
	return modifier(state.player.stats[stat]);
}

export function summarizeRun(state: GameState): RunSummary | null {
	if (state.status === 'active') return null;

	const summary: RunSummary = {
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
	if (state.contentVersion === CONTENT_VERSION && state.expedition) {
		summary.goldFound = state.expedition.goldFound;
		summary.goldSpent = state.expedition.goldSpent;
		summary.relicsCarried = state.expedition.inventory.relicIds.map(
			(relicId) => itemDefinition(relicId).name
		);
		summary.notableTreasure = [...state.expedition.inventory.notableTreasure];
	}
	return summary;
}
