import type { DefenseStat } from './model';

export type GameCommand =
	| { type: 'move'; exitId: string }
	| { type: 'inspect' }
	| { type: 'attack'; targetId: string; economy?: 'action' | 'maneuver' }
	| { type: 'shove'; targetId: string; economy: 'action' | 'maneuver' }
	| { type: 'use-feature'; featureId: string; targetId?: string }
	| { type: 'shift-rank'; economy?: 'action' | 'maneuver' }
	| { type: 'close-distance' }
	| { type: 'set-defense'; stat: DefenseStat }
	| { type: 'patch-up' }
	| { type: 'choose'; optionId: string }
	| { type: 'search'; interactionId: string }
	| { type: 'buy'; stockId: string }
	| { type: 'use-item'; itemId: 'healing-potion' | 'blue-hive-wax' }
	| { type: 'equip'; weaponId: string }
	| { type: 'replace-relic'; incomingRelicId: string; outgoingRelicId: string; stockId?: string }
	| { type: 'end-turn' };

export interface LegalCommand {
	id: string;
	label: string;
	detail: string;
	command: GameCommand;
	economy?: 'action' | 'ability' | 'maneuver';
	warning?: string;
}
