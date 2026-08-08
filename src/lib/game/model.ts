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
export type DungeonRole = 'combat' | 'interaction' | 'treasure' | 'merchant' | 'finale';
export type ItemClassification = 'canonical' | 'adaptation';
export type ConsumableId = 'healing-potion' | 'blue-hive-wax';
export type QuestItemId = 'bozman-sensor';
export type RelicId =
	'hushglass-rosary' | 'pilgrims-red-thread' | 'raiders-counterweight' | 'grave-tappers-bell';

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
	role?: DungeonRole;
	interactionIds?: string[];
	merchantId?: string;
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
	momentum?: number;
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
	kind: 'normal' | 'ambush' | 'finale';
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

export interface PartyMemberState extends Omit<PlayerState, 'gold'> {
	memberId: string;
	templateId: string;
	down: boolean;
	downCount: number;
	reserveWeaponId: string | null;
}

export interface InitiativeEntry {
	actorId: string;
	kind: 'member' | 'enemy';
	initiative: number;
}

export interface PartyEncounterState extends Omit<EncounterState, 'turn'> {
	initiative: InitiativeEntry[];
	initiativeIndex: number;
	round: number;
	memberTurns: Record<string, CombatTurnState>;
}

export interface RunFlags {
	manessaTurned: boolean;
	bozmanSensor: boolean;
	tombMercyAttempted: boolean;
}

export interface InteractionReward {
	goldDice?: number;
	consumableId?: ConsumableId;
	questItemId?: QuestItemId;
	relicId?: RelicId;
	notableTreasure?: string;
}

export interface ExpeditionInteractionState {
	id: string;
	roomId: string;
	kind: 'search' | 'item-gate';
	label: string;
	prompt: string;
	warning: string;
	stat?: StatName;
	difficulty?: Difficulty;
	requiredQuestItemId?: QuestItemId;
	successReward: InteractionReward;
	ambushEnemyIds?: string[];
	source: string;
	classification: ItemClassification;
}

export interface MerchantStockState {
	id: string;
	itemId: ConsumableId | QuestItemId | RelicId;
	kind: 'consumable' | 'quest' | 'relic';
	price: number;
	quantity: number;
}

export interface MerchantState {
	id: string;
	roomId: string;
	name: string;
	introduction: string;
	source: string;
	classification: ItemClassification;
	stock: MerchantStockState[];
}

export interface ExpeditionInventoryState {
	consumables: Partial<Record<ConsumableId, number>>;
	reserveWeaponId: string | null;
	questItemIds: QuestItemId[];
	relicIds: RelicId[];
	pendingRelicId: RelicId | null;
	notableTreasure: string[];
}

export interface ExpeditionEffectsState {
	waxCoated: boolean;
	hushglassUsed: boolean;
	redThreadUsed: boolean;
	redThreadDefenseAdvantage: boolean;
	counterweightUsed: boolean;
}

export interface PendingRoomOutcome {
	interactionId: string;
	roomId: string;
	kind: 'ambush';
	goldReward: number;
}

export interface ExpeditionState {
	interactions: Record<string, ExpeditionInteractionState>;
	resolvedInteractionIds: string[];
	pendingOutcome: PendingRoomOutcome | null;
	merchant: MerchantState;
	inventory: ExpeditionInventoryState;
	effects: ExpeditionEffectsState;
	normalVictories: number;
	goldFound: number;
	goldSpent: number;
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
	expedition?: ExpeditionState;
}

export interface PartyGameState {
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
	party: PartyMemberState[];
	activeMemberId: string | null;
	leaderMemberId: string;
	gold: number;
	encounter: PartyEncounterState | null;
	patchUpAvailable: boolean;
	flags: RunFlags;
	expedition: ExpeditionState;
}

export type AnyGameState = GameState | PartyGameState;

export function isPartyGameState(state: AnyGameState): state is PartyGameState {
	return 'party' in state;
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
	goldFound?: number;
	goldSpent?: number;
	relicsCarried?: string[];
	notableTreasure?: string[];
	partySize?: number;
	partyMembers?: {
		memberId: string;
		templateId: string;
		name: string;
		className: ClassName;
		level: number;
		downCount: number;
	}[];
	defeatCause?: string;
}
