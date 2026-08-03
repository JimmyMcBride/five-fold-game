import type {
	ConsumableId,
	ExpeditionInteractionState,
	ExpeditionState,
	ItemClassification,
	MerchantStockState,
	QuestItemId,
	RelicId,
	RoomGraph
} from '../model';
import { createRng } from '../rng';

const RULES_ITEMS_SOURCE = 'docs/game-rules/sections/13-items-gold-and-gear.md';
const BOZMA_SOURCE = 'docs/game-rules/sections/16-st-bozmas-tomb.md';
const EXPEDITION_SPEC = 'https://github.com/JimmyMcBride/five-fold-game/issues/9';

export interface ItemDefinition {
	id: ConsumableId | QuestItemId | RelicId;
	name: string;
	kind: 'consumable' | 'quest' | 'relic';
	classification: ItemClassification;
	source: string;
	description: string;
	benefit?: string;
	drawback?: string;
}

export const ITEM_DEFINITIONS: Record<ConsumableId | QuestItemId, ItemDefinition> = {
	'healing-potion': {
		id: 'healing-potion',
		name: 'Healing Potion',
		kind: 'consumable',
		classification: 'canonical',
		source: RULES_ITEMS_SOURCE,
		description: 'Restore health as if Patching Up without spending a Recovery Die.'
	},
	'blue-hive-wax': {
		id: 'blue-hive-wax',
		name: 'Blue Hive Wax',
		kind: 'consumable',
		classification: 'adaptation',
		source: EXPEDITION_SPEC,
		description: 'Coat the equipped weapon; its next successful hit gains 1d10 Poison.'
	},
	'bozman-sensor': {
		id: 'bozman-sensor',
		name: 'Bozman Sensor',
		kind: 'quest',
		classification: 'canonical',
		source: BOZMA_SOURCE,
		description: 'A red-smoked light that opens and protects authored St. Bozma routes.'
	}
};

export const RELIC_DEFINITIONS: Record<RelicId, ItemDefinition> = {
	'hushglass-rosary': {
		id: 'hushglass-rosary',
		name: 'Hushglass Rosary',
		kind: 'relic',
		classification: 'adaptation',
		source: EXPEDITION_SPEC,
		description: 'Silence bought with diminished spoils.',
		benefit: 'First noisy failed search suppresses its ambush.',
		drawback: 'Successful-search gold is halved, rounded down.'
	},
	'pilgrims-red-thread': {
		id: 'pilgrims-red-thread',
		name: "Pilgrim's Red Thread",
		kind: 'relic',
		classification: 'adaptation',
		source: EXPEDITION_SPEC,
		description: 'A quick retreat leaves pressure behind.',
		benefit: 'First voluntary rank switch each combat grants advantage on next defense.',
		drawback: 'Each hostile gains 1 momentum when it triggers.'
	},
	'raiders-counterweight': {
		id: 'raiders-counterweight',
		name: "Raider's Counterweight",
		kind: 'relic',
		classification: 'adaptation',
		source: EXPEDITION_SPEC,
		description: 'Committed force rewards success and punishes failure.',
		benefit: 'First successful Shove each combat grants 1 momentum.',
		drawback: 'Failed Shove deals positive Heart Modifier damage, minimum 1.'
	},
	'grave-tappers-bell': {
		id: 'grave-tappers-bell',
		name: "Grave-Tapper's Bell",
		kind: 'relic',
		classification: 'adaptation',
		source: EXPEDITION_SPEC,
		description: 'Clearer searches make louder mistakes.',
		benefit: 'Search rolls have advantage.',
		drawback: 'Noisy failure adds one eligible hostile.'
	}
};

export const RELIC_IDS = Object.keys(RELIC_DEFINITIONS) as RelicId[];

export function itemDefinition(id: ConsumableId | QuestItemId | RelicId): ItemDefinition {
	return id in RELIC_DEFINITIONS
		? RELIC_DEFINITIONS[id as RelicId]
		: ITEM_DEFINITIONS[id as ConsumableId | QuestItemId];
}

export function decorateExpeditionGraph(graph: RoomGraph): RoomGraph {
	const next = structuredClone(graph);
	const [firstCombat, firstTreasure, riskyRoom, secondCombat, merchantRoom, supplyRoom] =
		next.middleTemplateIds;

	next.nodes[next.entryId].role = 'interaction';
	next.nodes[next.entryId].interactionIds = [`search:${next.entryId}:snowbank`];
	next.nodes[firstCombat].role = 'combat';
	next.nodes[firstTreasure].role = 'treasure';
	next.nodes[firstTreasure].interactionIds = [`search:${firstTreasure}:cache`];
	next.nodes[riskyRoom].role = 'interaction';
	next.nodes[riskyRoom].interactionIds = [`search:${riskyRoom}:echoing-cache`];
	next.nodes[secondCombat].role = 'combat';
	next.nodes[merchantRoom].role = 'merchant';
	next.nodes[merchantRoom].merchantId = 'shrine-quartermaster';
	next.nodes[supplyRoom].role = 'treasure';
	next.nodes[supplyRoom].interactionIds = [
		`search:${supplyRoom}:monastic-supplies`,
		`item-gate:${supplyRoom}:sensor-route`
	];
	next.nodes[next.finaleId].role = 'finale';
	return next;
}

export function createExpeditionState(seed: string, graph: RoomGraph): ExpeditionState {
	const rng = createRng(`${seed}:expedition`);
	const [, firstTreasure, riskyRoom, , merchantRoom, supplyRoom] = graph.middleTemplateIds;
	const relicId = RELIC_IDS[rng.int(0, RELIC_IDS.length - 1)];
	const ambushPool = ['hellhornet', 'scorched-raider', 'zeboul'];
	const firstAmbush = ambushPool[rng.int(0, ambushPool.length - 1)];
	let extraAmbush = ambushPool[rng.int(0, ambushPool.length - 1)];
	if (extraAmbush === firstAmbush) {
		extraAmbush = ambushPool[(ambushPool.indexOf(firstAmbush) + 1) % ambushPool.length];
	}
	const wildcardPool = [
		{ itemId: 'healing-potion', kind: 'consumable', price: 50 },
		{ itemId: 'blue-hive-wax', kind: 'consumable', price: 20 },
		{ itemId: 'bozman-sensor', kind: 'quest', price: 30 }
	] as const;
	const wildcard = wildcardPool[rng.int(0, wildcardPool.length - 1)];

	const interactions: ExpeditionInteractionState[] = [
		{
			id: `search:${graph.entryId}:snowbank`,
			roomId: graph.entryId,
			kind: 'search',
			label: 'Scout the collapsed snowbank',
			prompt: 'Trace the broken trail beneath the monastery hill.',
			warning: 'Wind has hidden both tracks and unstable ground.',
			stat: 'mind',
			difficulty: 'normal',
			successReward: { goldDice: 1 },
			source: BOZMA_SOURCE,
			classification: 'canonical'
		},
		{
			id: `search:${firstTreasure}:cache`,
			roomId: firstTreasure,
			kind: 'search',
			label: 'Search the abandoned cache',
			prompt: 'Sort intact shrine stores from raider spoil.',
			warning: 'The room is quiet, but time spent searching leaves you exposed.',
			stat: 'mind',
			difficulty: 'normal',
			successReward: { goldDice: 4, notableTreasure: 'Incorruptible Prayer Book' },
			source: BOZMA_SOURCE,
			classification: 'canonical'
		},
		{
			id: `search:${riskyRoom}:echoing-cache`,
			roomId: riskyRoom,
			kind: 'search',
			label: 'Disturb the echoing cache',
			prompt: 'Work through metal and glass without waking the lower halls.',
			warning: 'Noise here may draw an ambush.',
			stat: 'reflex',
			difficulty: 'hard',
			successReward: { relicId },
			ambushEnemyIds: [firstAmbush, extraAmbush],
			source: EXPEDITION_SPEC,
			classification: 'adaptation'
		},
		{
			id: `search:${supplyRoom}:monastic-supplies`,
			roomId: supplyRoom,
			kind: 'search',
			label: 'Search the monastic supplies',
			prompt: 'Check the dead monks’ sealed satchels.',
			warning: 'The supplies are exposed but appear undisturbed.',
			stat: 'mind',
			difficulty: 'normal',
			successReward: { consumableId: 'healing-potion' },
			source: BOZMA_SOURCE,
			classification: 'canonical'
		},
		{
			id: `item-gate:${supplyRoom}:sensor-route`,
			roomId: supplyRoom,
			kind: 'item-gate',
			label: 'Light the Bozman Sensor',
			prompt: 'Seat the smoking handle in the saint-marked lock.',
			warning: 'Requires a Bozman Sensor; the lit route avoids the trapped approach.',
			requiredQuestItemId: 'bozman-sensor',
			successReward: { goldDice: 1, notableTreasure: 'Sensor-lit shortcut' },
			source: BOZMA_SOURCE,
			classification: 'canonical'
		}
	];

	const stock: MerchantStockState[] = [
		{
			id: 'stock:healing-potion',
			itemId: 'healing-potion' as const,
			kind: 'consumable' as const,
			price: 50,
			quantity: 1
		},
		{
			id: 'stock:blue-hive-wax',
			itemId: 'blue-hive-wax' as const,
			kind: 'consumable' as const,
			price: 20,
			quantity: 1
		},
		{
			id: `stock:wildcard:${wildcard.itemId}`,
			itemId: wildcard.itemId,
			kind: wildcard.kind,
			price: wildcard.price,
			quantity: 1
		}
	];
	if (rng.int(1, 100) <= 15) {
		const merchantRelic = RELIC_IDS[rng.int(0, RELIC_IDS.length - 1)];
		stock.push({
			id: `stock:${merchantRelic}`,
			itemId: merchantRelic,
			kind: 'relic',
			price: 40,
			quantity: 1
		});
	}

	return {
		interactions: Object.fromEntries(
			interactions.map((interaction) => [interaction.id, interaction])
		),
		resolvedInteractionIds: [],
		pendingOutcome: null,
		merchant: {
			id: 'shrine-quartermaster',
			roomId: merchantRoom,
			name: 'Sister Caldrin, Shrine Quartermaster',
			introduction:
				'A wounded quartermaster has barred a safe vestry and offers the stores she saved.',
			source: EXPEDITION_SPEC,
			classification: 'adaptation',
			stock
		},
		inventory: {
			consumables: {},
			reserveWeaponId: null,
			questItemIds: [],
			relicIds: [],
			pendingRelicId: null,
			notableTreasure: []
		},
		effects: {
			waxCoated: false,
			hushglassUsed: false,
			redThreadUsed: false,
			redThreadDefenseAdvantage: false,
			counterweightUsed: false
		},
		normalVictories: 0,
		goldFound: 0,
		goldSpent: 0
	};
}
