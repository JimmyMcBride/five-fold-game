import { describe, expect, it } from 'vitest';
import type { GameCommand } from './commands';
import {
	PARTY_TEMPLATE_IDS,
	PARTY_TEMPLATES,
	validatePartySelections,
	type PartyTemplateId
} from './content/party';
import { getPartyLegalCommands, resolvePartyCommand } from './party-engine';
import { createRng } from './rng';
import { modifier } from './rules';
import { createPartyInitialState, decodeGameState, PARTY_CONTENT_VERSION } from './state';
import type { PartyGameState } from './model';

function selections(ids: PartyTemplateId[]) {
	return ids.map((templateId) => ({
		templateId,
		startingRank: PARTY_TEMPLATES[templateId].defaultRank
	}));
}

function initial(ids: PartyTemplateId[], seed = 'party-spec') {
	return createPartyInitialState({
		runId: 'partyrun0000001',
		seed,
		party: selections(ids)
	});
}

function resolve(state: PartyGameState, command: GameCommand) {
	const rng = createRng(`${state.seed}:commands`, state.rngCursor);
	return resolvePartyCommand(state, command, rng);
}

function enterCombat(state: PartyGameState) {
	const move = getPartyLegalCommands(state).find((entry) => entry.command.type === 'move');
	if (!move) throw new Error('Expected an opening move.');
	const result = resolve(state, move.command);
	if (!result.state.encounter) throw new Error('Expected an encounter.');
	return result;
}

function combinations<T>(values: T[], size: number): T[][] {
	if (size === 0) return [[]];
	return values.flatMap((value, index) =>
		combinations(values.slice(index + 1), size - 1).map((tail) => [value, ...tail])
	);
}

describe('party templates and initialization', () => {
	it('publishes five stable, class-unique prebuilts with authored tactical metadata', () => {
		expect(PARTY_TEMPLATE_IDS).toHaveLength(5);
		expect(new Set(PARTY_TEMPLATE_IDS)).toHaveLength(5);
		expect(new Set(PARTY_TEMPLATE_IDS.map((id) => PARTY_TEMPLATES[id].className))).toHaveLength(5);
		for (const id of PARTY_TEMPLATE_IDS) {
			expect(PARTY_TEMPLATES[id]).toMatchObject({
				templateId: id,
				classification: 'adaptation'
			});
			expect(PARTY_TEMPLATES[id].name).not.toBe('');
			expect(PARTY_TEMPLATES[id].role).not.toBe('');
			expect(PARTY_TEMPLATES[id].source).toContain('docs/game-rules/');
		}
	});

	it('rejects empty, oversized, duplicate, unknown, and invalid-rank selections', () => {
		expect(() => validatePartySelections([])).toThrow(/one and three/i);
		expect(() =>
			validatePartySelections([
				...selections([...PARTY_TEMPLATE_IDS.slice(0, 3)]),
				selections(['magi-sevrin'])[0]
			])
		).toThrow(/one and three/i);
		expect(() =>
			validatePartySelections([
				selections(['warrior-corren'])[0],
				selections(['warrior-corren'])[0]
			])
		).toThrow(/only once/i);
		expect(() =>
			validatePartySelections([{ templateId: 'missing', startingRank: 'near' }])
		).toThrow(/known/i);
		expect(() =>
			validatePartySelections([{ templateId: 'warrior-corren', startingRank: 'middle' }])
		).toThrow(/legal starting rank/i);
	});

	it('initializes all 25 unique one-, two-, and three-class lineups deterministically', () => {
		const lineups = [1, 2, 3].flatMap((size) => combinations([...PARTY_TEMPLATE_IDS], size));
		expect(lineups).toHaveLength(25);
		for (const lineup of lineups) {
			const left = initial(lineup, `lineup-${lineup.join('-')}`);
			const right = initial(lineup, `lineup-${lineup.join('-')}`);
			expect(left).toEqual(right);
			expect(left.contentVersion).toBe(PARTY_CONTENT_VERSION);
			expect(left.party).toHaveLength(lineup.length);
			expect(new Set(left.party.map((member) => member.memberId)).size).toBe(lineup.length);
			expect(left.party.map((member) => member.templateId)).toEqual(lineup);
		}
	});

	it('decodes complete party snapshots and fails closed on malformed initiative', () => {
		const state = enterCombat(initial(['warrior-corren', 'priest-odelle'])).state;
		expect(decodeGameState(structuredClone(state))).toEqual(state);
		const malformed = structuredClone(state);
		delete (malformed.encounter as Partial<NonNullable<typeof malformed.encounter>>).memberTurns;
		expect(() => decodeGameState(malformed)).toThrow(/initiative state/i);
	});

	it.each([undefined, null, 42, {}])(
		'fails closed when a party template ID is malformed (%j)',
		(templateId) => {
			const malformed = structuredClone(initial(['warrior-corren']));
			(malformed.party[0] as unknown as Record<string, unknown>).templateId = templateId;
			expect(() => decodeGameState(malformed)).toThrow(
				'Invalid v5 snapshot: party state is missing.'
			);
		}
	);
});

describe('party combat ownership and recovery', () => {
	it('rolls every actor into one deterministic order and exposes only the active member commands', () => {
		const first = enterCombat(
			initial(['warrior-corren', 'scout-nyra', 'priest-odelle'], 'initiative-order')
		);
		const second = enterCombat(
			initial(['warrior-corren', 'scout-nyra', 'priest-odelle'], 'initiative-order')
		);
		expect(first.state).toEqual(second.state);
		expect(first.events).toEqual(second.events);
		expect(first.state.encounter?.initiative).toHaveLength(
			first.state.party.length + (first.state.encounter?.enemies.length ?? 0)
		);
		const legal = getPartyLegalCommands(first.state);
		expect(legal.length).toBeGreaterThan(0);
		expect(new Set(legal.map((entry) => entry.command.actorId))).toEqual(
			new Set([first.state.activeMemberId])
		);
	});

	it('rejects another member acting without consuming turn or RNG', () => {
		const state = enterCombat(initial(['warrior-corren', 'scout-nyra'], 'wrong-actor')).state;
		const legal = getPartyLegalCommands(state).find((entry) => entry.command.type === 'inspect');
		if (!legal) throw new Error('Expected inspect.');
		const other = state.party.find((member) => member.memberId !== state.activeMemberId)!;
		const rejected = resolve(state, { ...legal.command, actorId: other.memberId } as GameCommand);
		expect(rejected.state).toBe(state);
		expect(rejected.state.rngCursor).toBe(state.rngCursor);
		expect(rejected.events[0].kind).toBe('command-rejected');
	});

	it('keeps the back line protected while a conscious Near member holds formation', () => {
		const state = enterCombat(initial(['warrior-corren', 'scout-nyra'], 'front-line')).state;
		const encounter = state.encounter!;
		const warrior = state.party.find((member) => member.className === 'Warrior')!;
		const scout = state.party.find((member) => member.className === 'Scout')!;
		warrior.rank = 'near';
		scout.rank = 'far';
		warrior.defense = 'reflex';
		warrior.stats.reflex = 0;
		const enemy = encounter.enemies[0];
		enemy.attackRank = 'near';
		enemy.damageDice = 0;
		enemy.damageModifier = 7;
		encounter.initiative = [
			{ actorId: scout.memberId, kind: 'member', initiative: 20 },
			{ actorId: enemy.instanceId, kind: 'enemy', initiative: 10 },
			{ actorId: warrior.memberId, kind: 'member', initiative: 5 }
		];
		encounter.initiativeIndex = 0;
		state.activeMemberId = scout.memberId;
		const beforeScout = scout.hp;
		const beforeWarrior = warrior.hp;
		const result = resolve(state, { type: 'end-turn', actorId: scout.memberId });
		expect(result.state.party.find((member) => member.memberId === scout.memberId)?.hp).toBe(
			beforeScout
		);
		expect(
			result.state.party.find((member) => member.memberId === warrior.memberId)?.hp
		).toBeLessThan(beforeWarrior);
	});

	it('marks one member Down, skips them, and lets Priest healing return them without an extra turn', () => {
		const state = enterCombat(initial(['warrior-corren', 'priest-odelle'], 'down-and-heal')).state;
		const encounter = state.encounter!;
		const warrior = state.party.find((member) => member.className === 'Warrior')!;
		const priest = state.party.find((member) => member.className === 'Priest')!;
		warrior.hp = 1;
		warrior.defense = 'reflex';
		warrior.stats.reflex = 0;
		warrior.rank = 'near';
		priest.rank = 'far';
		const enemy = encounter.enemies[0];
		enemy.attackRank = 'near';
		enemy.damageDice = 0;
		enemy.damageModifier = 100;
		encounter.initiative = [
			{ actorId: warrior.memberId, kind: 'member', initiative: 20 },
			{ actorId: enemy.instanceId, kind: 'enemy', initiative: 15 },
			{ actorId: priest.memberId, kind: 'member', initiative: 10 }
		];
		encounter.initiativeIndex = 0;
		state.activeMemberId = warrior.memberId;
		const downed = resolve(state, { type: 'end-turn', actorId: warrior.memberId });
		const downWarrior = downed.state.party.find((member) => member.memberId === warrior.memberId)!;
		expect(downWarrior.down).toBe(true);
		expect(downed.state.status).toBe('active');
		expect(downed.state.activeMemberId).toBe(priest.memberId);
		const prayer = getPartyLegalCommands(downed.state).find(
			(entry) =>
				entry.command.type === 'use-feature' &&
				entry.command.featureId === 'prayer-of-healing' &&
				entry.command.targetId === warrior.memberId
		);
		if (!prayer) throw new Error('Expected ally healing.');
		const healed = resolve(downed.state, prayer.command);
		const returned = healed.state.party.find((member) => member.memberId === warrior.memberId)!;
		expect(returned.hp).toBeGreaterThan(0);
		expect(returned.down).toBe(false);
		expect(healed.state.activeMemberId).toBe(priest.memberId);
	});

	it('ends a one-member run immediately when that member is Down', () => {
		const state = enterCombat(initial(['scout-nyra'], 'party-wipe')).state;
		const member = state.party[0];
		const enemy = state.encounter!.enemies[0];
		member.hp = 1;
		member.defense = 'heart';
		member.stats.heart = 0;
		enemy.attackRank = member.rank;
		enemy.damageDice = 0;
		enemy.damageModifier = 100;
		state.encounter!.initiative = [
			{ actorId: member.memberId, kind: 'member', initiative: 20 },
			{ actorId: enemy.instanceId, kind: 'enemy', initiative: 10 }
		];
		state.encounter!.initiativeIndex = 0;
		state.activeMemberId = member.memberId;
		const result = resolve(state, { type: 'end-turn', actorId: member.memberId });
		expect(result.state.status).toBe('death');
		expect(result.state.encounter).toBeNull();
		expect(result.events.filter((entry) => entry.kind === 'run-ended')).toHaveLength(1);
	});

	it('offers support targets across ranks and grants full-health Restorative momentum', () => {
		const state = enterCombat(
			initial(['warrior-corren', 'priest-odelle'], 'support-targets')
		).state;
		const priest = state.party.find((member) => member.className === 'Priest')!;
		const warrior = state.party.find((member) => member.className === 'Warrior')!;
		priest.rank = 'far';
		warrior.rank = 'near';
		state.activeMemberId = priest.memberId;
		state.encounter!.initiative = [
			{ actorId: priest.memberId, kind: 'member', initiative: 20 },
			{ actorId: warrior.memberId, kind: 'member', initiative: 10 }
		];
		state.encounter!.initiativeIndex = 0;
		state.encounter!.memberTurns[priest.memberId].maneuverAvailable = true;
		const commands = getPartyLegalCommands(state);
		expect(
			commands.some(
				(entry) =>
					entry.command.type === 'use-feature' &&
					entry.command.featureId === 'shield-of-faith' &&
					entry.command.targetId === warrior.memberId
			)
		).toBe(true);
		const prayer = commands.find(
			(entry) =>
				entry.command.type === 'use-feature' &&
				entry.command.featureId === 'restorative-prayer' &&
				entry.command.targetId === warrior.memberId
		);
		if (!prayer) throw new Error('Expected full-health prayer target.');
		const result = resolve(state, prayer.command);
		expect(
			result.state.party.find((member) => member.memberId === warrior.memberId)?.momentum
		).toBeGreaterThan(0);
	});

	it('runs v4 end-turn effects for the active member without giving every enemy a phase', () => {
		const state = enterCombat(
			initial(['versant-mara', 'warrior-corren'], 'end-turn-effects')
		).state;
		const versant = state.party.find((member) => member.className === 'Versant')!;
		const warrior = state.party.find((member) => member.className === 'Warrior')!;
		versant.rank = 'near';
		state.activeMemberId = versant.memberId;
		state.encounter!.initiative = [
			{ actorId: versant.memberId, kind: 'member', initiative: 20 },
			{ actorId: warrior.memberId, kind: 'member', initiative: 10 }
		];
		state.encounter!.initiativeIndex = 0;
		const expected = 1 + Math.min(state.encounter!.enemies.length, modifier(versant.stats.voice));
		const result = resolve(state, { type: 'end-turn', actorId: versant.memberId });
		const nextVersant = result.state.party.find((member) => member.memberId === versant.memberId)!;
		expect(nextVersant.momentum).toBe(expected);
		expect(result.state.activeMemberId).toBe(warrior.memberId);
	});

	it('defers start-of-turn effects until that member becomes active again', () => {
		const state = enterCombat(
			initial(['versant-mara', 'warrior-corren'], 'start-turn-effects')
		).state;
		const versant = state.party.find((member) => member.className === 'Versant')!;
		const warrior = state.party.find((member) => member.className === 'Warrior')!;
		const enemy = state.encounter!.enemies[0];
		state.activeMemberId = versant.memberId;
		state.encounter!.initiative = [
			{ actorId: versant.memberId, kind: 'member', initiative: 20 },
			{ actorId: warrior.memberId, kind: 'member', initiative: 10 }
		];
		state.encounter!.initiativeIndex = 0;
		versant.effects.tonguesBurn = 7;
		const startingHp = enemy.hp;

		const afterVersant = resolve(state, { type: 'end-turn', actorId: versant.memberId });
		expect(afterVersant.state.encounter?.enemies[0].hp).toBe(startingHp);
		expect(
			afterVersant.state.party.find((member) => member.memberId === versant.memberId)?.effects
				.tonguesBurn
		).toBe(7);
		expect(afterVersant.state.activeMemberId).toBe(warrior.memberId);

		const afterWarrior = resolve(afterVersant.state, {
			type: 'end-turn',
			actorId: warrior.memberId
		});
		expect(afterWarrior.state.encounter?.enemies[0].hp).toBe(startingHp - 7);
		expect(
			afterWarrior.state.party.find((member) => member.memberId === versant.memberId)?.effects
				.tonguesBurn
		).toBe(0);
		expect(afterWarrior.state.activeMemberId).toBe(versant.memberId);
		expect(afterWarrior.events.some((entry) => entry.text.includes('Tongues of Fire burns'))).toBe(
			true
		);
	});
});
