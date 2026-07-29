import { describe, expect, it } from 'vitest';
import { classifyRoll, isNaturalOne, rollStat } from './rules';
import type { RandomSource } from './rng';

function fixed(...values: number[]): RandomSource {
	return {
		int() {
			const value = values.shift();
			if (value === undefined) throw new Error('No fixed value.');
			return value;
		}
	};
}

describe('Fivefold roll bands', () => {
	it('classifies normal, hard, critical, and natural 96+ boundaries', () => {
		expect(classifyRoll(70, 70)).toBe('normal');
		expect(classifyRoll(35, 70)).toBe('hard');
		expect(classifyRoll(7, 70)).toBe('critical');
		expect(classifyRoll(96, 90)).toBe('failure');
	});

	it('uses the lower roll for advantage and the higher roll for disadvantage', () => {
		expect(rollStat(fixed(82, 12), 'heart', 70, { advantage: true }).kept).toBe(12);
		expect(rollStat(fixed(12, 82), 'heart', 70, { disadvantage: true }).kept).toBe(82);
	});

	it('only treats a kept natural 1 as a natural 1', () => {
		expect(isNaturalOne(rollStat(fixed(1, 82), 'heart', 70, { advantage: true }))).toBe(true);
		expect(isNaturalOne(rollStat(fixed(1, 82), 'heart', 70, { disadvantage: true }))).toBe(false);
	});

	it('requires the requested success band', () => {
		expect(rollStat(fixed(50), 'soul', 70, { difficulty: 'hard' }).success).toBe(false);
		expect(rollStat(fixed(30), 'soul', 70, { difficulty: 'hard' }).success).toBe(true);
		expect(rollStat(fixed(7), 'soul', 70, { difficulty: 'critical' }).success).toBe(true);
	});
});
