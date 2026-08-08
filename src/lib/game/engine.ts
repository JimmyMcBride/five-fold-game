import type { GameCommand, LegalCommand } from './commands';
import { getClassKit } from './content/classes';
import { createEnemy } from './content/enemies';
import { itemDefinition, RELIC_DEFINITIONS } from './content/expedition';
import { ROOM_TEMPLATES } from './content/rooms';
import type { GameEvent } from './events';
import type {
	CombatTurnState,
	DefenseStat,
	Economy,
	EnemyState,
	EncounterState,
	ExpeditionInteractionState,
	GameState,
	RelicId,
	RollResult,
	StatName,
	Weapon
} from './model';
import type { RandomSource } from './rng';
import { isNaturalOne, modifier, rollDice, rollStat } from './rules';
import {
	CONTENT_VERSION,
	LEGACY_CONTENT_VERSION,
	SUPPORTED_CONTENT_VERSIONS,
	V2_CONTENT_VERSION,
	V3_CONTENT_VERSION
} from './state';

export interface CommandResolution {
	state: GameState;
	events: GameEvent[];
}

function event(
	state: GameState,
	kind: GameEvent['kind'],
	text: string,
	tone: GameEvent['tone'] = 'neutral',
	roll?: RollResult
): GameEvent {
	return { kind, text, tone, turn: state.turn, ...(roll ? { roll } : {}) };
}

function cloneState(state: GameState): GameState {
	return structuredClone(state);
}

function activeEnemies(state: GameState): EnemyState[] {
	return state.encounter?.enemies.filter((enemy) => enemy.hp > 0) ?? [];
}

function isV2(state: GameState): boolean {
	return (
		state.contentVersion === V2_CONTENT_VERSION ||
		state.contentVersion === V3_CONTENT_VERSION ||
		state.contentVersion === CONTENT_VERSION
	);
}

function isExpedition(state: GameState): boolean {
	return state.contentVersion === V3_CONTENT_VERSION || state.contentVersion === CONTENT_VERSION;
}

function isV4(state: GameState): boolean {
	return state.contentVersion === CONTENT_VERSION;
}

function hasSupportedContentVersion(state: GameState): boolean {
	return (SUPPORTED_CONTENT_VERSIONS as readonly string[]).includes(state.contentVersion);
}

function hasValidContentState(state: GameState): boolean {
	if (!hasSupportedContentVersion(state)) return false;
	if (!isV2(state)) return true;
	if (!Array.isArray(state.player.healthRolls)) return false;
	if (isExpedition(state) && !state.expedition) return false;
	if (!state.encounter) return true;
	return (
		Number.isInteger(state.encounter.turn.actionPoints) &&
		Array.isArray(state.encounter.turn.usedActionIds)
	);
}

function targetableEnemies(state: GameState): EnemyState[] {
	const enemies = activeEnemies(state);
	if (isV2(state)) return enemies;
	const guardedBarnabe = enemies.some((enemy) => enemy.id === 'barnabe' && enemy.guarded);
	if (!guardedBarnabe) return enemies;
	return enemies.filter((enemy) => enemy.id !== 'barnabe');
}

function weaponTargets(state: GameState): EnemyState[] {
	const weapon = equippedWeapon(state);
	return targetableEnemies(state).filter(
		(enemy) => weapon.rank === 'far' || (state.player.rank === 'near' && enemy.rank === 'near')
	);
}

function equippedWeapon(state: GameState): Weapon {
	return (
		state.player.weapons.find((weapon) => weapon.id === state.player.equippedWeaponId) ??
		state.player.weapons[0]
	);
}

function economyAvailable(turn: CombatTurnState, economy: Economy, actionId?: string): boolean {
	if (turn.actionPoints !== undefined && economy !== 'maneuver') {
		return turn.actionPoints > 0 && !(actionId && turn.usedActionIds?.includes(actionId));
	}
	if (economy === 'action') return !turn.actionUsed;
	if (economy === 'ability') return !turn.abilityUsed;
	return turn.maneuverAvailable;
}

function roomOptions(state: GameState): LegalCommand[] {
	if (state.phase === 'event') {
		return [
			{
				id: 'choice:offer-mercy',
				label: 'Offer Manessa another way',
				detail: 'Hard Soul. Success removes Barnabe’s Raider.',
				command: { type: 'choose', optionId: 'offer-mercy' }
			},
			{
				id: 'choice:read-sigil',
				label: 'Read the blood-mark',
				detail: 'Hard Mind. Success uncovers a Bozman Sensor.',
				command: { type: 'choose', optionId: 'read-sigil' }
			}
		];
	}

	return [
		{
			id: 'choice:take-sensor',
			label: 'Take the Bozman Sensor',
			detail: 'A reliable light and notable run relic.',
			command: { type: 'choose', optionId: 'take-sensor' }
		},
		{
			id: 'choice:drink-potion',
			label: 'Drink the Healing Potion',
			detail: 'Recover as if Patching Up without spending a Recovery Die.',
			command: { type: 'choose', optionId: 'drink-potion' }
		},
		{
			id: 'choice:take-scroll',
			label: 'Take the Tier 1 scroll',
			detail: 'Claim a class-compatible run relic.',
			command: { type: 'choose', optionId: 'take-scroll' }
		}
	];
}

function hasRelic(state: GameState, relicId: RelicId): boolean {
	return state.expedition?.inventory.relicIds.includes(relicId) ?? false;
}

function canAcquireStock(state: GameState, stockId: string): boolean {
	const expedition = state.expedition;
	const stock = expedition?.merchant.stock.find((entry) => entry.id === stockId);
	if (!expedition || !stock || stock.quantity <= 0 || state.player.gold < stock.price) return false;
	if (stock.kind === 'quest') {
		return !expedition.inventory.questItemIds.includes(stock.itemId as 'bozman-sensor');
	}
	if (stock.kind === 'relic') return expedition.inventory.relicIds.length < 2;
	return true;
}

function expeditionCommands(state: GameState): LegalCommand[] {
	const expedition = state.expedition;
	if (!isExpedition(state) || !expedition || state.phase !== 'exploration') return [];
	const node = state.graph.nodes[state.roomId];
	const commands: LegalCommand[] = [];

	for (const interactionId of node.interactionIds ?? []) {
		if (expedition.resolvedInteractionIds.includes(interactionId)) continue;
		const interaction = expedition.interactions[interactionId];
		if (!interaction) continue;
		if (
			interaction.requiredQuestItemId &&
			!expedition.inventory.questItemIds.includes(interaction.requiredQuestItemId)
		) {
			continue;
		}
		commands.push({
			id: interaction.id,
			label: interaction.label,
			detail: [
				interaction.prompt,
				interaction.stat
					? `${capitalize(interaction.stat)} // ${capitalize(interaction.difficulty ?? 'normal')}`
					: ''
			]
				.filter(Boolean)
				.join(' '),
			warning: interaction.warning,
			command: { type: 'search', interactionId: interaction.id }
		});
	}

	if (node.merchantId === expedition.merchant.id) {
		for (const stock of expedition.merchant.stock) {
			if (canAcquireStock(state, stock.id)) {
				commands.push({
					id: `buy:${stock.id}`,
					label: `Buy ${itemDefinition(stock.itemId).name}`,
					detail: `${stock.price}gp // ${stock.quantity} remaining`,
					command: { type: 'buy', stockId: stock.id }
				});
			}
			if (
				stock.kind === 'relic' &&
				stock.quantity > 0 &&
				state.player.gold >= stock.price &&
				expedition.inventory.relicIds.length >= 2
			) {
				for (const outgoingRelicId of expedition.inventory.relicIds) {
					commands.push({
						id: `replace:${stock.id}:${outgoingRelicId}`,
						label: `Replace ${RELIC_DEFINITIONS[outgoingRelicId].name}`,
						detail: `Destroy it and buy ${itemDefinition(stock.itemId).name} for ${stock.price}gp.`,
						command: {
							type: 'replace-relic',
							incomingRelicId: stock.itemId,
							outgoingRelicId,
							stockId: stock.id
						}
					});
				}
			}
		}
	}

	if (expedition.inventory.pendingRelicId) {
		for (const outgoingRelicId of expedition.inventory.relicIds) {
			commands.push({
				id: `replace:pending:${outgoingRelicId}`,
				label: `Replace ${RELIC_DEFINITIONS[outgoingRelicId].name}`,
				detail: `Destroy it and take ${RELIC_DEFINITIONS[expedition.inventory.pendingRelicId].name}.`,
				command: {
					type: 'replace-relic',
					incomingRelicId: expedition.inventory.pendingRelicId,
					outgoingRelicId
				}
			});
		}
	}

	const healingPotions = expedition.inventory.consumables['healing-potion'] ?? 0;
	if (healingPotions > 0 && state.player.hp < state.player.maxHp) {
		commands.push({
			id: 'use:healing-potion',
			label: 'Use Healing Potion',
			detail: `Restore health as if Patching Up. ${healingPotions} carried.`,
			command: { type: 'use-item', itemId: 'healing-potion' }
		});
	}
	const wax = expedition.inventory.consumables['blue-hive-wax'] ?? 0;
	if (wax > 0 && !expedition.effects.waxCoated) {
		commands.push({
			id: 'use:blue-hive-wax',
			label: 'Apply Blue Hive Wax',
			detail: `Next successful weapon hit gains 1d10 Poison. ${wax} carried.`,
			command: { type: 'use-item', itemId: 'blue-hive-wax' }
		});
	}
	if (
		expedition.inventory.reserveWeaponId &&
		expedition.inventory.reserveWeaponId !== state.player.equippedWeaponId
	) {
		const reserve = state.player.weapons.find(
			(weapon) => weapon.id === expedition.inventory.reserveWeaponId
		);
		if (reserve) {
			commands.push({
				id: `equip:${reserve.id}`,
				label: `Equip ${reserve.name}`,
				detail: 'Swap equipped and reserve weapons outside combat.',
				command: { type: 'equip', weaponId: reserve.id }
			});
		}
	}
	return commands;
}

export function getLegalCommands(state: GameState): LegalCommand[] {
	const inspect: LegalCommand = {
		id: 'inspect',
		label: 'Inspect',
		detail: 'Read the current room or threat.',
		command: { type: 'inspect' }
	};

	if (state.status !== 'active' || !hasValidContentState(state)) return [];

	if (state.phase === 'event' || state.phase === 'loot') {
		return [inspect, ...roomOptions(state)];
	}

	if (state.phase === 'exploration') {
		const commands = [
			inspect,
			...expeditionCommands(state),
			...state.graph.nodes[state.roomId].exits.map((exit): LegalCommand => ({
				id: `move:${exit.id}`,
				label: exit.label,
				detail: `Move to ${ROOM_TEMPLATES[exit.to].name}.`,
				command: { type: 'move', exitId: exit.id }
			}))
		];

		if (
			state.patchUpAvailable &&
			state.player.recoveryDice > 0 &&
			state.player.hp < state.player.maxHp
		) {
			commands.push({
				id: 'patch-up',
				label: 'Patch Up',
				detail: 'Spend one Recovery Die after combat.',
				command: { type: 'patch-up' }
			});
		}

		return commands;
	}

	if (state.phase !== 'combat' || !state.encounter) return [inspect];

	const commands: LegalCommand[] = [inspect];
	const turn = state.encounter.turn;
	const weapon = equippedWeapon(state);
	const reserve = state.player.weapons.find(
		(candidate) => candidate.id === state.expedition?.inventory.reserveWeaponId
	);

	if (isV4(state) && reserve && economyAvailable(turn, 'action', 'equip')) {
		commands.push({
			id: `equip:${reserve.id}`,
			label: `Equip ${reserve.name}`,
			detail: 'Action // Spend 1 AP to swap equipped and reserve weapons.',
			command: { type: 'equip', weaponId: reserve.id },
			economy: 'action'
		});
	}

	if (
		isExpedition(state) &&
		(state.expedition?.inventory.consumables['healing-potion'] ?? 0) > 0 &&
		state.player.hp < state.player.maxHp &&
		economyAvailable(turn, 'action', 'item:healing-potion')
	) {
		commands.push({
			id: 'use:healing-potion',
			label: 'Use Healing Potion',
			detail: 'Action // Restore health as if Patching Up.',
			command: { type: 'use-item', itemId: 'healing-potion' },
			economy: 'action'
		});
	}

	for (const stat of allowedDefenses(state)) {
		commands.push({
			id: `defense:${stat}`,
			label:
				isV2(state) && stat === 'heart'
					? 'Block with Heart'
					: isV2(state) && stat === 'reflex'
						? 'Dodge with Reflex'
						: `Defend with ${capitalize(stat)}`,
			detail: defenseDetail(state, stat),
			command: { type: 'set-defense', stat }
		});
	}

	if (economyAvailable(turn, 'action', `weapon:${weapon.id}`)) {
		for (const enemy of weaponTargets(state)) {
			commands.push({
				id: `attack:${enemy.instanceId}`,
				label: `Attack ${enemy.name}`,
				detail: `${weapon.name} // ${capitalize(weapon.stat)} // ${capitalize(weapon.rank)}`,
				command: {
					type: 'attack',
					targetId: enemy.instanceId,
					...(isV2(state) ? { economy: 'action' as const } : {})
				},
				economy: 'action'
			});
		}
	}

	if (economyAvailable(turn, 'action', 'shift-rank')) {
		commands.push({
			id: 'shift-rank',
			label: `Shift to ${state.player.rank === 'near' ? 'Far' : 'Near'}`,
			detail: 'Spend your Action to switch ranks.',
			command: {
				type: 'shift-rank',
				...(isV2(state) ? { economy: 'action' as const } : {})
			},
			economy: 'action'
		});
	}

	if (
		isV2(state) &&
		activeEnemies(state).length > 0 &&
		!activeEnemies(state).some((enemy) => enemy.rank === 'near')
	) {
		commands.push({
			id: 'close-distance',
			label: 'Close distance',
			detail: 'With no hostile holding Near, draw the enemy line Near for no AP.',
			command: { type: 'close-distance' }
		});
	}

	if (isV2(state) && state.player.rank === 'near') {
		for (const enemy of activeEnemies(state).filter(
			(candidate) => candidate.rank === 'near' && (candidate.sizeRank ?? 2) <= 5
		)) {
			if (economyAvailable(turn, 'action', 'shove')) {
				commands.push({
					id: `shove:action:${enemy.instanceId}`,
					label: `Shove ${enemy.name}`,
					detail: `Roll Heart. Success pushes the target from Near to Far.${enemy.sizeRank && enemy.sizeRank >= 3 ? ' Hard roll: Size 3+.' : ''}`,
					command: { type: 'shove', targetId: enemy.instanceId, economy: 'action' },
					economy: 'action'
				});
			}
			if (turn.maneuverAvailable) {
				commands.push({
					id: `shove:maneuver:${enemy.instanceId}`,
					label: `Shove ${enemy.name}`,
					detail: `Roll Heart. Success pushes the target from Near to Far.${enemy.sizeRank && enemy.sizeRank >= 3 ? ' Hard roll: Size 3+.' : ''}`,
					command: { type: 'shove', targetId: enemy.instanceId, economy: 'maneuver' },
					economy: 'maneuver'
				});
			}
		}
	}

	const kit = getClassKit(state.player.className);
	for (const feature of kit.features) {
		if (!economyAvailable(turn, feature.economy, `feature:${feature.id}`)) continue;
		if (state.player.usedFeatures.includes(feature.id)) continue;
		if (feature.id === 'sacred-light' && state.player.effects.sacredMotes > 0) continue;
		const offensive = [
			'threatening-strike',
			'eye-for-an-eye',
			'surprise-attack',
			'bolt',
			'shooting-star',
			'black-cloud',
			'hushing-flame',
			'tongues-of-fire'
		].includes(feature.id);
		const weaponFeature = ['threatening-strike', 'eye-for-an-eye', 'surprise-attack'].includes(
			feature.id
		);
		const targets = offensive
			? weaponFeature
				? weaponTargets(state)
				: targetableEnemies(state)
			: [undefined];

		for (const target of targets) {
			commands.push({
				id: `feature:${feature.id}${target ? `:${target.instanceId}` : ''}`,
				label: feature.name,
				detail: feature.description,
				command: {
					type: 'use-feature',
					featureId: feature.id,
					...(target ? { targetId: target.instanceId } : {})
				},
				economy: feature.economy
			});
		}
	}

	if (turn.maneuverAvailable) {
		if (isV2(state)) {
			for (const enemy of weaponTargets(state)) {
				commands.push({
					id: `attack:maneuver:${enemy.instanceId}`,
					label: `Maneuver attack ${enemy.name}`,
					detail: `${weapon.name} // ${capitalize(weapon.stat)} // ${capitalize(weapon.rank)}`,
					command: {
						type: 'attack',
						targetId: enemy.instanceId,
						economy: 'maneuver'
					},
					economy: 'maneuver'
				});
			}
			commands.push({
				id: 'shift-rank:maneuver',
				label: `Maneuver to ${state.player.rank === 'near' ? 'Far' : 'Near'}`,
				detail: 'Use the basic maneuver to switch ranks without AP.',
				command: { type: 'shift-rank', economy: 'maneuver' },
				economy: 'maneuver'
			});
		}
		commands.push({
			id: 'feature:brace',
			label: 'Brace',
			detail: 'Use the basic maneuver to gain advantage on the next defensive roll.',
			command: { type: 'use-feature', featureId: 'brace' },
			economy: 'maneuver'
		});
	}

	commands.push({
		id: 'end-turn',
		label: 'End turn',
		detail: 'Yield to the tomb’s hostiles.',
		command: { type: 'end-turn' }
	});

	return commands;
}

function commandKey(command: GameCommand): string {
	switch (command.type) {
		case 'move':
			return JSON.stringify([command.type, command.exitId]);
		case 'inspect':
		case 'close-distance':
		case 'patch-up':
		case 'end-turn':
			return command.type;
		case 'search':
			return JSON.stringify([command.type, command.interactionId]);
		case 'buy':
			return JSON.stringify([command.type, command.stockId]);
		case 'use-item':
			return JSON.stringify([command.type, command.itemId]);
		case 'equip':
			return JSON.stringify([command.type, command.weaponId]);
		case 'replace-relic':
			return JSON.stringify([
				command.type,
				command.incomingRelicId,
				command.outgoingRelicId,
				command.stockId ?? null
			]);
		case 'shift-rank':
			return JSON.stringify([command.type, command.economy ?? null]);
		case 'attack':
			return JSON.stringify([command.type, command.targetId, command.economy ?? null]);
		case 'shove':
			return JSON.stringify([command.type, command.targetId, command.economy]);
		case 'use-feature':
			return JSON.stringify([command.type, command.featureId, command.targetId ?? null]);
		case 'set-defense':
			return JSON.stringify([command.type, command.stat]);
		case 'choose':
			return JSON.stringify([command.type, command.optionId]);
		case 'set-leader':
			return JSON.stringify([command.type, command.memberId]);
	}
}

function targetsEnemy(command: GameCommand): boolean {
	return (
		command.type === 'attack' ||
		command.type === 'shove' ||
		(command.type === 'use-feature' && command.targetId !== undefined)
	);
}

function normalizeCommand(state: GameState, command: GameCommand): GameCommand {
	if (!isV2(state)) return command;
	if (command.type === 'attack' && command.economy === undefined) {
		return { ...command, economy: 'action' };
	}
	if (command.type === 'shift-rank' && command.economy === undefined) {
		return { ...command, economy: 'action' };
	}
	return command;
}

function allowedDefenses(state: GameState): DefenseStat[] {
	return state.player.className === 'Priest' ? ['heart', 'reflex', 'soul'] : ['heart', 'reflex'];
}

function defenseDetail(state: GameState, stat: DefenseStat): string {
	if (!isV2(state)) {
		if (stat === 'heart') return 'Reduce damage on a success; negate it on a critical.';
		return 'Avoid the attack on a success.';
	}
	if (stat === 'heart')
		return 'Block: reduce damage by Heart Modifier; a critical avoids all and counterattacks.';
	if (stat === 'reflex')
		return 'Dodge: avoid damage; hard and critical successes also gain momentum.';
	return 'Avoid the attack on a success.';
}

function capitalize(value: string): string {
	return value.charAt(0).toUpperCase() + value.slice(1);
}

function addMomentum(state: GameState, amount: number): void {
	if (!state.encounter || amount <= 0) return;
	state.player.momentum += amount;
	if (state.player.momentum >= 10) {
		state.player.momentum = 0;
		state.encounter.turn.maneuverAvailable = true;
	}
}

function trackQualifyingRoll(state: GameState, roll: RollResult): void {
	if (roll.band !== 'hard' && roll.band !== 'critical') return;
	if (state.player.className === 'Magi') addMomentum(state, 2);
	if (state.player.effects.shootingStarExpiresAfterTurn !== null) {
		state.player.effects.shootingStarSuccesses += 1;
	}
}

function consumeEconomy(state: GameState, economy: Economy, actionId?: string): void {
	if (!state.encounter) return;
	if (state.encounter.turn.actionPoints !== undefined && economy !== 'maneuver') {
		state.encounter.turn.actionPoints = Math.max(0, state.encounter.turn.actionPoints - 1);
		if (actionId && !state.encounter.turn.usedActionIds?.includes(actionId)) {
			state.encounter.turn.usedActionIds = [
				...(state.encounter.turn.usedActionIds ?? []),
				actionId
			];
		}
		return;
	}
	if (economy === 'action') state.encounter.turn.actionUsed = true;
	if (economy === 'ability') state.encounter.turn.abilityUsed = true;
	if (economy === 'maneuver') state.encounter.turn.maneuverAvailable = false;
}

function addGold(state: GameState, amount: number, events: GameEvent[], reason: string): void {
	if (!state.expedition || amount <= 0) return;
	state.player.gold += amount;
	state.expedition.goldFound += amount;
	events.push(event(state, 'gold-changed', `${reason}: ${amount}gp gained.`, 'success'));
}

function addConsumable(
	state: GameState,
	itemId: 'healing-potion' | 'blue-hive-wax',
	events: GameEvent[]
): void {
	if (!state.expedition) return;
	state.expedition.inventory.consumables[itemId] =
		(state.expedition.inventory.consumables[itemId] ?? 0) + 1;
	events.push(
		event(state, 'item-acquired', `${itemDefinition(itemId).name} added to inventory.`, 'success')
	);
}

function addQuestItem(state: GameState, events: GameEvent[]): void {
	if (!state.expedition) return;
	if (!state.expedition.inventory.questItemIds.includes('bozman-sensor')) {
		state.expedition.inventory.questItemIds.push('bozman-sensor');
		state.flags.bozmanSensor = true;
		events.push(event(state, 'item-acquired', 'Bozman Sensor secured.', 'success'));
	}
}

function addRelic(state: GameState, relicId: RelicId, events: GameEvent[]): void {
	if (!state.expedition) return;
	const definition = RELIC_DEFINITIONS[relicId];
	if (state.expedition.inventory.relicIds.length < 2) {
		state.expedition.inventory.relicIds.push(relicId);
		events.push(
			event(
				state,
				'item-acquired',
				`${definition.name} bound. Benefit: ${definition.benefit} Cost: ${definition.drawback}`,
				'command'
			)
		);
		return;
	}
	state.expedition.inventory.pendingRelicId = relicId;
	events.push(
		event(
			state,
			'item-acquired',
			`${definition.name} awaits replacement. Benefit: ${definition.benefit} Cost: ${definition.drawback}`,
			'command'
		)
	);
}

function grantInteractionReward(
	state: GameState,
	interaction: ExpeditionInteractionState,
	rng: RandomSource,
	events: GameEvent[]
): void {
	if (!state.expedition) return;
	const reward = interaction.successReward;
	if (reward.goldDice) {
		let gold = rollDice(rng, reward.goldDice);
		if (hasRelic(state, 'hushglass-rosary')) gold = Math.floor(gold / 2);
		addGold(state, gold, events, 'Search reward');
	}
	if (reward.consumableId) addConsumable(state, reward.consumableId, events);
	if (reward.questItemId) addQuestItem(state, events);
	if (reward.relicId) addRelic(state, reward.relicId, events);
	if (
		reward.notableTreasure &&
		!state.expedition.inventory.notableTreasure.includes(reward.notableTreasure)
	) {
		state.expedition.inventory.notableTreasure.push(reward.notableTreasure);
		events.push(
			event(
				state,
				'loot-found',
				`${reward.notableTreasure} recorded as notable treasure.`,
				'success'
			)
		);
	}
}

function resolveSearch(
	state: GameState,
	interactionId: string,
	rng: RandomSource,
	events: GameEvent[]
): void {
	const expedition = state.expedition;
	const interaction = expedition?.interactions[interactionId];
	if (!expedition || !interaction) return;
	expedition.resolvedInteractionIds.push(interactionId);

	if (interaction.kind === 'item-gate') {
		events.push(
			event(
				state,
				'search-resolved',
				`${interaction.label}: the quest item opens a safer alternate outcome.`,
				'success'
			)
		);
		grantInteractionReward(state, interaction, rng, events);
		return;
	}

	const roll = rollStat(
		rng,
		interaction.stat ?? 'mind',
		state.player.stats[interaction.stat ?? 'mind'],
		{
			difficulty: interaction.difficulty,
			advantage: hasRelic(state, 'grave-tappers-bell')
		}
	);
	if (roll.success) {
		events.push(
			event(
				state,
				'search-resolved',
				`${interaction.label} roll ${roll.kept}: the search succeeds.`,
				'success',
				roll
			)
		);
		grantInteractionReward(state, interaction, rng, events);
		return;
	}

	const noisy = Boolean(interaction.ambushEnemyIds?.length) && roll.kept >= 96;
	events.push(
		event(
			state,
			'search-resolved',
			noisy
				? `${interaction.label} roll ${roll.kept}: the cache erupts in betraying noise.`
				: `${interaction.label} roll ${roll.kept}: nothing useful remains.`,
			'danger',
			roll
		)
	);
	if (!noisy) return;

	if (hasRelic(state, 'hushglass-rosary') && !expedition.effects.hushglassUsed) {
		expedition.effects.hushglassUsed = true;
		events.push(
			event(
				state,
				'ambush-triggered',
				'Hushglass Rosary swallows the first noisy failure; no ambush arrives.',
				'success'
			)
		);
		return;
	}

	const enemyCount = hasRelic(state, 'grave-tappers-bell') ? 2 : 1;
	const enemyIds = (interaction.ambushEnemyIds ?? []).slice(0, enemyCount);
	expedition.pendingOutcome = {
		interactionId,
		roomId: state.roomId,
		kind: 'ambush',
		goldReward: 5
	};
	events.push(
		event(
			state,
			'ambush-triggered',
			'The failed search is consumed. Hostiles answer from the dark.',
			'danger'
		)
	);
	startEncounter(state, 'ambush', enemyIds, rng, events);
}

function resolvePurchase(state: GameState, stockId: string, events: GameEvent[]): void {
	const expedition = state.expedition;
	const stock = expedition?.merchant.stock.find((entry) => entry.id === stockId);
	if (!expedition || !stock) return;
	state.player.gold -= stock.price;
	expedition.goldSpent += stock.price;
	stock.quantity -= 1;
	if (stock.kind === 'consumable') {
		addConsumable(state, stock.itemId as 'healing-potion' | 'blue-hive-wax', events);
	} else if (stock.kind === 'quest') {
		addQuestItem(state, events);
	} else {
		addRelic(state, stock.itemId as RelicId, events);
	}
	events.push(
		event(
			state,
			'purchase-resolved',
			`${itemDefinition(stock.itemId).name} purchased for ${stock.price}gp.`,
			'command'
		)
	);
}

function resolveUseItem(
	state: GameState,
	itemId: 'healing-potion' | 'blue-hive-wax',
	rng: RandomSource,
	events: GameEvent[]
): void {
	const expedition = state.expedition;
	if (!expedition) return;
	expedition.inventory.consumables[itemId] = (expedition.inventory.consumables[itemId] ?? 0) - 1;
	if (itemId === 'healing-potion') {
		if (state.encounter) consumeEconomy(state, 'action', 'item:healing-potion');
		const healing = Math.min(
			rng.int(1, 10) + modifier(state.player.stats.heart),
			state.player.maxHp - state.player.hp
		);
		state.player.hp += healing;
		events.push(event(state, 'item-used', `Healing Potion restores ${healing} health.`, 'success'));
		return;
	}
	expedition.effects.waxCoated = true;
	events.push(
		event(
			state,
			'item-used',
			'Blue Hive Wax coats the equipped weapon; the next successful hit gains 1d10 Poison.',
			'command'
		)
	);
}

function resolveRelicReplacement(
	state: GameState,
	command: Extract<GameCommand, { type: 'replace-relic' }>,
	events: GameEvent[]
): void {
	const expedition = state.expedition;
	if (!expedition) return;
	const incoming = command.incomingRelicId as RelicId;
	const outgoing = command.outgoingRelicId as RelicId;
	const index = expedition.inventory.relicIds.indexOf(outgoing);
	if (index < 0 || !RELIC_DEFINITIONS[incoming]) return;

	if (command.stockId) {
		const stock = expedition.merchant.stock.find((entry) => entry.id === command.stockId);
		if (!stock) return;
		state.player.gold -= stock.price;
		expedition.goldSpent += stock.price;
		stock.quantity -= 1;
	} else {
		expedition.inventory.pendingRelicId = null;
	}
	expedition.inventory.relicIds[index] = incoming;
	events.push(
		event(
			state,
			'relic-replaced',
			`${RELIC_DEFINITIONS[outgoing].name} destroyed; ${RELIC_DEFINITIONS[incoming].name} bound with benefit and cost visible.`,
			'command'
		)
	);
}

function resolveEquip(state: GameState, weaponId: string, events: GameEvent[]): void {
	if (!state.expedition) return;
	const weapon = state.player.weapons.find((candidate) => candidate.id === weaponId);
	if (!weapon) return;
	const previous = state.player.equippedWeaponId;
	state.player.equippedWeaponId = weaponId;
	state.expedition.inventory.reserveWeaponId = previous;
	if (state.phase !== 'combat') state.player.rank = weapon.rank;
	events.push(event(state, 'weapon-equipped', `${weapon.name} equipped.`, 'command'));
}

function takeDamage(state: GameState, amount: number): number {
	let remaining = amount;
	if (state.player.temporaryHp > 0) {
		const absorbed = Math.min(remaining, state.player.temporaryHp);
		state.player.temporaryHp -= absorbed;
		remaining -= absorbed;
	}
	state.player.hp = Math.max(0, state.player.hp - remaining);
	return remaining;
}

function endRun(
	state: GameState,
	status: 'death' | 'objective-failure' | 'victory',
	text: string,
	events: GameEvent[]
): void {
	state.status = status;
	state.phase = status === 'victory' ? 'victory' : 'defeat';
	state.encounter = null;
	events.push(event(state, 'run-ended', text, status === 'victory' ? 'success' : 'danger'));
}

function defensiveAdjustment(state: GameState, stat: DefenseStat): number {
	let adjustment = 0;
	if (stat === 'reflex' && state.player.armor === 'light') adjustment -= 5;
	if (stat === 'heart' && state.player.armor === 'heavy') adjustment -= 5;
	if (state.player.weapons.some((weapon) => weapon.id === 'shield')) adjustment -= 10;
	return adjustment;
}

function enemyAttack(
	state: GameState,
	enemy: EnemyState,
	rng: RandomSource,
	events: GameEvent[]
): void {
	if (enemy.attackRank === 'near' && state.player.rank === 'far') {
		state.player.rank = 'near';
		events.push(
			event(
				state,
				'rank-shifted',
				`${enemy.name} closes the distance and forces you into the Near rank.`,
				'danger'
			)
		);
		return;
	}

	const defense = state.player.defense;
	const statValue = state.player.stats[defense as StatName];
	const roll = rollStat(rng, defense as StatName, statValue, {
		adjustment: defensiveAdjustment(state, defense),
		advantage:
			state.player.effects.braced ||
			enemy.blinded ||
			Boolean(state.expedition?.effects.redThreadDefenseAdvantage)
	});
	trackQualifyingRoll(state, roll);
	state.player.effects.braced = false;
	enemy.blinded = false;
	if (state.expedition) state.expedition.effects.redThreadDefenseAdvantage = false;

	let damage = rollDice(rng, enemy.damageDice) + enemy.damageModifier;
	if (enemy.id === 'zeboul' && state.player.temporaryHp > 0) damage *= 2;

	let counterattack = false;
	if (defense === 'heart' && roll.success) {
		if (isV2(state)) {
			damage =
				roll.band === 'critical'
					? 0
					: Math.max(0, damage - modifier(statValue) * (roll.band === 'hard' ? 2 : 1));
			counterattack = roll.band === 'critical';
		} else {
			damage =
				roll.band === 'critical'
					? 0
					: Math.max(0, damage - modifier(statValue) - (roll.band === 'hard' ? 2 : 0));
		}
	} else if (roll.success) {
		damage = 0;
		if (isV2(state) && defense === 'reflex') {
			if (roll.band === 'hard') addMomentum(state, 1);
			if (roll.band === 'critical') addMomentum(state, 2);
		}
	}

	if (state.player.className === 'Warrior') {
		addMomentum(state, 1);
		if (defense === 'heart' && roll.success) addMomentum(state, 1);
	}

	const trueDamage = takeDamage(state, damage);
	enemy.damagedPlayerLastTurn = damage > 0;
	events.push(
		event(
			state,
			'damage-taken',
			roll.success
				? damage === 0
					? `${capitalize(defense)} roll ${roll.kept} avoids ${enemy.name}’s ${enemy.attackName}.`
					: `${capitalize(defense)} roll ${roll.kept} reduces ${enemy.name}’s ${enemy.attackName} to ${trueDamage} damage.`
				: `${capitalize(defense)} roll ${roll.kept} fails. ${enemy.name} deals ${trueDamage} damage with ${enemy.attackName}.`,
			damage === 0 ? 'success' : 'danger',
			roll
		)
	);

	if (
		counterattack &&
		enemy.hp > 0 &&
		weaponTargets(state).some((target) => target.instanceId === enemy.instanceId)
	) {
		events.push(
			event(
				state,
				'feature-resolved',
				`Critical Block opens an immediate counterattack against ${enemy.name}.`,
				'command'
			)
		);
		resolveWeaponAttack(state, enemy, rng, events, { label: 'Block counterattack' });
	}

	if (state.player.hp === 0) {
		endRun(state, 'death', 'Your light gutters. Death closes this run forever.', events);
	}
}

function enemyPhase(
	state: GameState,
	rng: RandomSource,
	events: GameEvent[],
	resolveEnemies = true
): void {
	if (!state.encounter) return;

	for (const enemy of resolveEnemies ? activeEnemies(state) : []) {
		if (state.status !== 'active') return;
		enemy.damagedPlayerLastTurn = false;
		if (enemy.stunnedTurns > 0) {
			enemy.stunnedTurns -= 1;
			events.push(
				event(state, 'feature-resolved', `${enemy.name} loses the turn while stunned.`, 'success')
			);
			continue;
		}
		if (enemy.id === 'barnabe' && isV2(state)) {
			enemy.turnsTaken += 1;
			if (enemy.turnsTaken % 2 === 1) {
				events.push(
					event(
						state,
						'feature-resolved',
						'Barnabe cowers behind the line and gathers momentum for Decode.',
						'neutral'
					)
				);
				continue;
			}
			if (enemy.silencedTurns > 0) {
				enemy.silencedTurns -= 1;
				events.push(
					event(
						state,
						'feature-resolved',
						`${enemy.name} cannot utter Decode while silenced.`,
						'success'
					)
				);
				continue;
			}
			state.encounter.decodeCount += 1;
			events.push(
				event(
					state,
					'decode-advanced',
					`Barnabe completes Decode ${state.encounter.decodeCount} of 3.`,
					'danger'
				)
			);
			if (state.encounter.decodeCount >= 3) {
				endRun(
					state,
					'objective-failure',
					'The third prayer opens the casket. Barnabe takes the saint, and the run is lost.',
					events
				);
				return;
			}
			continue;
		}
		if (enemy.id === 'barnabe' && enemy.turnsTaken % 2 === 1) {
			enemy.turnsTaken += 1;
			if (enemy.silencedTurns > 0) {
				enemy.silencedTurns -= 1;
				events.push(
					event(
						state,
						'feature-resolved',
						`${enemy.name} cannot utter Decode while silenced.`,
						'success'
					)
				);
				continue;
			}
			state.encounter.decodeCount += 1;
			events.push(
				event(
					state,
					'decode-advanced',
					`Barnabe completes Decode ${state.encounter.decodeCount} of 3.`,
					'danger'
				)
			);
			if (state.encounter.decodeCount >= 3) {
				endRun(
					state,
					'objective-failure',
					'The third prayer opens the casket. Barnabe takes the saint, and the run is lost.',
					events
				);
				return;
			}
			continue;
		}
		if (isV4(state) && state.player.effects.hidden) {
			enemy.turnsTaken += 1;
			events.push(
				event(
					state,
					'feature-resolved',
					`${enemy.name} searches the shadows but cannot find a target.`,
					'neutral'
				)
			);
			continue;
		}

		enemy.turnsTaken += 1;
		enemyAttack(state, enemy, rng, events);
	}

	if (state.status !== 'active' || !state.encounter) return;
	if (resolveEnemies) resolvePlayerTurnStart(state, rng, events);

	if (state.status !== 'active' || !state.encounter) return;

	const remainingEnemies = activeEnemies(state);
	if (
		!isV2(state) &&
		remainingEnemies.length > 0 &&
		!remainingEnemies.some((enemy) => enemy.rank === 'near')
	) {
		for (const enemy of remainingEnemies) enemy.rank = 'near';
		events.push(
			event(
				state,
				'rank-shifted',
				'With the Near rank empty, the remaining hostiles are drawn Near.',
				'command'
			)
		);
	}

	state.encounter.turn.round += 1;
	state.encounter.turn.playerTurnsCompleted += 1;
	state.encounter.turn.actionUsed = false;
	state.encounter.turn.abilityUsed = false;
	if (state.encounter.turn.actionPoints !== undefined) {
		state.encounter.turn.actionPoints = 2;
		state.encounter.turn.usedActionIds = [];
	}
	if (!isV4(state)) state.player.effects.hidden = false;
	if (
		state.player.effects.guidanceExpiresAfterTurn !== null &&
		state.encounter.turn.playerTurnsCompleted >= state.player.effects.guidanceExpiresAfterTurn
	) {
		state.player.effects.guidance = 0;
		state.player.effects.guidanceExpiresAfterTurn = null;
	}
	if (
		state.player.effects.blessExpiresAfterTurn !== null &&
		state.encounter.turn.playerTurnsCompleted >= state.player.effects.blessExpiresAfterTurn
	) {
		state.player.effects.bless = 0;
		state.player.effects.blessExpiresAfterTurn = null;
	}
	if (state.player.effects.sharpshooterTurns > 0) state.player.effects.sharpshooterTurns -= 1;
	if (
		state.player.effects.aegisExpiresAfterTurn !== null &&
		state.encounter.turn.playerTurnsCompleted >= state.player.effects.aegisExpiresAfterTurn
	) {
		state.player.temporaryHp = 0;
		state.player.effects.aegisExpiresAfterTurn = null;
	}
}

export function resolvePlayerTurnStart(
	state: GameState,
	rng: RandomSource,
	events: GameEvent[]
): void {
	if (state.status !== 'active' || !state.encounter) return;

	const firstTarget = targetableEnemies(state)[0];
	if (firstTarget && state.player.effects.tonguesBurn > 0) {
		const damage = state.player.effects.tonguesBurn;
		state.player.effects.tonguesBurn = 0;
		firstTarget.hp = Math.max(0, firstTarget.hp - damage);
		events.push(
			event(
				state,
				'feature-resolved',
				`Tongues of Fire burns ${firstTarget.name} again for ${damage} damage.`,
				'success'
			)
		);
		if (firstTarget.hp === 0) defeatEnemy(state, firstTarget, rng, events);
	}

	if (state.status !== 'active' || !state.encounter) return;
	const moteTarget = targetableEnemies(state)[0];
	if (moteTarget && state.player.effects.sacredMotes > 0) {
		const damage = Math.max(1, Math.floor(modifier(state.player.stats.soul) / 2));
		state.player.effects.sacredMotes -= 1;
		moteTarget.hp = Math.max(0, moteTarget.hp - damage);
		events.push(
			event(
				state,
				'feature-resolved',
				`A Sacred Light mote strikes ${moteTarget.name} for ${damage} Holy damage.`,
				'success'
			)
		);
		if (moteTarget.hp === 0) defeatEnemy(state, moteTarget, rng, events);
	}
}

function startEncounter(
	state: GameState,
	kind: EncounterState['kind'],
	definitionIds: string[],
	rng: RandomSource,
	events: GameEvent[]
): void {
	const enemies = definitionIds.map((id, index) =>
		createEnemy(id, String(index + 1), state.contentVersion === LEGACY_CONTENT_VERSION)
	);
	if (isExpedition(state)) {
		for (const enemy of enemies) enemy.momentum = 0;
	}
	const raiderPresent = enemies.some((enemy) => enemy.id === 'scorched-raider');
	for (const enemy of enemies) {
		if (enemy.id === 'barnabe') enemy.guarded = !isV2(state) && raiderPresent;
	}

	state.encounter = {
		id: kind === 'finale' ? 'barnabe-finale' : `${state.roomId}-encounter`,
		kind,
		enemies,
		turn: {
			round: 1,
			playerTurnsCompleted: 0,
			actionUsed: false,
			abilityUsed: false,
			maneuverAvailable: false,
			...(isV2(state) ? { actionPoints: 2, usedActionIds: [] } : {})
		},
		decodeCount: 0
	};
	state.phase = 'combat';
	state.player.rank = equippedWeapon(state).rank;
	state.player.usedFeatures = [];
	state.player.effects.braced = false;
	if (state.expedition) {
		state.expedition.effects.redThreadUsed = false;
		state.expedition.effects.redThreadDefenseAdvantage = false;
		state.expedition.effects.counterweightUsed = false;
	}

	events.push(
		event(
			state,
			'encounter-started',
			`${enemies.map((enemy) => enemy.name).join(' and ')} bar the way.`,
			'danger'
		)
	);

	const playerInitiative = rng.int(1, 10) + modifier(state.player.stats.reflex);
	const enemyInitiative = Math.max(
		...enemies.map((enemy) => rng.int(1, 10) + enemy.reflexModifier)
	);
	events.push(
		event(
			state,
			'initiative-resolved',
			`Initiative: delver ${playerInitiative}, tomb ${enemyInitiative}.`,
			playerInitiative >= enemyInitiative ? 'success' : 'danger'
		)
	);

	if (enemyInitiative > playerInitiative) enemyPhase(state, rng, events);
}

function enterRoom(state: GameState, rng: RandomSource, events: GameEvent[]): void {
	const node = state.graph.nodes[state.roomId];
	const room = ROOM_TEMPLATES[node.templateId];
	events.push(event(state, 'room-entered', `You enter ${room.name}.`, 'command'));

	if (state.resolvedRooms.includes(node.id)) {
		state.phase = 'exploration';
		return;
	}

	if (isExpedition(state)) {
		if (node.role === 'combat' && node.encounterDefinitionId) {
			startEncounter(state, 'normal', [node.encounterDefinitionId], rng, events);
			return;
		}
		if (node.role === 'finale') {
			const definitions = state.flags.manessaTurned ? ['barnabe'] : ['scorched-raider', 'barnabe'];
			startEncounter(state, 'finale', definitions, rng, events);
			return;
		}
		state.phase = 'exploration';
		return;
	}

	if (node.kind === 'normal-combat' && node.encounterDefinitionId) {
		startEncounter(state, 'normal', [node.encounterDefinitionId], rng, events);
		return;
	}
	if (node.kind === 'event') {
		state.phase = 'event';
		return;
	}
	if (node.kind === 'loot') {
		state.phase = 'loot';
		return;
	}
	if (node.kind === 'finale') {
		const definitions = state.flags.manessaTurned ? ['barnabe'] : ['scorched-raider', 'barnabe'];
		startEncounter(state, 'finale', definitions, rng, events);
		return;
	}

	state.phase = 'exploration';
	state.resolvedRooms.push(node.id);
}

function attackRoll(
	state: GameState,
	weapon: Weapon,
	rng: RandomSource,
	advantage = false
): RollResult {
	const statValue = state.player.stats[weapon.stat];
	const adjustment = -(state.player.effects.guidance + state.player.effects.bless);
	const result = rollStat(rng, weapon.stat, statValue, {
		adjustment,
		advantage:
			advantage ||
			state.player.effects.hidden ||
			(state.player.effects.sharpshooterTurns > 0 && weapon.rank === 'far')
	});

	if (state.player.className === 'Scout' && result.kept < 96) {
		const expertise = weapon.id === 'shortbow' ? 5 : 0;
		const criticalThreshold =
			modifier(statValue) + modifier(state.player.stats.reflex) * 2 + expertise;
		if (result.kept <= criticalThreshold) {
			result.band = 'critical';
			result.success = true;
		}
	}

	return result;
}

function weaponDamage(state: GameState, weapon: Weapon, rng: RandomSource): number {
	const statMod = modifier(state.player.stats[weapon.stat]);
	const damageDice = Array.from({ length: weapon.damageDice }, () => rng.int(1, 10));
	let damage =
		damageDice.reduce((total, die) => total + die, 0) +
		(weapon.damageBonus === 'modifier' ? statMod : Math.floor(statMod / 2));

	if (
		state.player.className === 'Versant' &&
		weapon.id === 'flame-scroll-shortbow' &&
		damageDice.some((die) => die >= 9)
	) {
		damage += rng.int(1, 10);
	}

	return Math.max(1, damage);
}

function applyDamageToEnemy(
	state: GameState,
	target: EnemyState,
	damage: number,
	rng: RandomSource,
	events: GameEvent[]
): void {
	target.hp = Math.max(0, target.hp - damage);
	if (target.hp === 0) defeatEnemy(state, target, rng, events);
}

function levelUp(state: GameState, rng: RandomSource, events: GameEvent[]): void {
	const kit = getClassKit(state.player.className);
	const oldHeart = state.player.stats.heart;
	state.player.level = 2;

	for (const stat of ['heart', 'reflex', 'soul', 'mind', 'voice'] as StatName[]) {
		if (stat === kit.primaryStat) {
			state.player.stats[stat] = Math.min(isV2(state) ? 85 : 90, state.player.stats[stat] + 5);
			continue;
		}
		const advancement = rng.int(1, 100);
		if (advancement > state.player.stats[stat]) {
			state.player.stats[stat] = Math.min(isV2(state) ? 85 : 90, state.player.stats[stat] + 5);
		}
	}

	const heartGain = state.player.stats.heart - oldHeart;
	let hpGain = heartGain;
	if (isV2(state)) {
		const hpRoll = rng.int(1, 10);
		state.player.healthRolls = [...(state.player.healthRolls ?? []), hpRoll];
		hpGain += hpRoll + modifier(state.player.stats.heart);
		state.player.maxHp += hpGain;
		state.player.hp = Math.min(state.player.maxHp, state.player.hp + hpGain);
	} else {
		state.player.maxHp = state.player.stats.heart;
		state.player.hp = Math.min(state.player.maxHp, state.player.hp + heartGain);
	}
	events.push(
		event(
			state,
			'level-gained',
			isV2(state)
				? `Level 2. Stats advance to the 85 cap and maximum health grows by ${hpGain}. Perk and specialization choices are deferred.`
				: 'Level 2. The primary stat rises by 5; seeded checks advance the others. Perk and specialization choices are deferred.',
			'command'
		)
	);
}

function defeatEnemy(
	state: GameState,
	target: EnemyState,
	rng: RandomSource,
	events: GameEvent[]
): void {
	if (!state.encounter) return;
	state.defeatedEncounters.push(target.instanceId);
	events.push(event(state, 'enemy-defeated', `${target.name} falls.`, 'success'));

	const barnabe = state.encounter.enemies.find((enemy) => enemy.id === 'barnabe');
	if (barnabe && !isV2(state))
		barnabe.guarded = activeEnemies(state).some((enemy) => enemy.id === 'scorched-raider');

	if (activeEnemies(state).length > 0) return;

	if (state.encounter.kind === 'finale') {
		endRun(
			state,
			'victory',
			'Barnabe falls before the ward opens. Saint Bozma remains at rest.',
			events
		);
		return;
	}

	const encounterKind = state.encounter.kind;
	state.encounter = null;
	state.phase = 'exploration';
	state.patchUpAvailable = true;
	if (!state.resolvedRooms.includes(state.roomId)) state.resolvedRooms.push(state.roomId);
	if (encounterKind === 'ambush' && state.expedition?.pendingOutcome) {
		const reward = state.expedition.pendingOutcome.goldReward;
		state.expedition.pendingOutcome = null;
		addGold(state, reward, events, 'Ambush victory');
		events.push(
			event(
				state,
				'combat-ended',
				'The ambush breaks. You return to the same room; the failed search stays spent.',
				'success'
			)
		);
		state.expedition.effects.waxCoated = false;
		if (isV4(state)) {
			state.player.experience += 5;
			events.push(event(state, 'experience-gained', 'Victory grants 5 XP.', 'success'));
			if (state.player.level === 1 && state.player.experience >= 10) levelUp(state, rng, events);
		}
		return;
	}
	state.player.experience += 5;
	events.push(
		event(state, 'combat-ended', 'The room falls quiet. Patch Up is available.', 'success')
	);
	events.push(event(state, 'experience-gained', 'Victory grants 5 XP.', 'success'));
	if (isExpedition(state) && state.expedition) {
		state.expedition.normalVictories += 1;
		if (state.expedition.normalVictories === 1) {
			addGold(state, 20, events, 'First required victory');
		}
		state.expedition.effects.waxCoated = false;
	}
	if (state.player.level === 1 && state.player.experience >= 10) levelUp(state, rng, events);
}

function resolveWeaponAttack(
	state: GameState,
	target: EnemyState,
	rng: RandomSource,
	events: GameEvent[],
	options: {
		advantage?: boolean;
		damageScale?: number;
		bonusDamageDice?: number;
		label?: string;
	} = {}
): boolean {
	const weapon = equippedWeapon(state);
	const roll = attackRoll(state, weapon, rng, options.advantage);
	state.player.effects.hidden = false;
	addMomentum(state, weapon.momentum);
	if (state.player.className === 'Warrior' && weapon.id === 'longsword') addMomentum(state, 1);

	if (!roll.success) {
		events.push(
			event(
				state,
				'attack-resolved',
				`${options.label ?? weapon.name} roll ${roll.kept} fails against ${target.name}.`,
				'danger',
				roll
			)
		);
		return false;
	}

	if (isV2(state) && isNaturalOne(roll)) {
		if (state.expedition?.effects.waxCoated) {
			state.expedition.effects.waxCoated = false;
			const poison = rng.int(1, 10);
			events.push(
				event(
					state,
					'item-used',
					`Blue Hive Wax adds ${poison} Poison to the Deathblow.`,
					'success'
				)
			);
		}
		events.push(
			event(
				state,
				'attack-resolved',
				`${options.label ?? weapon.name} rolls a natural 1: Deathblow against ${target.name}.`,
				'success',
				roll
			)
		);
		applyDamageToEnemy(state, target, target.hp, rng, events);
		return true;
	}

	let damage = weaponDamage(state, weapon, rng) + rollDice(rng, options.bonusDamageDice ?? 0);
	if (state.expedition?.effects.waxCoated) {
		state.expedition.effects.waxCoated = false;
		const poison = rng.int(1, 10);
		damage += poison;
		events.push(
			event(state, 'item-used', `Blue Hive Wax discharges for ${poison} Poison damage.`, 'success')
		);
	}
	damage = Math.max(1, Math.floor(damage * (options.damageScale ?? 1)));
	if (roll.band === 'critical') damage *= 2;
	trackQualifyingRoll(state, roll);

	events.push(
		event(
			state,
			'attack-resolved',
			`${options.label ?? weapon.name} roll ${roll.kept} ${roll.band} success: ${damage} damage to ${target.name}.`,
			'success',
			roll
		)
	);
	applyDamageToEnemy(state, target, damage, rng, events);
	return true;
}

function featureTarget(state: GameState, targetId?: string): EnemyState | null {
	if (!targetId) return null;
	return targetableEnemies(state).find((enemy) => enemy.instanceId === targetId) ?? null;
}

function resolveFeature(
	state: GameState,
	command: Extract<GameCommand, { type: 'use-feature' }>,
	rng: RandomSource,
	events: GameEvent[]
): void {
	const target = featureTarget(state, command.targetId);
	const kitFeature = getClassKit(state.player.className).features.find(
		(feature) => feature.id === command.featureId
	);
	const economy = command.featureId === 'brace' ? 'maneuver' : kitFeature?.economy;
	if (!economy) return;
	consumeEconomy(state, economy, `feature:${command.featureId}`);

	switch (command.featureId) {
		case 'brace':
			state.player.effects.braced = true;
			events.push(
				event(
					state,
					'feature-resolved',
					'Brace readies advantage on the next defensive roll.',
					'command'
				)
			);
			return;
		case 'threatening-strike':
			if (
				target &&
				resolveWeaponAttack(state, target, rng, events, {
					damageScale: 0.5,
					label: 'Threatening Strike'
				})
			) {
				target.stunnedTurns = 1;
			}
			return;
		case 'eye-for-an-eye':
			if (target)
				resolveWeaponAttack(state, target, rng, events, {
					damageScale: target.damagedPlayerLastTurn || target.stunnedTurns > 0 ? 2 : 1,
					label: 'Eye for an Eye'
				});
			return;
		case 'aegis-raised': {
			const temporaryHp = Math.floor(state.player.stats.heart / 2);
			state.player.temporaryHp = Math.max(state.player.temporaryHp, temporaryHp);
			state.player.effects.aegisExpiresAfterTurn =
				(state.encounter?.turn.playerTurnsCompleted ?? 0) + 2;
			state.player.usedFeatures.push('aegis-raised');
			events.push(
				event(
					state,
					'temporary-health',
					`Aegis Raised grants ${temporaryHp} temporary health through the next turn.`,
					'success'
				)
			);
			return;
		}
		case 'sneak': {
			const roll = rollStat(rng, 'reflex', state.player.stats.reflex);
			trackQualifyingRoll(state, roll);
			state.player.effects.hidden = roll.success;
			events.push(
				event(
					state,
					'feature-resolved',
					roll.success ? `Sneak roll ${roll.kept}: hidden.` : `Sneak roll ${roll.kept}: exposed.`,
					roll.success ? 'success' : 'danger',
					roll
				)
			);
			return;
		}
		case 'surprise-attack':
			if (target) {
				const alreadyHadAdvantage =
					state.player.effects.hidden ||
					(state.player.effects.sharpshooterTurns > 0 && equippedWeapon(state).rank === 'far');
				resolveWeaponAttack(state, target, rng, events, {
					advantage: true,
					bonusDamageDice: alreadyHadAdvantage
						? isV2(state)
							? modifier(state.player.stats.reflex)
							: state.player.level
						: 0,
					label: 'Surprise Attack'
				});
			}
			return;
		case 'sharpshooter':
			state.player.effects.sharpshooterTurns = 2;
			events.push(
				event(
					state,
					'feature-resolved',
					'Sharpshooter grants advantage to ranged attacks through the next turn.',
					'command'
				)
			);
			return;
		case 'shield-of-faith': {
			const temporaryHp = modifier(state.player.stats.soul);
			state.player.temporaryHp = Math.max(state.player.temporaryHp, temporaryHp);
			addMomentum(state, 1);
			events.push(
				event(
					state,
					'temporary-health',
					`Shield of Faith grants ${temporaryHp} temporary health.`,
					'success'
				)
			);
			return;
		}
		case 'sacred-light': {
			const roll = rollStat(rng, 'soul', state.player.stats.soul);
			trackQualifyingRoll(state, roll);
			if (roll.success) state.player.effects.sacredMotes = state.player.level;
			events.push(
				event(
					state,
					'feature-resolved',
					roll.success
						? `Sacred Light roll ${roll.kept}: ${state.player.level} mote${state.player.level === 1 ? '' : 's'} formed.`
						: `Sacred Light roll ${roll.kept} fails.`,
					roll.success ? 'success' : 'danger',
					roll
				)
			);
			return;
		}
		case 'restorative-prayer': {
			const amount = Math.min(
				modifier(state.player.stats.soul),
				state.player.maxHp - state.player.hp
			);
			state.player.hp += amount;
			addMomentum(state, 1);
			events.push(event(state, 'healed', `Restorative Prayer heals ${amount} health.`, 'success'));
			return;
		}
		case 'prayer-of-healing': {
			const roll = rollStat(rng, 'soul', state.player.stats.soul);
			trackQualifyingRoll(state, roll);
			const amount = Math.min(
				(roll.success ? rng.int(1, 10) : 0) + modifier(state.player.stats.soul),
				state.player.maxHp - state.player.hp
			);
			state.player.hp += amount;
			addMomentum(state, 1);
			if (!roll.success) state.player.usedFeatures.push('prayer-of-healing');
			events.push(
				event(
					state,
					'healed',
					`Prayer of Healing roll ${roll.kept} restores ${amount} health.`,
					'success',
					roll
				)
			);
			return;
		}
		case 'guidance':
			state.player.effects.guidance = modifier(state.player.stats.mind) + state.player.level;
			state.player.effects.guidanceExpiresAfterTurn =
				(state.encounter?.turn.playerTurnsCompleted ?? 0) + 2;
			events.push(
				event(
					state,
					'feature-resolved',
					`Guidance lowers rolls by ${state.player.effects.guidance} through the next turn.`,
					'command'
				)
			);
			return;
		case 'bolt':
			if (target)
				resolveSpellDamage(
					state,
					target,
					'mind',
					1,
					modifier(state.player.stats.mind),
					'Bolt',
					rng,
					events
				);
			return;
		case 'shooting-star': {
			if (!target) return;
			state.player.effects.shootingStarSuccesses = 0;
			state.player.effects.shootingStarTargetId = target.instanceId;
			state.player.effects.shootingStarExpiresAfterTurn =
				(state.encounter?.turn.playerTurnsCompleted ?? 0) + 2;
			events.push(
				event(
					state,
					'feature-resolved',
					`Shooting Star gathers over ${target.name} through the end of your next turn.`,
					'command'
				)
			);
			return;
		}
		case 'black-cloud':
			if (target) {
				const roll = resolveSpellDamage(
					state,
					target,
					'mind',
					1,
					modifier(state.player.stats.mind),
					'Black Cloud',
					rng,
					events
				);
				if (roll?.band === 'hard' || roll?.band === 'critical') target.blinded = true;
				if (!roll.success) state.player.usedFeatures.push('black-cloud');
			}
			return;
		case 'hushing-flame':
			if (target) {
				const roll = resolveSpellDamage(
					state,
					target,
					'voice',
					0,
					modifier(state.player.stats.voice),
					'Hushing Flame',
					rng,
					events
				);
				if (roll.band === 'hard' || roll.band === 'critical') target.silencedTurns = 1;
			}
			return;
		case 'bless':
			state.player.effects.bless = rng.int(1, 10);
			state.player.effects.blessExpiresAfterTurn =
				(state.encounter?.turn.playerTurnsCompleted ?? 0) + 2;
			events.push(
				event(
					state,
					'feature-resolved',
					`Bless lowers rolls by ${state.player.effects.bless} through the next turn.`,
					'command'
				)
			);
			return;
		case 'encouragement': {
			const momentum = rng.int(1, 10);
			addMomentum(state, momentum);
			events.push(
				event(
					state,
					'feature-resolved',
					`No ally needs the word; Encouragement grants ${momentum} momentum.`,
					'command'
				)
			);
			return;
		}
		case 'tongues-of-fire':
			if (target) {
				const roll = rollStat(rng, 'voice', state.player.stats.voice);
				trackQualifyingRoll(state, roll);
				const damage = modifier(state.player.stats.voice) * (roll.band === 'critical' ? 2 : 1);
				if (roll.success) {
					if (isV2(state) && isNaturalOne(roll)) {
						events.push(
							event(
								state,
								'feature-resolved',
								`Tongues of Fire rolls a natural 1: Deathblow against ${target.name}.`,
								'success',
								roll
							)
						);
						applyDamageToEnemy(state, target, target.hp, rng, events);
						return;
					}
					state.player.effects.tonguesBurn = damage;
					applyDamageToEnemy(state, target, damage, rng, events);
				}
				events.push(
					event(
						state,
						'feature-resolved',
						roll.success
							? `Tongues of Fire roll ${roll.kept}: ${damage} Flame damage now and next turn.`
							: `Tongues of Fire roll ${roll.kept} fails.`,
						roll.success ? 'success' : 'danger',
						roll
					)
				);
			}
	}
}

function resolveSpellDamage(
	state: GameState,
	target: EnemyState,
	stat: StatName,
	dice: number,
	bonus: number,
	label: string,
	rng: RandomSource,
	events: GameEvent[]
): RollResult {
	const roll = rollStat(rng, stat, state.player.stats[stat], {
		adjustment: -(state.player.effects.guidance + state.player.effects.bless)
	});
	trackQualifyingRoll(state, roll);
	if (isV2(state) && roll.success && isNaturalOne(roll)) {
		events.push(
			event(
				state,
				'feature-resolved',
				`${label} rolls a natural 1: Deathblow against ${target.name}.`,
				'success',
				roll
			)
		);
		applyDamageToEnemy(state, target, target.hp, rng, events);
		return roll;
	}
	let damage = roll.success ? rollDice(rng, dice) + bonus : 0;
	if (roll.band === 'critical') damage *= 2;
	events.push(
		event(
			state,
			'feature-resolved',
			roll.success
				? `${label} roll ${roll.kept}: ${damage} damage to ${target.name}.`
				: `${label} roll ${roll.kept} fails.`,
			roll.success ? 'success' : 'danger',
			roll
		)
	);
	if (damage > 0) applyDamageToEnemy(state, target, damage, rng, events);
	return roll;
}

function resolveShootingStarIfDue(state: GameState, rng: RandomSource, events: GameEvent[]): void {
	const expires = state.player.effects.shootingStarExpiresAfterTurn;
	if (expires === null || (state.encounter?.turn.playerTurnsCompleted ?? 0) + 1 < expires) {
		return;
	}

	const target =
		targetableEnemies(state).find(
			(enemy) => enemy.instanceId === state.player.effects.shootingStarTargetId
		) ?? targetableEnemies(state)[0];
	const successes = state.player.effects.shootingStarSuccesses;
	state.player.effects.shootingStarSuccesses = 0;
	state.player.effects.shootingStarTargetId = null;
	state.player.effects.shootingStarExpiresAfterTurn = null;
	if (!target) return;

	const damage = rollDice(rng, successes) + modifier(state.player.stats.mind);
	events.push(
		event(
			state,
			'feature-resolved',
			`Shooting Star falls on ${target.name} for ${damage} damage after ${successes} qualifying roll${successes === 1 ? '' : 's'}.`,
			'success'
		)
	);
	applyDamageToEnemy(state, target, damage, rng, events);
}

function resolveChoice(
	state: GameState,
	optionId: string,
	rng: RandomSource,
	events: GameEvent[]
): void {
	if (state.phase === 'event') {
		state.flags.tombMercyAttempted = true;
		if (optionId === 'offer-mercy') {
			const roll = rollStat(rng, 'soul', state.player.stats.soul, { difficulty: 'hard' });
			state.flags.manessaTurned = roll.success;
			events.push(
				event(
					state,
					'choice-resolved',
					roll.success
						? `Soul roll ${roll.kept}: Manessa accepts another path. His Raider will not guard Barnabe.`
						: `Soul roll ${roll.kept}: Manessa refuses to abandon Barnabe.`,
					roll.success ? 'success' : 'danger',
					roll
				)
			);
		} else {
			const roll = rollStat(rng, 'mind', state.player.stats.mind, { difficulty: 'hard' });
			if (roll.success) {
				state.flags.bozmanSensor = true;
				if (!state.player.inventory.includes('Bozman Sensor'))
					state.player.inventory.push('Bozman Sensor');
			}
			events.push(
				event(
					state,
					'choice-resolved',
					roll.success
						? `Mind roll ${roll.kept}: the sigil reveals a hidden Bozman Sensor.`
						: `Mind roll ${roll.kept}: the blood-mark remains unreadable.`,
					roll.success ? 'success' : 'danger',
					roll
				)
			);
		}
	} else {
		if (optionId === 'take-sensor') {
			state.flags.bozmanSensor = true;
			if (!state.player.inventory.includes('Bozman Sensor'))
				state.player.inventory.push('Bozman Sensor');
			state.player.gold += rng.int(1, 10);
			events.push(
				event(state, 'loot-found', 'Bozman Sensor and a handful of gold claimed.', 'success')
			);
		} else if (optionId === 'drink-potion') {
			const healing = Math.min(
				rng.int(1, 10) + modifier(state.player.stats.heart),
				state.player.maxHp - state.player.hp
			);
			state.player.hp += healing;
			events.push(
				event(state, 'healed', `The Healing Potion restores ${healing} health.`, 'success')
			);
		} else {
			const item = `${state.player.className} Tier 1 scroll`;
			state.player.inventory.push(item);
			events.push(event(state, 'loot-found', `${item} claimed.`, 'success'));
		}
	}

	state.phase = 'exploration';
	if (!state.resolvedRooms.includes(state.roomId)) state.resolvedRooms.push(state.roomId);
}

function inspectText(state: GameState): string {
	const room = ROOM_TEMPLATES[state.graph.nodes[state.roomId].templateId];
	if (state.phase === 'combat') {
		return activeEnemies(state)
			.map(
				(enemy) =>
					`${enemy.name}: ${enemy.hp}/${enemy.maxHp} HP, ${capitalize(enemy.rank)}${enemy.guarded ? ', guarded' : ''}`
			)
			.join(' // ');
	}
	return `${room.description} ${state.graph.nodes[state.roomId].exits.length} revealed passage${state.graph.nodes[state.roomId].exits.length === 1 ? '' : 's'}.`;
}

export function resolvePlayerTurnEnd(
	state: GameState,
	rng: RandomSource,
	events: GameEvent[],
	resolveEnemies = true
): void {
	if (state.player.rank === 'near') addMomentum(state, 1);
	if (state.player.className === 'Scout' && state.player.effects.hidden) addMomentum(state, 2);
	if (state.player.className === 'Versant') {
		addMomentum(state, Math.min(activeEnemies(state).length, modifier(state.player.stats.voice)));
	}
	events.push(event(state, 'turn-ended', 'You yield the turn.', 'command'));
	resolveShootingStarIfDue(state, rng, events);
	enemyPhase(state, rng, events, resolveEnemies);
}

export function resolveCommand(
	state: GameState,
	inputCommand: GameCommand,
	rng: RandomSource
): CommandResolution {
	const command = normalizeCommand(state, inputCommand);
	const legal = getLegalCommands(state).some(
		(candidate) => commandKey(candidate.command) === commandKey(command)
	);
	if (!legal) {
		return {
			state,
			events: [
				event(
					state,
					'command-rejected',
					!hasSupportedContentVersion(state)
						? `Unsupported content version ${state.contentVersion}. Nothing advances.`
						: !hasValidContentState(state)
							? `Invalid snapshot for content version ${state.contentVersion}. Nothing advances.`
							: 'That command is not legal in the current state. Nothing advances.',
					'danger'
				)
			]
		};
	}

	const next = cloneState(state);
	next.turn += 1;
	const events: GameEvent[] = [];
	const revealsHiddenAfterResolution =
		isV4(next) && next.player.effects.hidden && targetsEnemy(command);

	switch (command.type) {
		case 'inspect':
			events.push(event(next, 'inspection', inspectText(next)));
			break;
		case 'move': {
			const exit = next.graph.nodes[next.roomId].exits.find(
				(candidate) => candidate.id === command.exitId
			);
			if (!exit) break;
			next.patchUpAvailable = false;
			next.roomId = exit.to;
			if (!next.visitedRooms.includes(exit.to)) next.visitedRooms.push(exit.to);
			enterRoom(next, rng, events);
			break;
		}
		case 'set-defense':
			next.player.defense = command.stat;
			events.push(
				event(
					next,
					'defense-selected',
					`${capitalize(command.stat)} will answer the next attack.`,
					'command'
				)
			);
			break;
		case 'shift-rank':
			if (next.encounter) {
				if (isV2(next))
					consumeEconomy(
						next,
						command.economy ?? 'action',
						command.economy === 'maneuver' ? undefined : 'shift-rank'
					);
				else next.encounter.turn.actionUsed = true;
			}
			next.player.rank = next.player.rank === 'near' ? 'far' : 'near';
			if (
				next.expedition &&
				hasRelic(next, 'pilgrims-red-thread') &&
				!next.expedition.effects.redThreadUsed
			) {
				next.expedition.effects.redThreadUsed = true;
				next.expedition.effects.redThreadDefenseAdvantage = true;
				for (const enemy of activeEnemies(next)) enemy.momentum = (enemy.momentum ?? 0) + 1;
				events.push(
					event(
						next,
						'feature-resolved',
						"Pilgrim's Red Thread grants defense advantage; each hostile gains 1 momentum.",
						'command'
					)
				);
			}
			events.push(
				event(
					next,
					'rank-shifted',
					`You shift to the ${capitalize(next.player.rank)} rank.`,
					'command'
				)
			);
			break;
		case 'close-distance':
			next.player.rank = 'near';
			for (const enemy of activeEnemies(next)) enemy.rank = 'near';
			events.push(
				event(
					next,
					'rank-shifted',
					'With no hostile holding Near, you close freely and draw the enemy line Near.',
					'command'
				)
			);
			break;
		case 'shove': {
			const target = activeEnemies(next).find(
				(enemy) => enemy.instanceId === command.targetId && enemy.rank === 'near'
			);
			if (!target) break;
			consumeEconomy(next, command.economy, 'shove');
			const difficulty = (target.sizeRank ?? 2) >= 3 ? 'hard' : 'normal';
			const roll = rollStat(rng, 'heart', next.player.stats.heart, { difficulty });
			trackQualifyingRoll(next, roll);
			if (roll.success) {
				target.rank = 'far';
				if (
					next.expedition &&
					hasRelic(next, 'raiders-counterweight') &&
					!next.expedition.effects.counterweightUsed
				) {
					next.expedition.effects.counterweightUsed = true;
					addMomentum(next, 1);
					events.push(
						event(
							next,
							'feature-resolved',
							"Raider's Counterweight grants 1 momentum on the first successful Shove.",
							'success'
						)
					);
				}
			} else if (next.expedition && hasRelic(next, 'raiders-counterweight')) {
				const backlash = Math.max(1, modifier(next.player.stats.heart));
				takeDamage(next, backlash);
				events.push(
					event(
						next,
						'damage-taken',
						`Raider's Counterweight backlash deals ${backlash} damage.`,
						'danger'
					)
				);
				if (next.player.hp === 0) {
					endRun(next, 'death', 'The counterweight breaks the delver. The run ends.', events);
				}
			}
			events.push(
				event(
					next,
					'feature-resolved',
					roll.success
						? `Shove roll ${roll.kept} pushes ${target.name} to Far.`
						: `Shove roll ${roll.kept} fails to move ${target.name}.`,
					roll.success ? 'success' : 'danger',
					roll
				)
			);
			break;
		}
		case 'attack': {
			const target = featureTarget(next, command.targetId);
			if (target) {
				if (next.encounter) {
					if (isV2(next))
						consumeEconomy(
							next,
							command.economy ?? 'action',
							command.economy === 'maneuver' ? undefined : `weapon:${equippedWeapon(next).id}`
						);
					else next.encounter.turn.actionUsed = true;
				}
				resolveWeaponAttack(next, target, rng, events);
			}
			break;
		}
		case 'use-feature':
			resolveFeature(next, command, rng, events);
			break;
		case 'patch-up': {
			next.player.recoveryDice -= 1;
			next.patchUpAvailable = false;
			const healing = Math.min(
				rng.int(1, 10) + modifier(next.player.stats.heart),
				next.player.maxHp - next.player.hp
			);
			next.player.hp += healing;
			events.push(
				event(
					next,
					'patched-up',
					`Patch Up restores ${healing} health. ${next.player.recoveryDice} Recovery Dice remain.`,
					'success'
				)
			);
			break;
		}
		case 'choose':
			resolveChoice(next, command.optionId, rng, events);
			break;
		case 'search':
			resolveSearch(next, command.interactionId, rng, events);
			break;
		case 'buy':
			resolvePurchase(next, command.stockId, events);
			break;
		case 'use-item':
			resolveUseItem(next, command.itemId, rng, events);
			break;
		case 'equip':
			if (next.phase === 'combat' && isV4(next)) consumeEconomy(next, 'action', 'equip');
			resolveEquip(next, command.weaponId, events);
			break;
		case 'replace-relic':
			resolveRelicReplacement(next, command, events);
			break;
		case 'end-turn':
			resolvePlayerTurnEnd(next, rng, events);
			break;
		case 'set-leader':
			break;
	}
	if (revealsHiddenAfterResolution) next.player.effects.hidden = false;

	const snapshot = rng.snapshot?.();
	if (snapshot) next.rngCursor = snapshot.cursor;
	return { state: next, events };
}
