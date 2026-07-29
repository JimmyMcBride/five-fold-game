export interface RandomSnapshot {
	seed: number;
	cursor: number;
}

export interface RandomSource {
	int(min: number, max: number): number;
	snapshot?(): RandomSnapshot;
}

function hashSeed(seed: string): number {
	let value = 2166136261;

	for (const character of seed) {
		value ^= character.charCodeAt(0);
		value = Math.imul(value, 16777619);
	}

	return value >>> 0;
}

export function createRng(seed: string | number, initialCursor = 0): RandomSource {
	const baseSeed = typeof seed === 'number' ? seed >>> 0 : hashSeed(seed);
	let cursor = initialCursor;

	return {
		int(min, max) {
			if (!Number.isInteger(min) || !Number.isInteger(max) || max < min) {
				throw new RangeError('RNG bounds must be ordered integers.');
			}

			cursor += 1;
			let value = (baseSeed + Math.imul(cursor, 0x6d2b79f5)) >>> 0;
			value = Math.imul(value ^ (value >>> 15), value | 1);
			value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
			const unit = ((value ^ (value >>> 14)) >>> 0) / 4294967296;

			return Math.floor(unit * (max - min + 1)) + min;
		},
		snapshot() {
			return { seed: baseSeed, cursor };
		}
	};
}
