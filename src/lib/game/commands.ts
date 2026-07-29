import type { Direction } from './state';

export type GameCommand =
	| { type: 'move'; direction: Direction }
	| { type: 'attack' }
	| { type: 'brace' }
	| { type: 'inspect' };
