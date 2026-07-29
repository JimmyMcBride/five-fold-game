export type Direction = 'north' | 'east' | 'south' | 'west';
export type RoomId = 'threshold' | 'ossuary';
export type GamePhase = 'exploration' | 'combat' | 'defeat';

export interface PlayerState {
	name: string;
	className: string;
	level: number;
	experience: number;
	maxHp: number;
	hp: number;
	reflex: number;
	gold: number;
	braced: boolean;
	inventory: string[];
}

export interface EnemyState {
	id: string;
	name: string;
	maxHp: number;
	hp: number;
}

export interface GameState {
	runId: string;
	turn: number;
	phase: GamePhase;
	roomId: RoomId;
	visitedRooms: RoomId[];
	defeatedEncounters: string[];
	player: PlayerState;
	enemy: EnemyState | null;
}

export function createInitialState(): GameState {
	return {
		runId: 'local-bozma-001',
		turn: 0,
		phase: 'exploration',
		roomId: 'threshold',
		visitedRooms: ['threshold'],
		defeatedEncounters: [],
		player: {
			name: 'Mara Vey',
			className: 'Versant',
			level: 1,
			experience: 0,
			maxHp: 20,
			hp: 20,
			reflex: 58,
			gold: 7,
			braced: false,
			inventory: ['Ashwood torch', 'Notched knife']
		},
		enemy: null
	};
}
