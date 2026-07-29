import { describe, expect, it } from 'vitest';
import { getLegalCommands, resolveCommand } from './engine';
import type { ClassName, GameState } from './model';
import { createRng } from './rng';
import { createInitialState } from './state';

const signatures: Record<ClassName, string> = {
	Warrior: 'aegis-raised',
	Scout: 'sharpshooter',
	Priest: 'sacred-light',
	Magi: 'black-cloud',
	Versant: 'tongues-of-fire'
};

function play(seed: string, className: ClassName): { state: GameState; signature: boolean } {
	let state = createInitialState({ seed, className, name: `${className} Reference` });
	const rng = createRng(`${seed}:commands`);
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
					legal.find((candidate) => candidate.command.type === 'attack') ??
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
});
