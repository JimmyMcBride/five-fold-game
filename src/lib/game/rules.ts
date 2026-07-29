import type { Difficulty, RollBand, RollResult, StatName } from './model';
import type { RandomSource } from './rng';

export function modifier(value: number): number {
	return Math.floor(value / 10);
}

export function classifyRoll(value: number, statValue: number): RollBand {
	if (value >= 96) return 'failure';
	if (value <= modifier(statValue)) return 'critical';
	if (value <= Math.floor(statValue / 2)) return 'hard';
	if (value <= statValue) return 'normal';
	return 'failure';
}

function meetsDifficulty(band: RollBand, difficulty: Difficulty): boolean {
	if (band === 'failure') return false;
	if (difficulty === 'normal') return true;
	if (difficulty === 'hard') return band === 'hard' || band === 'critical';
	return band === 'critical';
}

export interface RollOptions {
	difficulty?: Difficulty;
	adjustment?: number;
	advantage?: boolean;
	disadvantage?: boolean;
}

export function isNaturalOne(roll: RollResult): boolean {
	return roll.kept === 1 && roll.rolls.includes(1);
}

export function rollStat(
	rng: RandomSource,
	stat: StatName,
	statValue: number,
	options: RollOptions = {}
): RollResult {
	const rollCount = options.advantage || options.disadvantage ? 2 : 1;
	const rolls = Array.from({ length: rollCount }, () => rng.int(1, 100));
	const naturalKept = options.advantage
		? Math.min(...rolls)
		: options.disadvantage
			? Math.max(...rolls)
			: rolls[0];
	const kept = Math.max(1, Math.min(100, naturalKept + (options.adjustment ?? 0)));
	const band = naturalKept >= 96 ? 'failure' : classifyRoll(kept, statValue);
	const difficulty = options.difficulty ?? 'normal';

	return {
		stat,
		statValue,
		rolls,
		kept,
		band,
		difficulty,
		success: meetsDifficulty(band, difficulty)
	};
}

export function rollDice(rng: RandomSource, count: number, sides = 10): number {
	let total = 0;
	for (let index = 0; index < count; index += 1) total += rng.int(1, sides);
	return total;
}
