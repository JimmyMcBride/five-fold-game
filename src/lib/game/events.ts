export type EventTone = 'neutral' | 'command' | 'danger' | 'success';

export type GameEventKind =
	| 'room-entered'
	| 'passage-blocked'
	| 'inspection'
	| 'encounter-started'
	| 'attack-resolved'
	| 'damage-taken'
	| 'braced'
	| 'enemy-defeated'
	| 'loot-found'
	| 'level-gained';

export interface GameEvent {
	kind: GameEventKind;
	text: string;
	tone: EventTone;
	turn: number;
}
