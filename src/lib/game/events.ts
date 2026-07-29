import type { RollResult } from './model';

export type EventTone = 'neutral' | 'command' | 'danger' | 'success';

export type GameEventKind =
	| 'command-rejected'
	| 'room-entered'
	| 'inspection'
	| 'encounter-started'
	| 'initiative-resolved'
	| 'rank-shifted'
	| 'defense-selected'
	| 'roll-resolved'
	| 'attack-resolved'
	| 'feature-resolved'
	| 'damage-taken'
	| 'temporary-health'
	| 'healed'
	| 'enemy-defeated'
	| 'combat-ended'
	| 'loot-found'
	| 'choice-resolved'
	| 'patched-up'
	| 'experience-gained'
	| 'level-gained'
	| 'decode-advanced'
	| 'turn-ended'
	| 'run-ended';

export interface GameEvent {
	kind: GameEventKind;
	text: string;
	tone: EventTone;
	turn: number;
	roll?: RollResult;
}
