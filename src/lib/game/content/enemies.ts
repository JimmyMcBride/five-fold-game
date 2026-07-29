import type { EnemyDefinition, EnemyState } from '../model';

export const LEGACY_ENEMIES: Record<string, EnemyDefinition> = {
	hellhornet: {
		id: 'hellhornet',
		name: 'Hellhornet',
		maxHp: 20,
		reflexModifier: 7,
		rank: 'far',
		attackName: 'Cutting Wings',
		attackRank: 'far',
		damageDice: 1,
		damageModifier: 4,
		source: 'docs/game-rules/sections/15-bestiary.md'
	},
	'scorched-raider': {
		id: 'scorched-raider',
		name: 'Scorched Raider',
		maxHp: 44,
		reflexModifier: 4,
		rank: 'near',
		attackName: 'Spear',
		attackRank: 'near',
		damageDice: 2,
		damageModifier: 5,
		source: 'docs/game-rules/sections/15-bestiary.md'
	},
	zeboul: {
		id: 'zeboul',
		name: 'Zeboul',
		maxHp: 75,
		reflexModifier: 3,
		rank: 'near',
		attackName: 'Gore',
		attackRank: 'near',
		damageDice: 2,
		damageModifier: 7,
		source: 'docs/game-rules/sections/16-st-bozmas-tomb.md'
	},
	barnabe: {
		id: 'barnabe',
		name: 'Barnabe Fearstricken',
		maxHp: 60,
		reflexModifier: 4,
		rank: 'far',
		attackName: 'Dark Far',
		attackRank: 'far',
		damageDice: 1,
		damageModifier: 5,
		source: '.plan/specs/single-player-procedural-st-bozma-roguelike.md'
	}
};

export const ENEMIES: Record<string, EnemyDefinition> = {
	...LEGACY_ENEMIES,
	hellhornet: {
		...LEGACY_ENEMIES.hellhornet,
		maxHp: 18,
		sizeRank: 1
	},
	'scorched-raider': {
		...LEGACY_ENEMIES['scorched-raider'],
		maxHp: 36,
		sizeRank: 2
	},
	zeboul: {
		...LEGACY_ENEMIES.zeboul,
		damageModifier: 9,
		sizeRank: 3
	},
	barnabe: {
		...LEGACY_ENEMIES.barnabe,
		maxHp: 75,
		sizeRank: 2,
		source: 'docs/game-rules/sections/16-st-bozmas-tomb.md'
	}
};

export function createEnemy(
	definitionId: string,
	instanceSuffix = '1',
	legacy = false
): EnemyState {
	const definition = (legacy ? LEGACY_ENEMIES : ENEMIES)[definitionId];
	if (!definition) throw new Error(`Unknown enemy definition: ${definitionId}`);

	return {
		...definition,
		instanceId: `${definitionId}-${instanceSuffix}`,
		hp: definition.maxHp,
		turnsTaken: 0,
		guarded: false,
		blinded: false,
		stunnedTurns: 0,
		silencedTurns: 0,
		damagedPlayerLastTurn: false
	};
}
