import { describe, expect, it } from 'vitest';
import type { LegalCommand } from './commands';
import { getLegalCommands, resolveCommand } from './engine';
import type { ClassName, GameState } from './model';
import { createRng } from './rng';
import {
	CONTENT_VERSION,
	createInitialState,
	LEGACY_CONTENT_VERSION,
	V2_CONTENT_VERSION
} from './state';

const signatures: Record<ClassName, string> = {
	Warrior: 'aegis-raised',
	Scout: 'sharpshooter',
	Priest: 'sacred-light',
	Magi: 'black-cloud',
	Versant: 'tongues-of-fire'
};

function play(
	seed: string,
	className: ClassName,
	contentVersion = LEGACY_CONTENT_VERSION
): { state: GameState; signature: boolean } {
	let state = createInitialState({
		seed,
		className,
		name: `${className} Reference`,
		contentVersion
	});
	const rng = createRng(`${seed}:commands`, state.rngCursor);
	let signature = false;

	for (let step = 0; step < 240 && state.status === 'active'; step += 1) {
		const legal = getLegalCommands(state);
		let selected;

		if (state.phase === 'exploration') {
			selected =
				legal.find(
					(candidate) =>
						candidate.command.type === 'patch-up' && state.player.hp < state.player.maxHp
				) ?? legal.find((candidate) => candidate.command.type === 'move');
		} else if (state.phase === 'event') {
			selected = legal.find(
				(candidate) =>
					candidate.command.type === 'choose' && candidate.command.optionId === 'offer-mercy'
			);
		} else if (state.phase === 'loot') {
			selected = legal.find(
				(candidate) =>
					candidate.command.type === 'choose' &&
					candidate.command.optionId ===
						(state.player.hp < state.player.maxHp ? 'drink-potion' : 'take-sensor')
			);
		} else if (state.phase === 'combat') {
			const signatureCommand = legal.find(
				(candidate) =>
					candidate.command.type === 'use-feature' &&
					candidate.command.featureId === signatures[className]
			);
			if (signatureCommand) {
				signature = true;
				selected = signatureCommand;
			} else {
				const preferredFeatures: Record<ClassName, string[]> = {
					Warrior: ['eye-for-an-eye'],
					Scout: ['surprise-attack'],
					Priest: ['sacred-light', 'prayer-of-healing'],
					Magi: ['bolt', 'shooting-star'],
					Versant: ['hushing-flame', 'tongues-of-fire']
				};
				selected =
					legal.find(
						(candidate) =>
							candidate.command.type === 'use-feature' &&
							preferredFeatures[className].includes(candidate.command.featureId)
					) ??
					legal.find(
						(candidate) => candidate.command.type === 'attack' && candidate.economy !== 'maneuver'
					) ??
					legal.find((candidate) => candidate.command.type === 'close-distance') ??
					legal.find((candidate) => candidate.command.type === 'end-turn');
			}
		}

		if (!selected) break;
		state = resolveCommand(state, selected.command, rng).state;
	}

	return { state, signature };
}

function playExpedition(
	seed: string,
	className: ClassName,
	riskyPath: boolean
): {
	state: GameState;
	signature: boolean;
	searched: boolean;
	ambush: boolean;
	purchased: boolean;
	usedItem: boolean;
	relic: boolean;
} {
	let state = createInitialState({
		seed,
		className,
		name: `${className} Expedition`,
		contentVersion: CONTENT_VERSION
	});
	const rng = createRng(`${seed}:commands`, state.rngCursor);
	let signature = false;
	let searched = false;
	let ambush = false;
	let purchased = false;
	let usedItem = false;
	let relic = false;

	for (let step = 0; step < 500 && state.status === 'active'; step += 1) {
		const legal = getLegalCommands(state);
		let selected;
		if (state.phase === 'exploration') {
			const riskyRoomId = state.graph.middleTemplateIds[2];
			selected =
				legal.find(
					(candidate) =>
						candidate.command.type === 'buy' && candidate.command.stockId === 'stock:blue-hive-wax'
				) ??
				legal.find((candidate) => candidate.command.type === 'use-item') ??
				legal.find((candidate) => candidate.command.type === 'search') ??
				legal.find(
					(candidate) =>
						candidate.command.type === 'patch-up' && state.player.hp < state.player.maxHp
				) ??
				(riskyPath
					? legal.find((candidate) => movesToRoom(state, candidate, riskyRoomId))
					: undefined) ??
				legal.find((candidate) => candidate.command.type === 'move');
		} else if (state.phase === 'combat') {
			const signatureCommand = legal.find(
				(candidate) =>
					candidate.command.type === 'use-feature' &&
					candidate.command.featureId === signatures[className]
			);
			if (signatureCommand) {
				signature = true;
				selected = signatureCommand;
			} else {
				selected =
					legal.find(
						(candidate) =>
							candidate.command.type === 'use-feature' &&
							[
								'eye-for-an-eye',
								'surprise-attack',
								'sacred-light',
								'prayer-of-healing',
								'bolt',
								'shooting-star',
								'black-cloud',
								'hushing-flame',
								'tongues-of-fire'
							].includes(candidate.command.featureId)
					) ??
					legal.find(
						(candidate) => candidate.command.type === 'attack' && candidate.economy !== 'maneuver'
					) ??
					legal.find((candidate) => candidate.command.type === 'close-distance') ??
					legal.find((candidate) => candidate.command.type === 'end-turn');
			}
		}

		if (!selected) break;
		if (selected.command.type === 'search') searched = true;
		if (selected.command.type === 'buy') purchased = true;
		if (selected.command.type === 'use-item') usedItem = true;
		const resolution = resolveCommand(state, selected.command, rng);
		if (
			resolution.events.some(
				(entry) => entry.kind === 'ambush-triggered' && entry.tone === 'danger'
			)
		) {
			ambush = true;
		}
		state = resolution.state;
		if ((state.expedition?.inventory.relicIds.length ?? 0) > 0) relic = true;
	}

	return { state, signature, searched, ambush, purchased, usedItem, relic };
}

function movesToRoom(state: GameState, candidate: LegalCommand, roomId: string): boolean {
	if (candidate.command.type !== 'move') return false;
	const exitId = candidate.command.exitId;
	return state.graph.nodes[state.roomId].exits.some(
		(exit) => exit.id === exitId && exit.to === roomId
	);
}

describe('curated deterministic reference run', () => {
	it('lets all five templates complete the same seed with a signature feature', () => {
		const seed = 'reference-100756';
		const turns: number[] = [];

		for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant'] as const) {
			const result = play(seed, className);
			expect(result.state.status, `${className} should defeat Barnabe`).toBe('victory');
			expect(result.signature, `${className} should exercise its signature feature`).toBe(true);
			turns.push(result.state.turn);
		}

		expect(turns).toEqual([34, 36, 50, 24, 31]);
	});

	it('replays all five v2 templates deterministically through a curated combat smoke', () => {
		const expectedSeeds = {
			Warrior: 'v2-Warrior-3',
			Scout: 'v2-Scout-0',
			Priest: 'v2-Priest-424',
			Magi: 'v2-Magi-2',
			Versant: 'v2-Versant-0'
		};
		for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant'] as const) {
			const seed = expectedSeeds[className];
			const first = play(seed, className, V2_CONTENT_VERSION);
			const replay = play(seed, className, V2_CONTENT_VERSION);
			expect(first).toEqual(replay);
			expect(first.signature, `${className} should exercise its signature feature`).toBe(true);
			expect(first.state.status, `${className} should defeat Barnabe`).toBe('victory');
		}
	});

	it('replays five v3 expeditions through search, economy, relic/ambush, items, and finale', () => {
		const fixtures = {
			Warrior: { seed: 'v3-Warrior-39', risky: true },
			Scout: { seed: 'v3-Scout-22', risky: true },
			Priest: { seed: 'v3-Priest-182', risky: false },
			Magi: { seed: 'v3-Magi-54', risky: true },
			Versant: { seed: 'v3-Versant-11', risky: true }
		};
		const results = [];

		for (const className of ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant'] as const) {
			const fixture = fixtures[className];
			const first = playExpedition(fixture.seed, className, fixture.risky);
			const replay = playExpedition(fixture.seed, className, fixture.risky);
			expect(first).toEqual(replay);
			expect(JSON.stringify(first)).toBe(JSON.stringify(replay));
			expect(first.state.status, `${className} should defeat Barnabe`).toBe('victory');
			expect(first.signature, `${className} should exercise its signature feature`).toBe(true);
			expect(first.searched).toBe(true);
			expect(first.purchased).toBe(true);
			expect(first.usedItem).toBe(true);
			results.push(first);
		}

		expect(results.some((result) => result.ambush)).toBe(true);
		expect(results.some((result) => result.relic)).toBe(true);
	});
});
