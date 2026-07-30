import { describe, expect, it } from 'vitest';
import type { GameCommand } from './commands';
import { createEnemy } from './content/enemies';
import { getLegalCommands, resolveCommand } from './engine';
import { projectRun } from './projection';
import type { GameState } from './model';
import type { RandomSource } from './rng';
import { CONTENT_VERSION, createInitialState, decodeGameState, summarizeRun } from './state';

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

function expeditionState(
	seed = 'expedition-tests',
	className: GameState['player']['className'] = 'Warrior'
) {
	return createInitialState({ seed, className, contentVersion: CONTENT_VERSION });
}

function roomForInteraction(state: GameState, fragment: string): string {
	const interaction = Object.values(state.expedition?.interactions ?? {}).find((entry) =>
		entry.id.includes(fragment)
	);
	if (!interaction) throw new Error(`Missing ${fragment} interaction.`);
	state.roomId = interaction.roomId;
	state.phase = 'exploration';
	return interaction.id;
}

function legal<T extends GameCommand['type']>(
	state: GameState,
	type: T
): Extract<GameCommand, { type: T }> {
	const found = getLegalCommands(state).find((entry) => entry.command.type === type)?.command;
	if (!found || found.type !== type) throw new Error(`Missing ${type} command.`);
	return found as Extract<GameCommand, { type: T }>;
}

function combatState(className: GameState['player']['className'] = 'Warrior'): GameState {
	const state = expeditionState(`v3-combat-${className}`, className);
	state.phase = 'combat';
	state.encounter = {
		id: 'v3-test',
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

describe('st-bozma-expedition-v3', () => {
	it('generates deterministic eight-room guarantees across a seed matrix', () => {
		const wildcardItems = new Set<string>();
		for (let index = 0; index < 100; index += 1) {
			const seed = `matrix-${index}`;
			const first = expeditionState(seed);
			const replay = expeditionState(seed);
			const nodes = Object.values(first.graph.nodes);
			const merchant = nodes.filter((node) => node.role === 'merchant');

			expect(first).toEqual(replay);
			expect(nodes).toHaveLength(8);
			expect(nodes.filter((node) => node.role === 'combat')).toHaveLength(2);
			expect(nodes.filter((node) => node.role === 'finale')).toHaveLength(1);
			expect(merchant).toHaveLength(1);
			expect(first.graph.middleTemplateIds.indexOf(merchant[0].id)).toBe(4);
			expect(
				nodes.every(
					(node) =>
						node.role === 'combat' ||
						node.role === 'finale' ||
						node.role === 'merchant' ||
						(node.interactionIds?.length ?? 0) > 0
				)
			).toBe(true);
			expect(
				Object.values(first.expedition?.interactions ?? {}).some(
					(interaction) => (interaction.ambushEnemyIds?.length ?? 0) > 0
				)
			).toBe(true);
			expect(
				Object.values(first.expedition?.interactions ?? {}).some(
					(interaction) => interaction.requiredQuestItemId === 'bozman-sensor'
				)
			).toBe(true);
			expect(first.expedition?.merchant.stock.map((stock) => stock.itemId)).toEqual(
				expect.arrayContaining(['healing-potion', 'blue-hive-wax'])
			);
			expect(
				first.expedition?.merchant.stock.find((stock) => stock.itemId === 'blue-hive-wax')?.price
			).toBe(20);
			wildcardItems.add(first.expedition?.merchant.stock[2].itemId ?? '');
		}
		expect(wildcardItems.size).toBeGreaterThan(1);
	});

	it('decodes complete v3 state and rejects missing expedition state', () => {
		const state = expeditionState();
		expect(decodeGameState(state)).toBe(state);
		const incomplete = structuredClone(state);
		delete incomplete.expedition;
		expect(() => decodeGameState(incomplete)).toThrow('Invalid v3 snapshot');
	});

	it('resolves searches once across success, ordinary failure, and noisy ambush resume', () => {
		let success = expeditionState('search-success');
		const successId = roomForInteraction(success, 'echoing-cache');
		success = resolveCommand(
			success,
			{ type: 'search', interactionId: successId },
			sequenceRng(20)
		).state;
		expect(success.expedition?.resolvedInteractionIds).toContain(successId);
		expect(success.expedition?.inventory.relicIds).toHaveLength(1);
		expect(getLegalCommands(success).some((entry) => entry.id === successId)).toBe(false);

		let ordinary = expeditionState('search-ordinary');
		const ordinaryId = roomForInteraction(ordinary, 'echoing-cache');
		const ordinaryResult = resolveCommand(
			ordinary,
			{ type: 'search', interactionId: ordinaryId },
			sequenceRng(60)
		);
		ordinary = ordinaryResult.state;
		expect(ordinary.encounter).toBeNull();
		expect(ordinary.expedition?.resolvedInteractionIds).toContain(ordinaryId);
		expect(ordinaryResult.events.some((entry) => entry.kind === 'ambush-triggered')).toBe(false);

		let noisy = expeditionState('search-noisy');
		const noisyId = roomForInteraction(noisy, 'echoing-cache');
		noisy = resolveCommand(
			noisy,
			{ type: 'search', interactionId: noisyId },
			sequenceRng(96, 10, 1)
		).state;
		expect(noisy.phase).toBe('combat');
		expect(noisy.encounter?.kind).toBe('ambush');
		expect(noisy.expedition?.pendingOutcome?.roomId).toBe(noisy.roomId);
		expect(decodeGameState(structuredClone(noisy))).toEqual(noisy);

		const terminal = structuredClone(noisy);
		terminal.player.hp = 1;
		const interrupted = resolveCommand(terminal, { type: 'end-turn' }, sequenceRng(99, 10, 10, 10));
		expect(interrupted.state.status).toBe('death');
		expect(interrupted.state.expedition?.pendingOutcome).not.toBeNull();

		if (!noisy.encounter) throw new Error('Expected ambush.');
		noisy.encounter.enemies[0].hp = 1;
		noisy.encounter.enemies[0].rank = 'near';
		noisy.player.rank = 'near';
		const experience = noisy.player.experience;
		noisy = resolveCommand(noisy, legal(noisy, 'attack'), sequenceRng(1)).state;
		expect(noisy.phase).toBe('exploration');
		expect(noisy.expedition?.pendingOutcome).toBeNull();
		expect(noisy.player.experience).toBe(experience);
		expect(noisy.player.gold).toBe(5);
		expect(getLegalCommands(noisy).some((entry) => entry.id === noisyId)).toBe(false);
	});

	it('applies Hushglass and Grave-Tapper search clauses', () => {
		for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant'] as const) {
			let hushglass = expeditionState(`hushglass-${className}`, className);
			hushglass.expedition?.inventory.relicIds.push('hushglass-rosary');
			const hushglassId = roomForInteraction(hushglass, 'echoing-cache');
			hushglass = resolveCommand(
				hushglass,
				{ type: 'search', interactionId: hushglassId },
				sequenceRng(96)
			).state;
			expect(hushglass.encounter).toBeNull();
			expect(hushglass.expedition?.effects.hushglassUsed).toBe(true);

			let hushglassGold = expeditionState(`hushglass-gold-${className}`, className);
			hushglassGold.expedition?.inventory.relicIds.push('hushglass-rosary');
			const goldId = roomForInteraction(hushglassGold, 'snowbank');
			hushglassGold = resolveCommand(
				hushglassGold,
				{ type: 'search', interactionId: goldId },
				sequenceRng(1, 9)
			).state;
			expect(hushglassGold.player.gold).toBe(4);

			let bellBenefit = expeditionState(`bell-benefit-${className}`, className);
			bellBenefit.expedition?.inventory.relicIds.push('grave-tappers-bell');
			const bellBenefitId = roomForInteraction(bellBenefit, 'echoing-cache');
			bellBenefit = resolveCommand(
				bellBenefit,
				{ type: 'search', interactionId: bellBenefitId },
				sequenceRng(99, 1)
			).state;
			expect(bellBenefit.encounter).toBeNull();
			expect(bellBenefit.expedition?.inventory.relicIds.length).toBeGreaterThan(1);

			let bellCost = expeditionState(`bell-cost-${className}`, className);
			bellCost.expedition?.inventory.relicIds.push('grave-tappers-bell');
			const bellCostId = roomForInteraction(bellCost, 'echoing-cache');
			bellCost = resolveCommand(
				bellCost,
				{ type: 'search', interactionId: bellCostId },
				sequenceRng(96, 99, 10, 1, 1)
			).state;
			expect(bellCost.encounter?.enemies).toHaveLength(2);
		}
	});

	it('keeps merchant stock stable and purchases atomic', () => {
		const state = expeditionState('merchant');
		if (!state.expedition) throw new Error('Expected expedition.');
		state.roomId = state.expedition.merchant.roomId;
		state.player.gold = 20;
		const before = structuredClone(state);
		const wax = getLegalCommands(state).find(
			(entry) => entry.command.type === 'buy' && entry.command.stockId === 'stock:blue-hive-wax'
		)?.command;
		if (!wax || wax.type !== 'buy') throw new Error('Expected wax purchase.');
		const purchased = resolveCommand(state, wax, sequenceRng());
		expect(purchased.state.player.gold).toBe(0);
		expect(purchased.state.expedition?.goldSpent).toBe(20);
		expect(purchased.state.expedition?.inventory.consumables['blue-hive-wax']).toBe(1);
		expect(
			purchased.state.expedition?.merchant.stock.find((stock) => stock.id === 'stock:blue-hive-wax')
				?.quantity
		).toBe(0);
		expect(state).toEqual(before);

		const rng = sequenceRng(1);
		const rejected = resolveCommand(state, { type: 'buy', stockId: 'stock:healing-potion' }, rng);
		expect(rejected.state).toBe(state);
		expect(rejected.events[0].kind).toBe('command-rejected');
		expect(rng.snapshot?.().cursor).toBe(0);
	});

	it('uses Healing Potion AP, Blue Hive Wax, and irreversible relic replacement', () => {
		let healing = combatState();
		if (!healing.expedition) throw new Error('Expected expedition.');
		healing.player.hp -= 20;
		healing.expedition.inventory.consumables['healing-potion'] = 1;
		healing = resolveCommand(healing, legal(healing, 'use-item'), sequenceRng(5)).state;
		expect(healing.encounter?.turn.actionPoints).toBe(1);
		expect(healing.encounter?.turn.usedActionIds).toContain('item:healing-potion');
		expect(healing.expedition!.inventory.consumables['healing-potion']).toBe(0);

		let wax = expeditionState('wax');
		if (!wax.expedition) throw new Error('Expected expedition.');
		wax.expedition.inventory.consumables['blue-hive-wax'] = 1;
		wax = resolveCommand(wax, { type: 'use-item', itemId: 'blue-hive-wax' }, sequenceRng()).state;
		expect(wax.expedition!.effects.waxCoated).toBe(true);
		wax.phase = 'combat';
		wax.encounter = combatState().encounter;
		if (!wax.encounter) throw new Error('Expected encounter.');
		const before = wax.encounter.enemies[0].hp;
		wax = resolveCommand(wax, legal(wax, 'attack'), sequenceRng(50, 5, 7)).state;
		expect(wax.expedition!.effects.waxCoated).toBe(false);
		expect(wax.encounter?.enemies[0].hp).toBeLessThan(before);

		let replacement = expeditionState('replacement');
		if (!replacement.expedition) throw new Error('Expected expedition.');
		replacement.expedition.inventory.relicIds = ['hushglass-rosary', 'pilgrims-red-thread'];
		replacement.expedition.inventory.pendingRelicId = 'grave-tappers-bell';
		replacement = resolveCommand(
			replacement,
			{
				type: 'replace-relic',
				incomingRelicId: 'grave-tappers-bell',
				outgoingRelicId: 'hushglass-rosary'
			},
			sequenceRng()
		).state;
		expect(replacement.expedition!.inventory.relicIds).toEqual([
			'grave-tappers-bell',
			'pilgrims-red-thread'
		]);
		expect(replacement.expedition!.inventory.pendingRelicId).toBeNull();
	});

	it('applies rank and Shove relic bargains for every class', () => {
		for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant'] as const) {
			let thread = combatState(className);
			if (!thread.expedition || !thread.encounter) throw new Error('Expected expedition combat.');
			thread.expedition.inventory.relicIds.push('pilgrims-red-thread');
			thread = resolveCommand(thread, legal(thread, 'shift-rank'), sequenceRng()).state;
			expect(thread.expedition!.effects.redThreadDefenseAdvantage).toBe(true);
			expect(thread.encounter?.enemies[0].momentum).toBe(1);

			let counterweightBenefit = combatState(className);
			if (!counterweightBenefit.expedition) throw new Error('Expected expedition.');
			counterweightBenefit.expedition.inventory.relicIds.push('raiders-counterweight');
			counterweightBenefit = resolveCommand(
				counterweightBenefit,
				legal(counterweightBenefit, 'shove'),
				sequenceRng(9)
			).state;
			expect(counterweightBenefit.player.momentum).toBe(1);
			expect(counterweightBenefit.expedition!.effects.counterweightUsed).toBe(true);

			let counterweightCost = combatState(className);
			if (!counterweightCost.expedition) throw new Error('Expected expedition.');
			counterweightCost.expedition.inventory.relicIds.push('raiders-counterweight');
			const before = counterweightCost.player.hp;
			counterweightCost = resolveCommand(
				counterweightCost,
				legal(counterweightCost, 'shove'),
				sequenceRng(90)
			).state;
			expect(counterweightCost.player.hp).toBeLessThan(before);
		}
	});

	it('projects no hidden reward or ambush composition and adds only v3 summary totals', () => {
		const state = expeditionState('projection');
		const projection = projectRun(state, 0);
		const serialized = JSON.stringify(projection);
		expect(serialized).not.toContain('successReward');
		expect(serialized).not.toContain('ambushEnemyIds');
		expect(serialized).not.toContain('"goldDice"');
		expect(projection.expedition).not.toBeNull();

		state.status = 'victory';
		state.phase = 'victory';
		if (!state.expedition) throw new Error('Expected expedition.');
		state.expedition.goldFound = 25;
		state.expedition.goldSpent = 20;
		state.expedition.inventory.relicIds = ['hushglass-rosary'];
		const summary = summarizeRun(state);
		expect(summary).toMatchObject({
			goldFound: 25,
			goldSpent: 20,
			relicsCarried: ['Hushglass Rosary']
		});
	});
});
