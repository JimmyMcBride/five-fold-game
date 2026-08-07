import { getClassKit } from './content/classes';
import { generateDungeon } from './content/dungeon';
import { createExpeditionState, itemDefinition } from './content/expedition';
import {
	PARTY_TEMPLATES,
	type PartySelection,
	type PartyTemplateId,
	validatePartySelections
} from './content/party';
import { createRng, type RandomSource } from './rng';
import type {
	ClassName,
	CombatTurnState,
	GameState,
	PartyGameState,
	PartyMemberState,
	PlayerEffects,
	PlayerState,
	RunSummary,
	StatName
} from './model';

export * from './model';

export const LEGACY_CONTENT_VERSION = 'st-bozma-mvp-v1';
export const V2_CONTENT_VERSION = 'st-bozma-v0.8.5-v2';
export const V3_CONTENT_VERSION = 'st-bozma-expedition-v3';
export const CONTENT_VERSION = 'st-bozma-expedition-v4';
export const PARTY_CONTENT_VERSION = 'st-bozma-party-v5';
export const SUPPORTED_CONTENT_VERSIONS = [
	LEGACY_CONTENT_VERSION,
	V2_CONTENT_VERSION,
	V3_CONTENT_VERSION,
	CONTENT_VERSION,
	PARTY_CONTENT_VERSION
] as const;

export interface NewRunInput {
	runId: string;
	name: string;
	className: ClassName;
	seed: string;
	contentVersion?: string;
}

export interface NewPartyRunInput {
	runId: string;
	seed: string;
	party: PartySelection[];
	contentVersion?: typeof PARTY_CONTENT_VERSION;
}

export class UnsupportedContentVersionError extends Error {}

export function decodeGameState(value: unknown): GameState | PartyGameState {
	if (!value || typeof value !== 'object') throw new Error('Invalid game-state snapshot.');
	const candidate = value as Partial<GameState>;
	if (candidate.contentVersion === PARTY_CONTENT_VERSION) {
		const party = value as Partial<PartyGameState>;
		const members = Array.isArray(party.party) ? party.party : [];
		const memberIds = new Set(members.map((member) => member.memberId));
		const memberClasses = new Set(members.map((member) => member.className));
		if (
			members.length < 1 ||
			members.length > 3 ||
			memberIds.size !== members.length ||
			memberClasses.size !== members.length ||
			!members.every(
				(member) =>
					typeof member.memberId === 'string' &&
					member.templateId in PARTY_TEMPLATES &&
					PARTY_TEMPLATES[member.templateId as PartyTemplateId].className === member.className &&
					typeof member.down === 'boolean' &&
					Number.isInteger(member.downCount) &&
					(member.rank === 'near' || member.rank === 'far') &&
					Number.isFinite(member.hp) &&
					Number.isFinite(member.maxHp) &&
					Array.isArray(member.healthRolls)
			) ||
			!party.expedition ||
			!memberIds.has(party.leaderMemberId ?? '') ||
			(party.activeMemberId !== null &&
				party.activeMemberId !== undefined &&
				!memberIds.has(party.activeMemberId)) ||
			typeof party.gold !== 'number'
		) {
			throw new Error('Invalid v5 snapshot: party state is missing.');
		}
		if (party.encounter) {
			const enemyIds = new Set(party.encounter.enemies?.map((enemy) => enemy.instanceId) ?? []);
			const initiativeActors = new Set(
				party.encounter.initiative?.map((entry) => entry.actorId) ?? []
			);
			if (
				!Array.isArray(party.encounter.initiative) ||
				party.encounter.initiative.length === 0 ||
				!Number.isInteger(party.encounter.initiativeIndex) ||
				(party.encounter.initiativeIndex ?? -1) < 0 ||
				(party.encounter.initiativeIndex ?? 0) >= party.encounter.initiative.length ||
				initiativeActors.size !== party.encounter.initiative.length ||
				!party.encounter.initiative.every((entry) =>
					entry.kind === 'member' ? memberIds.has(entry.actorId) : enemyIds.has(entry.actorId)
				) ||
				!party.encounter.memberTurns ||
				!members.every((member) => {
					const turn = party.encounter?.memberTurns?.[member.memberId];
					return (
						turn !== undefined &&
						Number.isInteger(turn.actionPoints) &&
						Array.isArray(turn.usedActionIds)
					);
				})
			) {
				throw new Error('Invalid v5 snapshot: initiative state is missing.');
			}
		}
		return value as PartyGameState;
	}
	if (candidate.contentVersion === LEGACY_CONTENT_VERSION) return value as GameState;
	if (
		candidate.contentVersion !== V2_CONTENT_VERSION &&
		candidate.contentVersion !== V3_CONTENT_VERSION &&
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
	if (
		candidate.contentVersion === V3_CONTENT_VERSION ||
		candidate.contentVersion === CONTENT_VERSION
	) {
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
	return (
		contentVersion === V2_CONTENT_VERSION ||
		contentVersion === V3_CONTENT_VERSION ||
		contentVersion === CONTENT_VERSION ||
		contentVersion === PARTY_CONTENT_VERSION
	);
}

function usesExpedition(contentVersion: string): boolean {
	return (
		contentVersion === V3_CONTENT_VERSION ||
		contentVersion === CONTENT_VERSION ||
		contentVersion === PARTY_CONTENT_VERSION
	);
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

export function createPlayerState(
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
	if (contentVersion === PARTY_CONTENT_VERSION) {
		throw new Error('Party v5 runs require validated party selections.');
	}
	const graph = generateDungeon(seed, usesExpedition(contentVersion));
	const rng = createRng(`${seed}:commands`);
	const player = createPlayerState(
		input?.name?.trim() || 'Mara Vey',
		className,
		contentVersion,
		rng
	);
	const expedition = usesExpedition(contentVersion)
		? createExpeditionState(seed, graph)
		: undefined;
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

export function createPartyInitialState(input: NewPartyRunInput): PartyGameState {
	const selections = validatePartySelections(input.party);
	const seed = input.seed.trim() || 'bozma-party';
	const graph = generateDungeon(seed, true);
	const rng = createRng(`${seed}:commands`);
	const expedition = createExpeditionState(seed, graph);
	const party = selections.map((selection): PartyMemberState => {
		const template = PARTY_TEMPLATES[selection.templateId as PartyTemplateId];
		const player = createPlayerState(template.name, template.className, PARTY_CONTENT_VERSION, rng);
		const equipped = player.weapons.find((weapon) => weapon.rank === selection.startingRank);
		if (equipped) player.equippedWeaponId = equipped.id;
		player.rank = selection.startingRank;
		const memberRecord = structuredClone(player) as unknown as Record<string, unknown>;
		delete memberRecord.gold;
		const member = memberRecord as unknown as Omit<PlayerState, 'gold'>;
		return {
			...member,
			memberId: `member:${selection.templateId}`,
			templateId: selection.templateId,
			down: false,
			downCount: 0,
			reserveWeaponId:
				player.weapons.find((weapon) => weapon.id !== player.equippedWeaponId)?.id ?? null
		};
	});

	return {
		runId: input.runId,
		seed,
		contentVersion: PARTY_CONTENT_VERSION,
		rngCursor: rng.snapshot?.().cursor ?? 0,
		turn: 0,
		status: 'active',
		phase: 'exploration',
		roomId: graph.entryId,
		graph,
		visitedRooms: [graph.entryId],
		resolvedRooms: [],
		defeatedEncounters: [],
		party,
		activeMemberId: null,
		leaderMemberId: party[0].memberId,
		gold: 0,
		encounter: null,
		patchUpAvailable: false,
		flags: {
			manessaTurned: false,
			bozmanSensor: false,
			tombMercyAttempted: false
		},
		expedition
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
	if (usesExpedition(state.contentVersion) && state.expedition) {
		summary.goldFound = state.expedition.goldFound;
		summary.goldSpent = state.expedition.goldSpent;
		summary.relicsCarried = state.expedition.inventory.relicIds.map(
			(relicId) => itemDefinition(relicId).name
		);
		summary.notableTreasure = [...state.expedition.inventory.notableTreasure];
	}
	return summary;
}

export function summarizePartyRun(state: PartyGameState): RunSummary | null {
	if (state.status === 'active') return null;
	const first = state.party[0];
	return {
		runId: state.runId,
		characterName: state.party.map((member) => member.name).join(', '),
		className: first.className,
		seed: state.seed,
		outcome: state.status,
		roomsVisited: state.visitedRooms.length,
		enemiesDefeated: state.defeatedEncounters.length,
		levelReached: Math.max(...state.party.map((member) => member.level)),
		notableLoot: [...state.expedition.inventory.notableTreasure],
		goldFound: state.expedition.goldFound,
		goldSpent: state.expedition.goldSpent,
		relicsCarried: state.expedition.inventory.relicIds.map((id) => itemDefinition(id).name),
		notableTreasure: [...state.expedition.inventory.notableTreasure],
		partySize: state.party.length,
		partyMembers: state.party.map((member) => ({
			memberId: member.memberId,
			templateId: member.templateId,
			name: member.name,
			className: member.className,
			level: member.level,
			downCount: member.downCount
		})),
		defeatCause:
			state.status === 'death'
				? 'full-party-down'
				: state.status === 'objective-failure'
					? 'decode'
					: undefined
	};
}
