import type { LegalCommand } from './commands';
import { getLegalCommands } from './engine';
import type { GameEvent } from './events';
import type { EnemyState, GameState, RunSummary, Stats } from './model';
import { itemDefinition } from './content/expedition';
import { ROOM_TEMPLATES } from './content/rooms';
import { CONTENT_VERSION, V2_CONTENT_VERSION, V3_CONTENT_VERSION } from './state';

export interface PlayerProjection {
	name: string;
	className: string;
	level: number;
	experience: number;
	stats: Stats;
	maxHp: number;
	hp: number;
	temporaryHp: number;
	momentum: number;
	recoveryDice: number;
	maxRecoveryDice: number;
	gold: number;
	rank: string;
	defense: string;
	armor: string;
	equippedWeapon: string;
	inventory: string[];
}

export interface EnemyProjection {
	id: string;
	name: string;
	hp: number;
	maxHp: number;
	rank: string;
	guarded: boolean;
}

export interface RunProjection {
	runId: string;
	version: number;
	seed: string;
	contentVersion: string;
	turn: number;
	status: GameState['status'];
	phase: GameState['phase'];
	room: {
		id: string;
		name: string;
		kicker: string;
		description: string;
		visitedCount: number;
	};
	player: PlayerProjection;
	enemies: EnemyProjection[];
	decodeCount: number;
	combat: {
		maxActionPoints: number;
		actionPoints: number;
		usedActionIds: string[];
		defenseLabel: 'Block' | 'Dodge' | 'Soul';
	} | null;
	expedition: {
		inventory: {
			consumables: {
				id: string;
				name: string;
				quantity: number;
				classification: string;
				description: string;
			}[];
			questItems: { id: string; name: string; description: string }[];
			relics: {
				id: string;
				name: string;
				benefit: string;
				drawback: string;
			}[];
			reserveWeapon: string | null;
			pendingRelic: {
				id: string;
				name: string;
				benefit: string;
				drawback: string;
			} | null;
			waxCoated: boolean;
		};
		merchant: {
			name: string;
			introduction: string;
			stock: {
				id: string;
				itemId: string;
				name: string;
				description: string;
				benefit?: string;
				drawback?: string;
				classification: string;
				price: number;
				quantity: number;
				affordable: boolean;
				capacityConflict: boolean;
				soldOut: boolean;
			}[];
		} | null;
		pendingOutcome: boolean;
	} | null;
	commands: LegalCommand[];
	events: GameEvent[];
}

function projectEnemy(enemy: EnemyState): EnemyProjection {
	return {
		id: enemy.instanceId,
		name: enemy.name,
		hp: enemy.hp,
		maxHp: enemy.maxHp,
		rank: enemy.rank,
		guarded: enemy.guarded
	};
}

export function projectRun(
	state: GameState,
	version: number,
	events: GameEvent[] = []
): RunProjection {
	const room = ROOM_TEMPLATES[state.graph.nodes[state.roomId].templateId];
	const weapon =
		state.player.weapons.find((candidate) => candidate.id === state.player.equippedWeaponId) ??
		state.player.weapons[0];
	const expedition = state.expedition;
	const reserve = state.player.weapons.find(
		(candidate) => candidate.id === expedition?.inventory.reserveWeaponId
	);

	return {
		runId: state.runId,
		version,
		seed: state.seed,
		contentVersion: state.contentVersion,
		turn: state.turn,
		status: state.status,
		phase: state.phase,
		room: {
			id: room.id,
			name: room.name,
			kicker: room.kicker,
			description: room.description,
			visitedCount: state.visitedRooms.length
		},
		player: {
			name: state.player.name,
			className: state.player.className,
			level: state.player.level,
			experience: state.player.experience,
			stats: { ...state.player.stats },
			maxHp: state.player.maxHp,
			hp: state.player.hp,
			temporaryHp: state.player.temporaryHp,
			momentum: state.player.momentum,
			recoveryDice: state.player.recoveryDice,
			maxRecoveryDice: state.player.maxRecoveryDice,
			gold: state.player.gold,
			rank: state.player.rank,
			defense: state.player.defense,
			armor: state.player.armor,
			equippedWeapon: weapon.name,
			inventory: [...state.player.inventory]
		},
		enemies: state.encounter?.enemies.filter((enemy) => enemy.hp > 0).map(projectEnemy) ?? [],
		decodeCount: state.encounter?.decodeCount ?? 0,
		combat:
			state.encounter &&
			(state.contentVersion === V2_CONTENT_VERSION ||
				state.contentVersion === V3_CONTENT_VERSION ||
				state.contentVersion === CONTENT_VERSION)
				? {
						maxActionPoints: 2,
						actionPoints: state.encounter.turn.actionPoints ?? 0,
						usedActionIds: [...(state.encounter.turn.usedActionIds ?? [])],
						defenseLabel:
							state.player.defense === 'heart'
								? 'Block'
								: state.player.defense === 'reflex'
									? 'Dodge'
									: 'Soul'
					}
				: null,
		expedition: expedition
			? {
					inventory: {
						consumables: Object.entries(expedition.inventory.consumables)
							.filter(([, quantity]) => (quantity ?? 0) > 0)
							.map(([id, quantity]) => {
								const definition = itemDefinition(id as 'healing-potion' | 'blue-hive-wax');
								return {
									id,
									name: definition.name,
									quantity: quantity ?? 0,
									classification: definition.classification,
									description: definition.description
								};
							}),
						questItems: expedition.inventory.questItemIds.map((id) => {
							const definition = itemDefinition(id);
							return { id, name: definition.name, description: definition.description };
						}),
						relics: expedition.inventory.relicIds.map((id) => {
							const definition = itemDefinition(id);
							return {
								id,
								name: definition.name,
								benefit: definition.benefit ?? '',
								drawback: definition.drawback ?? ''
							};
						}),
						reserveWeapon: reserve?.name ?? null,
						pendingRelic: expedition.inventory.pendingRelicId
							? (() => {
									const definition = itemDefinition(expedition.inventory.pendingRelicId);
									return {
										id: definition.id,
										name: definition.name,
										benefit: definition.benefit ?? '',
										drawback: definition.drawback ?? ''
									};
								})()
							: null,
						waxCoated: expedition.effects.waxCoated
					},
					merchant:
						state.roomId === expedition.merchant.roomId
							? {
									name: expedition.merchant.name,
									introduction: expedition.merchant.introduction,
									stock: expedition.merchant.stock.map((stock) => {
										const definition = itemDefinition(stock.itemId);
										const capacityConflict =
											(stock.kind === 'relic' && expedition.inventory.relicIds.length >= 2) ||
											(stock.kind === 'quest' &&
												expedition.inventory.questItemIds.includes('bozman-sensor'));
										return {
											id: stock.id,
											itemId: stock.itemId,
											name: definition.name,
											description: definition.description,
											...(definition.benefit ? { benefit: definition.benefit } : {}),
											...(definition.drawback ? { drawback: definition.drawback } : {}),
											classification: definition.classification,
											price: stock.price,
											quantity: stock.quantity,
											affordable: state.player.gold >= stock.price,
											capacityConflict,
											soldOut: stock.quantity <= 0
										};
									})
								}
							: null,
					pendingOutcome: expedition.pendingOutcome !== null
				}
			: null,
		commands: getLegalCommands(state),
		events
	};
}

export function projectSummary(summary: RunSummary): RunSummary {
	return structuredClone(summary);
}
