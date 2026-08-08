import type { DefenseStat } from './model';

export type GameCommand =
	| { type: 'move'; exitId: string; actorId?: string }
	| { type: 'inspect'; actorId?: string }
	| { type: 'attack'; targetId: string; economy?: 'action' | 'maneuver'; actorId?: string }
	| { type: 'shove'; targetId: string; economy: 'action' | 'maneuver'; actorId?: string }
	| { type: 'use-feature'; featureId: string; targetId?: string; actorId?: string }
	| { type: 'shift-rank'; economy?: 'action' | 'maneuver'; actorId?: string }
	| { type: 'close-distance'; actorId?: string }
	| { type: 'set-defense'; stat: DefenseStat; actorId?: string }
	| { type: 'patch-up'; targetId?: string; actorId?: string }
	| { type: 'choose'; optionId: string; actorId?: string }
	| { type: 'search'; interactionId: string; actorId?: string }
	| { type: 'buy'; stockId: string; actorId?: string }
	| {
			type: 'use-item';
			itemId: 'healing-potion' | 'blue-hive-wax';
			targetId?: string;
			actorId?: string;
	  }
	| { type: 'equip'; weaponId: string; actorId?: string }
	| {
			type: 'replace-relic';
			incomingRelicId: string;
			outgoingRelicId: string;
			stockId?: string;
			actorId?: string;
	  }
	| { type: 'set-leader'; memberId: string; actorId?: string }
	| { type: 'end-turn'; actorId?: string };

export interface LegalCommand {
	id: string;
	label: string;
	detail: string;
	command: GameCommand;
	economy?: 'action' | 'ability' | 'maneuver';
	warning?: string;
	actorId?: string;
	targetKind?: 'self' | 'ally' | 'enemy';
}
