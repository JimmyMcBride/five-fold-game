export const STAT_NAMES = ['heart', 'reflex', 'soul', 'mind', 'voice'] as const;
export type StatName = (typeof STAT_NAMES)[number];
export type Stats = Record<StatName, number>;

export const CLASS_NAMES = ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant'] as const;
export type ClassName = (typeof CLASS_NAMES)[number];

export type Rank = 'near' | 'far';
export type DefenseStat = 'heart' | 'reflex' | 'soul';
export type ArmorKind = 'cloth' | 'light' | 'heavy';
export type Economy = 'action' | 'ability' | 'maneuver';
export type GamePhase = 'exploration' | 'event' | 'loot' | 'combat' | 'victory' | 'defeat';
export type RunStatus = 'active' | 'victory' | 'death' | 'objective-failure';
export type Difficulty = 'normal' | 'hard' | 'critical';
export type RollBand = 'failure' | 'normal' | 'hard' | 'critical';

export interface RollResult {
	stat: StatName;
	statValue: number;
	rolls: number[];
	kept: number;
	band: RollBand;
	difficulty: Difficulty;
	success: boolean;
}

export interface Weapon {
	id: string;
	name: string;
	stat: StatName;
	rank: Rank;
	momentum: number;
	damageDice: number;
	damageBonus: 'half-modifier' | 'modifier';
}

export interface ClassFeature {
	id: string;
	name: string;
	economy: Economy;
	description: string;
}

export interface ClassKit {
	id: Lowercase<ClassName>;
	name: ClassName;
	primaryStat: StatName;
	stats: Stats;
	originPerk: string;
	armor: ArmorKind;
	weapons: Weapon[];
	features: ClassFeature[];
	passives: string[];
	deferredFeatures: string[];
}

export interface RoomTemplate {
	id: string;
	name: string;
	kicker: string;
	description: string;
	source: string;
}

export interface RoomExit {
	id: string;
	label: string;
	to: string;
}

export interface RoomNode {
	id: string;
	templateId: string;
	exits: RoomExit[];
	kind: 'entry' | 'normal-combat' | 'quiet' | 'event' | 'loot' | 'finale';
	encounterDefinitionId?: string;
}

export interface RoomGraph {
	entryId: string;
	finaleId: string;
	nodes: Record<string, RoomNode>;
	middleTemplateIds: string[];
}

export interface EnemyDefinition {
	id: string;
	name: string;
	maxHp: number;
	sizeRank?: number;
	reflexModifier: number;
	rank: Rank;
	attackName: string;
	attackRank: Rank;
	damageDice: number;
	damageModifier: number;
	source: string;
}

export interface EnemyState extends EnemyDefinition {
	instanceId: string;
	hp: number;
	turnsTaken: number;
	guarded: boolean;
	blinded: boolean;
	stunnedTurns: number;
	silencedTurns: number;
	damagedPlayerLastTurn: boolean;
}

export interface CombatTurnState {
	round: number;
	playerTurnsCompleted: number;
	actionUsed: boolean;
	abilityUsed: boolean;
	maneuverAvailable: boolean;
	actionPoints?: number;
	usedActionIds?: string[];
}

export interface EncounterState {
	id: string;
	kind: 'normal' | 'finale';
	enemies: EnemyState[];
	turn: CombatTurnState;
	decodeCount: number;
}

export interface PlayerEffects {
	braced: boolean;
	hidden: boolean;
	guidance: number;
	guidanceExpiresAfterTurn: number | null;
	bless: number;
	blessExpiresAfterTurn: number | null;
	sharpshooterTurns: number;
	aegisExpiresAfterTurn: number | null;
	sacredMotes: number;
	shootingStarSuccesses: number;
	shootingStarTargetId: string | null;
	shootingStarExpiresAfterTurn: number | null;
	tonguesBurn: number;
}

export interface PlayerState {
	name: string;
	className: ClassName;
	level: number;
	experience: number;
	stats: Stats;
	maxHp: number;
	hp: number;
	temporaryHp: number;
	momentum: number;
	maxRecoveryDice: number;
	recoveryDice: number;
	gold: number;
	rank: Rank;
	defense: DefenseStat;
	armor: ArmorKind;
	weapons: Weapon[];
	equippedWeaponId: string;
	inventory: string[];
	usedFeatures: string[];
	healthRolls?: number[];
	effects: PlayerEffects;
}

export interface RunFlags {
	manessaTurned: boolean;
	bozmanSensor: boolean;
	tombMercyAttempted: boolean;
}

export interface GameState {
	runId: string;
	seed: string;
	contentVersion: string;
	rngCursor: number;
	turn: number;
	status: RunStatus;
	phase: GamePhase;
	roomId: string;
	graph: RoomGraph;
	visitedRooms: string[];
	resolvedRooms: string[];
	defeatedEncounters: string[];
	player: PlayerState;
	encounter: EncounterState | null;
	patchUpAvailable: boolean;
	flags: RunFlags;
}

export interface RunSummary {
	runId: string;
	characterName: string;
	className: ClassName;
	seed: string;
	outcome: Exclude<RunStatus, 'active'>;
	roomsVisited: number;
	enemiesDefeated: number;
	levelReached: number;
	notableLoot: string[];
}
