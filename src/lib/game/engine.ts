import type { GameCommand, LegalCommand } from './commands';
import { getClassKit } from './content/classes';
import { createEnemy } from './content/enemies';
import { ROOM_TEMPLATES } from './content/rooms';
import type { GameEvent } from './events';
import type {
	CombatTurnState,
	DefenseStat,
	Economy,
	EnemyState,
	EncounterState,
	GameState,
	RollResult,
	StatName,
	Weapon
} from './model';
import type { RandomSource } from './rng';
import { modifier, rollDice, rollStat } from './rules';

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

function targetableEnemies(state: GameState): EnemyState[] {
	const enemies = activeEnemies(state);
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

function economyAvailable(turn: CombatTurnState, economy: Economy): boolean {
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

export function getLegalCommands(state: GameState): LegalCommand[] {
	const inspect: LegalCommand = {
		id: 'inspect',
		label: 'Inspect',
		detail: 'Read the current room or threat.',
		command: { type: 'inspect' }
	};

	if (state.status !== 'active') return [];

	if (state.phase === 'event' || state.phase === 'loot') {
		return [inspect, ...roomOptions(state)];
	}

	if (state.phase === 'exploration') {
		const commands = [
			inspect,
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

	for (const stat of allowedDefenses(state)) {
		commands.push({
			id: `defense:${stat}`,
			label: `Defend with ${capitalize(stat)}`,
			detail: defenseDetail(stat),
			command: { type: 'set-defense', stat }
		});
	}

	if (!turn.actionUsed) {
		for (const enemy of weaponTargets(state)) {
			commands.push({
				id: `attack:${enemy.instanceId}`,
				label: `Attack ${enemy.name}`,
				detail: `${weapon.name} // ${capitalize(weapon.stat)} // ${capitalize(weapon.rank)}`,
				command: { type: 'attack', targetId: enemy.instanceId },
				economy: 'action'
			});
		}
	}

	if (!turn.actionUsed) {
		commands.push({
			id: 'shift-rank',
			label: `Shift to ${state.player.rank === 'near' ? 'Far' : 'Near'}`,
			detail: 'Spend your Action to switch ranks.',
			command: { type: 'shift-rank' },
			economy: 'action'
		});
	}

	const kit = getClassKit(state.player.className);
	for (const feature of kit.features) {
		if (!economyAvailable(turn, feature.economy)) continue;
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
	return JSON.stringify(command);
}

function allowedDefenses(state: GameState): DefenseStat[] {
	return state.player.className === 'Priest' ? ['heart', 'reflex', 'soul'] : ['heart', 'reflex'];
}

function defenseDetail(stat: DefenseStat): string {
	if (stat === 'heart') return 'Reduce damage on a success; negate it on a critical.';
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

function consumeEconomy(state: GameState, economy: Economy): void {
	if (!state.encounter) return;
	if (economy === 'action') state.encounter.turn.actionUsed = true;
	if (economy === 'ability') state.encounter.turn.abilityUsed = true;
	if (economy === 'maneuver') state.encounter.turn.maneuverAvailable = false;
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
		advantage: state.player.effects.braced || enemy.blinded
	});
	trackQualifyingRoll(state, roll);
	state.player.effects.braced = false;
	enemy.blinded = false;

	let damage = rollDice(rng, enemy.damageDice) + enemy.damageModifier;
	if (enemy.id === 'zeboul' && state.player.temporaryHp > 0) damage *= 2;

	if (defense === 'heart' && roll.success) {
		damage =
			roll.band === 'critical'
				? 0
				: Math.max(0, damage - modifier(statValue) - (roll.band === 'hard' ? 2 : 0));
	} else if (roll.success) {
		damage = 0;
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

	if (state.player.hp === 0) {
		endRun(state, 'death', 'Your light gutters. Death closes this run forever.', events);
	}
}

function enemyPhase(state: GameState, rng: RandomSource, events: GameEvent[]): void {
	if (!state.encounter) return;

	for (const enemy of activeEnemies(state)) {
		if (state.status !== 'active') return;
		enemy.damagedPlayerLastTurn = false;
		if (enemy.stunnedTurns > 0) {
			enemy.stunnedTurns -= 1;
			events.push(
				event(state, 'feature-resolved', `${enemy.name} loses the turn while stunned.`, 'success')
			);
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

		enemy.turnsTaken += 1;
		enemyAttack(state, enemy, rng, events);
	}

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

	if (state.status !== 'active' || !state.encounter) return;

	const remainingEnemies = activeEnemies(state);
	if (remainingEnemies.length > 0 && !remainingEnemies.some((enemy) => enemy.rank === 'near')) {
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
	state.player.effects.hidden = false;
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

function startEncounter(
	state: GameState,
	kind: EncounterState['kind'],
	definitionIds: string[],
	rng: RandomSource,
	events: GameEvent[]
): void {
	const enemies = definitionIds.map((id, index) => createEnemy(id, String(index + 1)));
	const raiderPresent = enemies.some((enemy) => enemy.id === 'scorched-raider');
	for (const enemy of enemies) {
		if (enemy.id === 'barnabe') enemy.guarded = raiderPresent;
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
			maneuverAvailable: false
		},
		decodeCount: 0
	};
	state.phase = 'combat';
	state.player.rank = equippedWeapon(state).rank;
	state.player.usedFeatures = [];
	state.player.effects.braced = false;

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
			state.player.stats[stat] = Math.min(90, state.player.stats[stat] + 5);
			continue;
		}
		const advancement = rng.int(1, 100);
		if (advancement > state.player.stats[stat]) {
			state.player.stats[stat] = Math.min(90, state.player.stats[stat] + 5);
		}
	}

	const heartGain = state.player.stats.heart - oldHeart;
	state.player.maxHp = state.player.stats.heart;
	state.player.hp = Math.min(state.player.maxHp, state.player.hp + heartGain);
	events.push(
		event(
			state,
			'level-gained',
			'Level 2. The primary stat rises by 5; seeded checks advance the others. Perk and specialization choices are deferred.',
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
	if (barnabe)
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

	state.encounter = null;
	state.phase = 'exploration';
	state.patchUpAvailable = true;
	if (!state.resolvedRooms.includes(state.roomId)) state.resolvedRooms.push(state.roomId);
	state.player.experience += 5;
	events.push(
		event(state, 'combat-ended', 'The room falls quiet. Patch Up is available.', 'success')
	);
	events.push(event(state, 'experience-gained', 'Victory grants 5 XP.', 'success'));
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

	let damage = weaponDamage(state, weapon, rng) + rollDice(rng, options.bonusDamageDice ?? 0);
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
	consumeEconomy(state, economy);

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
					bonusDamageDice: alreadyHadAdvantage ? state.player.level : 0,
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
				const damage = modifier(state.player.stats.voice);
				if (roll.success) {
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
	const damage = roll.success ? rollDice(rng, dice) + bonus : 0;
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

export function resolveCommand(
	state: GameState,
	command: GameCommand,
	rng: RandomSource
): CommandResolution {
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
					'That command is not legal in the current state. Nothing advances.',
					'danger'
				)
			]
		};
	}

	const next = cloneState(state);
	next.turn += 1;
	const events: GameEvent[] = [];

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
			if (next.encounter) next.encounter.turn.actionUsed = true;
			next.player.rank = next.player.rank === 'near' ? 'far' : 'near';
			events.push(
				event(
					next,
					'rank-shifted',
					`You shift to the ${capitalize(next.player.rank)} rank.`,
					'command'
				)
			);
			break;
		case 'attack': {
			const target = featureTarget(next, command.targetId);
			if (target) {
				if (next.encounter) next.encounter.turn.actionUsed = true;
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
		case 'end-turn':
			if (next.player.rank === 'near') addMomentum(next, 1);
			if (next.player.className === 'Scout' && next.player.effects.hidden) addMomentum(next, 2);
			if (next.player.className === 'Versant') {
				addMomentum(next, Math.min(activeEnemies(next).length, modifier(next.player.stats.voice)));
			}
			events.push(event(next, 'turn-ended', 'You yield the turn.', 'command'));
			resolveShootingStarIfDue(next, rng, events);
			enemyPhase(next, rng, events);
	}

	const snapshot = rng.snapshot?.();
	if (snapshot) next.rngCursor = snapshot.cursor;
	return { state: next, events };
}
