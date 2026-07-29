import { describe, expect, it } from 'vitest';
import { createRng } from './rng';

describe('createRng', () => {
	it('replays the same sequence for the same seed', () => {
		const first = createRng('fivefold');
		const second = createRng('fivefold');

		expect([first.int(1, 100), first.int(1, 100), first.int(1, 10)]).toEqual([
			second.int(1, 100),
			second.int(1, 100),
			second.int(1, 10)
		]);
	});

	it('rejects invalid bounds', () => {
		const rng = createRng(1);

		expect(() => rng.int(4, 3)).toThrow(RangeError);
	});
});
