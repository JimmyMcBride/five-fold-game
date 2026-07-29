import { describe, expect, it } from 'vitest';
import { getLegalCommands, resolveCommand } from './engine';
import type { ClassName, GameState } from './model';
import { createRng } from './rng';
import { CONTENT_VERSION, createInitialState, LEGACY_CONTENT_VERSION } from './state';

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
			const first = play(seed, className, CONTENT_VERSION);
			const replay = play(seed, className, CONTENT_VERSION);
			expect(first).toEqual(replay);
			expect(first.signature, `${className} should exercise its signature feature`).toBe(true);
			expect(first.state.status, `${className} should defeat Barnabe`).toBe('victory');
		}
	});
});
