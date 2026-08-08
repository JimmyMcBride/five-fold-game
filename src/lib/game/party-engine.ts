import type { GameCommand, LegalCommand } from './commands';
import { createEnemy } from './content/enemies';
import type { GameEvent } from './events';
import {
	getLegalCommands as getSoloLegalCommands,
	resolvePlayerTurnEnd,
	resolvePlayerTurnStart,
	resolveCommand as resolveSoloCommand
} from './engine';
import type {
	CombatTurnState,
	EnemyState,
	GameState,
	PartyEncounterState,
	PartyGameState,
	PartyMemberState,
	PlayerState,
	RollResult
} from './model';
import type { RandomSource } from './rng';
import { modifier, rollDice, rollStat } from './rules';
import { CONTENT_VERSION } from './state';

export interface PartyCommandResolution {
	state: PartyGameState;
	events: GameEvent[];
}

const ALLY_FEATURES = new Set([
	'shield-of-faith',
	'restorative-prayer',
	'prayer-of-healing',
	'guidance',
	'bless'
]);

const HEALING_FEATURES = new Set(['restorative-prayer', 'prayer-of-healing']);

function event(
	state: PartyGameState,
	kind: GameEvent['kind'],
	text: string,
	tone: GameEvent['tone'] = 'neutral',
	actorId?: string,
	targetId?: string,
	roll?: RollResult
): GameEvent {
	return {
		kind,
		text,
		tone,
		turn: state.turn,
		...(actorId ? { actorId } : {}),
		...(targetId ? { targetId } : {}),
		...(roll ? { roll } : {})
	};
}

function freshTurn(): CombatTurnState {
	return {
		round: 1,
		playerTurnsCompleted: 0,
		actionUsed: false,
		abilityUsed: false,
		maneuverAvailable: false,
		actionPoints: 2,
		usedActionIds: []
	};
}

function activeMember(state: PartyGameState): PartyMemberState | null {
	return state.party.find((member) => member.memberId === state.activeMemberId) ?? null;
}

function leader(state: PartyGameState): PartyMemberState {
	return (
		state.party.find((member) => member.memberId === state.leaderMemberId && !member.down) ??
		state.party.find((member) => !member.down) ??
		state.party[0]
	);
}

function asSoloState(state: PartyGameState, member: PartyMemberState): GameState {
	const reserveWeaponId = member.reserveWeaponId;
	const playerRecord = structuredClone(member) as unknown as Record<string, unknown>;
	for (const key of ['memberId', 'templateId', 'down', 'downCount', 'reserveWeaponId']) {
		delete playerRecord[key];
	}
	const player = playerRecord as unknown as Omit<PlayerState, 'gold'>;
	const expedition = structuredClone(state.expedition);
	expedition.inventory.reserveWeaponId = reserveWeaponId;
	return {
		runId: state.runId,
		seed: state.seed,
		contentVersion: CONTENT_VERSION,
		rngCursor: state.rngCursor,
		turn: state.turn,
		status: state.status,
		phase: state.phase,
		roomId: state.roomId,
		graph: structuredClone(state.graph),
		visitedRooms: [...state.visitedRooms],
		resolvedRooms: [...state.resolvedRooms],
		defeatedEncounters: [...state.defeatedEncounters],
		player: { ...structuredClone(player), gold: state.gold },
		encounter: state.encounter
			? {
					id: state.encounter.id,
					kind: state.encounter.kind,
					enemies: structuredClone(state.encounter.enemies),
					turn: structuredClone(state.encounter.memberTurns[member.memberId] ?? freshTurn()),
					decodeCount: state.encounter.decodeCount
				}
			: null,
		patchUpAvailable: state.patchUpAvailable,
		flags: structuredClone(state.flags),
		expedition
	};
}

function mergeSoloState(
	state: PartyGameState,
	memberId: string,
	solo: GameState,
	previousEncounter: PartyEncounterState | null
): void {
	const memberIndex = state.party.findIndex((member) => member.memberId === memberId);
	if (memberIndex < 0) return;
	const previous = state.party[memberIndex];
	const { gold, ...player } = solo.player;
	state.party[memberIndex] = {
		...previous,
		...structuredClone(player),
		memberId: previous.memberId,
		templateId: previous.templateId,
		down: solo.player.hp <= 0,
		downCount: previous.downCount,
		reserveWeaponId: solo.expedition?.inventory.reserveWeaponId ?? previous.reserveWeaponId
	};
	state.gold = gold;
	state.roomId = solo.roomId;
	state.graph = structuredClone(solo.graph);
	state.visitedRooms = [...solo.visitedRooms];
	state.resolvedRooms = [...solo.resolvedRooms];
	state.defeatedEncounters = [...solo.defeatedEncounters];
	state.patchUpAvailable = solo.patchUpAvailable;
	state.flags = structuredClone(solo.flags);
	state.expedition = structuredClone(solo.expedition ?? state.expedition);
	state.expedition.inventory.reserveWeaponId = null;
	state.phase = solo.phase;
	state.status = solo.status;
	if (previousEncounter && solo.encounter) {
		state.encounter = {
			...previousEncounter,
			enemies: structuredClone(solo.encounter.enemies),
			decodeCount: solo.encounter.decodeCount,
			memberTurns: {
				...previousEncounter.memberTurns,
				[memberId]: structuredClone(solo.encounter.turn)
			}
		};
	} else if (previousEncounter && !solo.encounter) {
		state.encounter = null;
		state.activeMemberId = null;
	}
}

function stripActor(command: GameCommand): GameCommand {
	const rest = { ...command } as GameCommand;
	delete rest.actorId;
	return rest;
}

function withActor(command: LegalCommand, actorId: string): LegalCommand {
	return {
		...command,
		id: `${actorId}:${command.id}`,
		actorId,
		command: { ...command.command, actorId } as GameCommand
	};
}

function commandKey(command: GameCommand): string {
	const sorted = Object.fromEntries(
		Object.entries(command)
			.filter(([, value]) => value !== undefined)
			.sort(([left], [right]) => left.localeCompare(right))
	);
	return JSON.stringify(sorted);
}

function expandAllyTargets(
	state: PartyGameState,
	actor: PartyMemberState,
	commands: LegalCommand[]
): LegalCommand[] {
	const result: LegalCommand[] = [];
	for (const legal of commands) {
		if (legal.command.type === 'use-feature' && ALLY_FEATURES.has(legal.command.featureId)) {
			for (const target of state.party) {
				if (target.down && !HEALING_FEATURES.has(legal.command.featureId)) continue;
				result.push({
					...legal,
					id: `${legal.id}:${target.memberId}`,
					label: `${legal.label} — ${target.name}`,
					targetKind: target.memberId === actor.memberId ? 'self' : 'ally',
					command: { ...legal.command, targetId: target.memberId }
				});
			}
			continue;
		}
		if (legal.command.type === 'use-item' && legal.command.itemId === 'healing-potion') {
			for (const target of state.party.filter((candidate) => candidate.hp < candidate.maxHp)) {
				result.push({
					...legal,
					id: `${legal.id}:${target.memberId}`,
					label: `Use Healing Potion — ${target.name}`,
					targetKind: target.memberId === actor.memberId ? 'self' : 'ally',
					command: { ...legal.command, targetId: target.memberId }
				});
			}
			continue;
		}
		result.push(legal);
	}
	return result;
}

export function getPartyLegalCommands(state: PartyGameState): LegalCommand[] {
	if (state.status !== 'active') return [];
	if (state.phase === 'combat') {
		const actor = activeMember(state);
		if (!actor || actor.down) return [];
		const soloCommands = getSoloLegalCommands(asSoloState(state, actor));
		const turn = state.encounter?.memberTurns[actor.memberId];
		if (
			(state.expedition.inventory.consumables['healing-potion'] ?? 0) > 0 &&
			state.party.some((member) => member.hp < member.maxHp) &&
			(turn?.actionPoints ?? 0) > 0 &&
			!turn?.usedActionIds?.includes('item:healing-potion') &&
			!soloCommands.some(
				(command) =>
					command.command.type === 'use-item' && command.command.itemId === 'healing-potion'
			)
		) {
			soloCommands.push({
				id: 'use:healing-potion',
				label: 'Use Healing Potion',
				detail: 'Action // Restore health as if Patching Up.',
				command: { type: 'use-item', itemId: 'healing-potion' },
				economy: 'action'
			});
		}
		return expandAllyTargets(state, actor, soloCommands).map((command) =>
			withActor(command, actor.memberId)
		);
	}

	const currentLeader = leader(state);
	const commands = getSoloLegalCommands(asSoloState(state, currentLeader))
		.filter((legal) => legal.command.type !== 'patch-up')
		.map((command) => withActor(command, currentLeader.memberId));
	for (const member of state.party) {
		if (!member.down && member.memberId !== currentLeader.memberId) {
			commands.push({
				id: `leader:${member.memberId}`,
				label: `Make ${member.name} leader`,
				detail: `${member.className} commits the next exploration action.`,
				actorId: currentLeader.memberId,
				targetKind: 'ally',
				command: {
					type: 'set-leader',
					memberId: member.memberId,
					actorId: currentLeader.memberId
				}
			});
		}
		if (state.patchUpAvailable && member.recoveryDice > 0 && member.hp < member.maxHp) {
			commands.push({
				id: `patch-up:${member.memberId}`,
				label: `Patch Up — ${member.name}`,
				detail: 'Spend one of this adventurer’s Recovery Dice.',
				actorId: member.memberId,
				targetKind: 'self',
				command: { type: 'patch-up', actorId: member.memberId, targetId: member.memberId }
			});
		}
	}
	return commands;
}

function partyEnemyDefinitions(baseIds: string[], partySize: number): string[] {
	if (partySize === 1) return baseIds;
	const finale = baseIds.includes('barnabe');
	if (partySize === 2) return [...baseIds, finale ? 'hellhornet' : 'hellhornet'];
	return [...baseIds, 'hellhornet', finale ? 'zeboul' : 'scorched-raider'];
}

function initializeEncounter(
	state: PartyGameState,
	baseEnemies: EnemyState[],
	kind: PartyEncounterState['kind'],
	rng: RandomSource,
	events: GameEvent[]
): void {
	const definitions = partyEnemyDefinitions(
		baseEnemies.map((enemy) => enemy.id),
		state.party.length
	);
	const enemies = definitions.map((id, index) => {
		const enemy = createEnemy(id, String(index + 1));
		enemy.momentum = 0;
		return enemy;
	});
	const initiative = [
		...state.party.map((member) => ({
			actorId: member.memberId,
			kind: 'member' as const,
			initiative: rng.int(1, 10) + modifier(member.stats.reflex)
		})),
		...enemies.map((enemy) => ({
			actorId: enemy.instanceId,
			kind: 'enemy' as const,
			initiative: rng.int(1, 10) + enemy.reflexModifier
		}))
	].sort(
		(left, right) =>
			right.initiative - left.initiative ||
			(left.kind === right.kind
				? left.actorId.localeCompare(right.actorId)
				: left.kind === 'member'
					? -1
					: 1)
	);
	state.encounter = {
		id: kind === 'finale' ? 'barnabe-finale' : `${state.roomId}-encounter`,
		kind,
		enemies,
		decodeCount: 0,
		initiative,
		initiativeIndex: 0,
		round: 1,
		memberTurns: Object.fromEntries(state.party.map((member) => [member.memberId, freshTurn()]))
	};
	state.phase = 'combat';
	for (const member of state.party) {
		member.usedFeatures = [];
		member.effects.braced = false;
	}
	events.push(
		event(
			state,
			'encounter-started',
			`${enemies.map((enemy) => enemy.name).join(', ')} bar the party’s way.`,
			'danger'
		)
	);
	events.push(
		event(
			state,
			'initiative-resolved',
			`Initiative: ${initiative
				.map((entry) => {
					const member = state.party.find((candidate) => candidate.memberId === entry.actorId);
					const enemy = enemies.find((candidate) => candidate.instanceId === entry.actorId);
					return `${member?.name ?? enemy?.name ?? entry.actorId} ${entry.initiative}`;
				})
				.join(', ')}.`,
			'command'
		)
	);
	state.activeMemberId = null;
	activateCurrentEntry(state, rng, events);
}

function consciousMembers(state: PartyGameState): PartyMemberState[] {
	return state.party.filter((member) => !member.down && member.hp > 0);
}

function chooseEnemyTarget(state: PartyGameState, enemy: EnemyState): PartyMemberState | null {
	const pool = consciousMembers(state).filter((member) => !member.effects.hidden);
	if (pool.length === 0) return null;
	const near = pool.filter((member) => member.rank === 'near');
	if (enemy.attackRank === 'near' && near.length > 0) return near[0];
	return [...pool].sort(
		(left, right) =>
			(left.rank === 'near' ? 0 : 1) - (right.rank === 'near' ? 0 : 1) ||
			state.party.indexOf(left) - state.party.indexOf(right)
	)[0];
}

function downMember(state: PartyGameState, member: PartyMemberState, events: GameEvent[]): void {
	if (member.hp > 0 || member.down) return;
	member.down = true;
	member.downCount += 1;
	events.push(
		event(
			state,
			'member-downed',
			`${member.name} is Down and leaves the initiative until healed.`,
			'danger',
			undefined,
			member.memberId
		)
	);
	if (state.party.every((candidate) => candidate.down)) {
		state.status = 'death';
		state.phase = 'defeat';
		state.encounter = null;
		state.activeMemberId = null;
		events.push(
			event(
				state,
				'run-ended',
				'Every adventurer is Down. The tomb closes over the party.',
				'danger'
			)
		);
	}
}

function enemyTurn(
	state: PartyGameState,
	enemy: EnemyState,
	rng: RandomSource,
	events: GameEvent[]
): void {
	if (enemy.stunnedTurns > 0) {
		enemy.stunnedTurns -= 1;
		events.push(
			event(
				state,
				'feature-resolved',
				`${enemy.name} loses the turn while stunned.`,
				'success',
				enemy.instanceId
			)
		);
		return;
	}
	if (enemy.id === 'barnabe') {
		enemy.turnsTaken += 1;
		if (enemy.turnsTaken % 2 === 1) {
			events.push(
				event(
					state,
					'feature-resolved',
					'Barnabe cowers and gathers momentum for Decode.',
					'neutral',
					enemy.instanceId
				)
			);
			return;
		}
		if (enemy.silencedTurns > 0) {
			enemy.silencedTurns -= 1;
			events.push(
				event(
					state,
					'feature-resolved',
					'Barnabe cannot utter Decode while silenced.',
					'success',
					enemy.instanceId
				)
			);
			return;
		}
		if (!state.encounter) return;
		state.encounter.decodeCount += 1;
		events.push(
			event(
				state,
				'decode-advanced',
				`Barnabe completes Decode ${state.encounter.decodeCount} of 3.`,
				'danger',
				enemy.instanceId
			)
		);
		if (state.encounter.decodeCount >= 3) {
			state.status = 'objective-failure';
			state.phase = 'defeat';
			state.encounter = null;
			state.activeMemberId = null;
			events.push(
				event(
					state,
					'run-ended',
					'The third prayer opens the casket. The party is too late.',
					'danger'
				)
			);
		}
		return;
	}
	const target = chooseEnemyTarget(state, enemy);
	if (!target) {
		enemy.turnsTaken += 1;
		events.push(
			event(
				state,
				'feature-resolved',
				`${enemy.name} searches the shadows but finds no legal target.`,
				'neutral',
				enemy.instanceId
			)
		);
		return;
	}
	if (enemy.attackRank === 'near' && target.rank === 'far') {
		target.rank = 'near';
		events.push(
			event(
				state,
				'rank-shifted',
				`${enemy.name} closes on ${target.name}; the unguarded back line dissolves.`,
				'danger',
				enemy.instanceId,
				target.memberId
			)
		);
		return;
	}
	const defense = target.defense;
	let adjustment = 0;
	if (defense === 'reflex' && target.armor === 'light') adjustment -= 5;
	if (defense === 'heart' && target.armor === 'heavy') adjustment -= 5;
	if (target.weapons.some((weapon) => weapon.id === 'shield')) adjustment -= 10;
	const roll = rollStat(rng, defense, target.stats[defense], {
		adjustment,
		advantage: target.effects.braced || enemy.blinded
	});
	target.effects.braced = false;
	enemy.blinded = false;
	let damage = rollDice(rng, enemy.damageDice) + enemy.damageModifier;
	if (roll.success) {
		if (defense === 'heart') {
			damage =
				roll.band === 'critical'
					? 0
					: Math.max(0, damage - modifier(target.stats.heart) * (roll.band === 'hard' ? 2 : 1));
		} else {
			damage = 0;
			if (defense === 'reflex' && roll.band === 'hard') {
				target.momentum = Math.min(10, target.momentum + 1);
			}
			if (defense === 'reflex' && roll.band === 'critical') {
				target.momentum = Math.min(10, target.momentum + 2);
			}
		}
	}
	if (target.className === 'Warrior') {
		target.momentum = Math.min(10, target.momentum + 1);
		if (defense === 'heart' && roll.success) {
			target.momentum = Math.min(10, target.momentum + 1);
		}
	}
	const absorbed = Math.min(target.temporaryHp, damage);
	target.temporaryHp -= absorbed;
	const hpDamage = damage - absorbed;
	target.hp = Math.max(0, target.hp - hpDamage);
	enemy.turnsTaken += 1;
	enemy.damagedPlayerLastTurn = hpDamage > 0;
	events.push(
		event(
			state,
			'damage-taken',
			`${target.name} rolls ${roll.kept} with ${defense}. ${enemy.name} deals ${hpDamage} damage.`,
			hpDamage > 0 ? 'danger' : 'success',
			enemy.instanceId,
			target.memberId,
			roll
		)
	);
	downMember(state, target, events);
}

function resetRound(state: PartyGameState): void {
	if (!state.encounter) return;
	state.encounter.round += 1;
	for (const member of state.party) {
		const turns = state.encounter.memberTurns[member.memberId] ?? freshTurn();
		state.encounter.memberTurns[member.memberId] = {
			...turns,
			round: state.encounter.round,
			playerTurnsCompleted: turns.playerTurnsCompleted,
			actionUsed: false,
			abilityUsed: false,
			maneuverAvailable: false,
			actionPoints: 2,
			usedActionIds: []
		};
	}
}

function activateCurrentEntry(state: PartyGameState, rng: RandomSource, events: GameEvent[]): void {
	let guard = 0;
	while (state.encounter && state.status === 'active' && guard < 100) {
		guard += 1;
		if (state.encounter.initiativeIndex >= state.encounter.initiative.length) {
			state.encounter.initiativeIndex = 0;
			resetRound(state);
		}
		const entry = state.encounter.initiative[state.encounter.initiativeIndex];
		if (entry.kind === 'member') {
			const member = state.party.find((candidate) => candidate.memberId === entry.actorId);
			if (member && !member.down) {
				const previousEncounter = state.encounter;
				const previousExperience = new Map(
					state.party.map((candidate) => [candidate.memberId, candidate.experience])
				);
				const solo = asSoloState(state, member);
				const soloEvents: GameEvent[] = [];
				resolvePlayerTurnStart(solo, rng, soloEvents);
				mergeSoloState(state, member.memberId, solo, previousEncounter);
				events.push(
					...soloEvents.map((eventEntry) => ({
						...eventEntry,
						turn: state.turn,
						actorId: member.memberId,
						text: `${member.name}: ${eventEntry.text}`
					}))
				);
				if (previousEncounter && !state.encounter && state.status === 'active') {
					awardPartyExperience(state, previousExperience, events);
				}
				if (!state.encounter || state.status !== 'active') return;
				state.activeMemberId = member.memberId;
				events.push(
					event(state, 'turn-ended', `${member.name} is Active.`, 'command', member.memberId)
				);
				return;
			}
		} else {
			const enemy = state.encounter.enemies.find(
				(candidate) => candidate.instanceId === entry.actorId && candidate.hp > 0
			);
			if (enemy) enemyTurn(state, enemy, rng, events);
		}
		if (state.encounter) state.encounter.initiativeIndex += 1;
	}
}

function advanceInitiative(state: PartyGameState, rng: RandomSource, events: GameEvent[]): void {
	if (!state.encounter) return;
	state.encounter.initiativeIndex += 1;
	state.activeMemberId = null;
	activateCurrentEntry(state, rng, events);
}

function resolveAllyFeature(
	state: PartyGameState,
	command: Extract<GameCommand, { type: 'use-feature' }>,
	actor: PartyMemberState,
	target: PartyMemberState,
	rng: RandomSource
): GameEvent[] {
	const previousActorHp = actor.hp;
	const previousActorTemporaryHp = actor.temporaryHp;
	const previousTarget = structuredClone(target);
	const solo = asSoloState(state, actor);
	if (target.memberId !== actor.memberId && HEALING_FEATURES.has(command.featureId)) {
		solo.player.hp = Math.max(0, solo.player.maxHp - (target.maxHp - target.hp));
	}
	const soloStartingHp = solo.player.hp;
	const soloStartingTemporaryHp = solo.player.temporaryHp;
	const resolution = resolveSoloCommand(
		solo,
		{ ...stripActor(command), targetId: undefined } as GameCommand,
		rng
	);
	mergeSoloState(state, actor.memberId, resolution.state, state.encounter);
	const nextActor = state.party.find((member) => member.memberId === actor.memberId)!;
	const nextTarget = state.party.find((member) => member.memberId === target.memberId)!;
	if (target.memberId !== actor.memberId) {
		const healed = Math.max(0, resolution.state.player.hp - soloStartingHp);
		nextActor.hp = previousActorHp;
		nextActor.temporaryHp = previousActorTemporaryHp;
		nextTarget.hp = Math.min(nextTarget.maxHp, previousTarget.hp + healed);
		if (command.featureId === 'shield-of-faith') {
			nextTarget.temporaryHp = Math.max(previousTarget.temporaryHp, modifier(actor.stats.soul));
		} else {
			const temporary = Math.max(0, resolution.state.player.temporaryHp - soloStartingTemporaryHp);
			nextTarget.temporaryHp = Math.max(previousTarget.temporaryHp, temporary);
		}
		if (command.featureId === 'guidance') {
			nextTarget.effects.guidance = nextActor.effects.guidance;
			nextTarget.effects.guidanceExpiresAfterTurn = nextActor.effects.guidanceExpiresAfterTurn;
			nextActor.effects.guidance = 0;
			nextActor.effects.guidanceExpiresAfterTurn = null;
		}
		if (command.featureId === 'bless') {
			nextTarget.effects.bless = nextActor.effects.bless;
			nextTarget.effects.blessExpiresAfterTurn = nextActor.effects.blessExpiresAfterTurn;
			nextActor.effects.bless = 0;
			nextActor.effects.blessExpiresAfterTurn = null;
		}
	}
	if (nextTarget.hp > 0 && nextTarget.down) {
		nextTarget.down = false;
	}
	const mapped: GameEvent[] = resolution.events.map((entry) => ({
		...entry,
		turn: state.turn,
		actorId: actor.memberId,
		targetId: target.memberId,
		text: `${actor.name} → ${target.name}: ${entry.text}`
	}));
	if (command.featureId === 'restorative-prayer' && previousTarget.hp >= previousTarget.maxHp) {
		const momentum = rng.int(1, 10);
		nextTarget.momentum = Math.min(10, nextTarget.momentum + momentum);
		mapped.push(
			event(
				state,
				'feature-resolved',
				`${target.name} is already whole and gains ${momentum} momentum.`,
				'success',
				actor.memberId,
				target.memberId
			)
		);
	}
	return mapped;
}

function resolveAllyHealingPotion(
	state: PartyGameState,
	command: Extract<GameCommand, { type: 'use-item' }>,
	actor: PartyMemberState,
	target: PartyMemberState,
	rng: RandomSource
): GameEvent[] {
	const actorHp = actor.hp;
	const targetHp = target.hp;
	const solo = asSoloState(state, actor);
	if (target.memberId !== actor.memberId) {
		solo.player.maxHp = target.maxHp;
		solo.player.hp = target.hp;
		solo.player.stats.heart = target.stats.heart;
	}
	const startingHp = solo.player.hp;
	const resolution = resolveSoloCommand(solo, stripActor(command), rng);
	mergeSoloState(state, actor.memberId, resolution.state, state.encounter);
	const nextActor = state.party.find((member) => member.memberId === actor.memberId)!;
	const nextTarget = state.party.find((member) => member.memberId === target.memberId)!;
	if (target.memberId !== actor.memberId) {
		const healed = Math.max(0, resolution.state.player.hp - startingHp);
		nextActor.hp = actorHp;
		nextTarget.hp = Math.min(nextTarget.maxHp, targetHp + healed);
		if (nextTarget.hp > 0) nextTarget.down = false;
	}
	return resolution.events.map((entry) => ({
		...entry,
		turn: state.turn,
		actorId: actor.memberId,
		targetId: target.memberId,
		text: `${actor.name} → ${target.name}: ${entry.text}`
	}));
}

function awardPartyExperience(
	state: PartyGameState,
	previousExperience: Map<string, number>,
	events: GameEvent[]
): void {
	const share = Math.floor(5 / state.party.length);
	for (const member of state.party) {
		member.experience = (previousExperience.get(member.memberId) ?? member.experience) + share;
	}
	events.push(
		event(
			state,
			'experience-gained',
			`Victory grants ${share} XP to each of ${state.party.length} adventurers.`,
			'success'
		)
	);
}

function trackPartyQualifyingRolls(
	state: PartyGameState,
	actorId: string | undefined,
	events: GameEvent[]
): void {
	if (!state.encounter || !actorId) return;
	const successes = events.filter(
		(entry) =>
			entry.actorId === actorId && (entry.roll?.band === 'hard' || entry.roll?.band === 'critical')
	).length;
	if (successes === 0) return;
	for (const member of state.party) {
		if (
			member.memberId !== actorId &&
			member.className === 'Magi' &&
			member.effects.shootingStarTargetId !== null
		) {
			member.effects.shootingStarSuccesses += successes;
		}
	}
}

export function resolvePartyCommand(
	state: PartyGameState,
	command: GameCommand,
	rng: RandomSource
): PartyCommandResolution {
	const legal = getPartyLegalCommands(state).find(
		(candidate) => commandKey(candidate.command) === commandKey(command)
	);
	if (!legal) {
		return {
			state,
			events: [
				event(
					state,
					'command-rejected',
					'That actor or target is not legal now. Nothing advances.',
					'danger'
				)
			]
		};
	}
	const next = structuredClone(state);
	next.turn += 1;
	const events: GameEvent[] = [];
	if (command.type === 'set-leader') {
		next.leaderMemberId = command.memberId;
		const member = leader(next);
		events.push(
			event(
				next,
				'feature-resolved',
				`${member.name} becomes exploration leader.`,
				'command',
				member.memberId
			)
		);
	} else if (next.phase === 'combat') {
		const actor = activeMember(next)!;
		if (command.type === 'end-turn') {
			const solo = asSoloState(next, actor);
			const soloEvents: GameEvent[] = [];
			resolvePlayerTurnEnd(solo, rng, soloEvents, false);
			mergeSoloState(next, actor.memberId, solo, next.encounter);
			events.push(
				...soloEvents.map((entry) => ({
					...entry,
					turn: next.turn,
					actorId: actor.memberId,
					text: `${actor.name}: ${entry.text}`
				}))
			);
			advanceInitiative(next, rng, events);
		} else {
			const featureTarget =
				command.type === 'use-feature' && command.targetId
					? next.party.find((member) => member.memberId === command.targetId)
					: undefined;
			const itemTarget =
				command.type === 'use-item' && command.targetId
					? next.party.find((member) => member.memberId === command.targetId)
					: undefined;
			if (command.type === 'use-feature' && featureTarget && ALLY_FEATURES.has(command.featureId)) {
				events.push(...resolveAllyFeature(next, command, actor, featureTarget, rng));
			} else if (command.type === 'use-item' && command.itemId === 'healing-potion' && itemTarget) {
				events.push(...resolveAllyHealingPotion(next, command, actor, itemTarget, rng));
			} else {
				const beforeEncounter = next.encounter;
				const previousExperience = new Map(
					next.party.map((member) => [member.memberId, member.experience])
				);
				const solo = asSoloState(next, actor);
				const resolution = resolveSoloCommand(solo, stripActor(command), rng);
				mergeSoloState(next, actor.memberId, resolution.state, beforeEncounter);
				const actorDownOnly =
					resolution.state.status === 'death' &&
					resolution.state.player.hp === 0 &&
					beforeEncounter !== null &&
					next.party.some((member) => member.memberId !== actor.memberId && !member.down);
				if (actorDownOnly) {
					next.status = 'active';
					next.phase = 'combat';
					next.encounter = beforeEncounter;
					next.activeMemberId = actor.memberId;
					const downed = next.party.find((member) => member.memberId === actor.memberId)!;
					downed.down = true;
					downed.downCount += 1;
					const turn = next.encounter.memberTurns[actor.memberId];
					if (command.type === 'shove') {
						turn.actionPoints = Math.max(0, (turn.actionPoints ?? 0) - 1);
						turn.usedActionIds = [...(turn.usedActionIds ?? []), 'shove'];
					}
				}
				events.push(
					...resolution.events
						.filter((entry) => !actorDownOnly || entry.kind !== 'run-ended')
						.map((entry) => ({
							...entry,
							turn: next.turn,
							actorId: actor.memberId,
							text: `${actor.name}: ${entry.text}`
						}))
				);
				if (actorDownOnly) {
					events.push(
						event(
							next,
							'member-downed',
							`${actor.name} is Down, but the expedition continues.`,
							'danger',
							actor.memberId,
							actor.memberId
						)
					);
					advanceInitiative(next, rng, events);
				}
				if (beforeEncounter && !next.encounter && next.status === 'active') {
					awardPartyExperience(next, previousExperience, events);
				}
			}
		}
	} else {
		const actorId = command.actorId ?? next.leaderMemberId;
		const actor = next.party.find((member) => member.memberId === actorId) ?? leader(next);
		const beforeActor = structuredClone(actor);
		const solo = asSoloState(next, actor);
		const resolution = resolveSoloCommand(solo, stripActor(command), rng);
		const startedEncounter = !next.encounter && resolution.state.encounter;
		mergeSoloState(next, actor.memberId, resolution.state, null);
		events.push(
			...resolution.events
				.filter(
					(entry) =>
						!startedEncounter ||
						![
							'encounter-started',
							'initiative-resolved',
							'damage-taken',
							'rank-shifted',
							'run-ended'
						].includes(entry.kind)
				)
				.map((entry) => ({
					...entry,
					turn: next.turn,
					actorId: actor.memberId,
					text: `${actor.name}: ${entry.text}`
				}))
		);
		if (command.type === 'patch-up') {
			const patched = next.party.find((member) => member.memberId === actor.memberId)!;
			if (patched.hp > 0) patched.down = false;
		}
		if (startedEncounter) {
			const restored = next.party.find((member) => member.memberId === actor.memberId)!;
			Object.assign(restored, beforeActor);
			next.status = 'active';
			initializeEncounter(
				next,
				resolution.state.encounter!.enemies,
				resolution.state.encounter!.kind,
				rng,
				events
			);
		}
	}
	const consciousLeader = next.party.find(
		(member) => member.memberId === next.leaderMemberId && !member.down
	);
	if (!consciousLeader) {
		next.leaderMemberId =
			next.party.find((member) => !member.down)?.memberId ?? next.leaderMemberId;
	}
	trackPartyQualifyingRolls(next, command.actorId, events);
	const snapshot = rng.snapshot?.();
	if (snapshot) next.rngCursor = snapshot.cursor;
	return { state: next, events };
}
