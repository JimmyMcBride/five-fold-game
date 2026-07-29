import { createRng } from '../rng';
import type { RoomGraph, RoomNode, RoomTemplate } from '../model';
import { ENTRY_ROOM, FINALE_ROOM, MIDDLE_ROOMS } from './rooms';

function shuffled<T>(values: readonly T[], seed: string): T[] {
	const result = [...values];
	const rng = createRng(seed);

	for (let index = result.length - 1; index > 0; index -= 1) {
		const swap = rng.int(0, index);
		[result[index], result[swap]] = [result[swap], result[index]];
	}

	return result;
}

function node(
	template: RoomTemplate,
	kind: RoomNode['kind'],
	encounterDefinitionId?: string
): RoomNode {
	return {
		id: template.id,
		templateId: template.id,
		exits: [],
		kind,
		encounterDefinitionId
	};
}

function connect(from: RoomNode, to: RoomNode, label: string): void {
	from.exits.push({ id: `${from.id}:${to.id}`, label, to: to.id });
}

export function generateDungeon(seed: string): RoomGraph {
	const selected = shuffled(MIDDLE_ROOMS, `${seed}:rooms`).slice(0, 6);
	const enemyRng = createRng(`${seed}:encounters`);
	const normalEnemyIds = ['hellhornet', 'scorched-raider', 'zeboul'];
	const firstEnemy = normalEnemyIds[enemyRng.int(0, normalEnemyIds.length - 1)];
	const secondEnemy = normalEnemyIds[enemyRng.int(0, normalEnemyIds.length - 1)];

	const entry = node(ENTRY_ROOM, 'entry');
	const firstCombat = node(selected[0], 'normal-combat', firstEnemy);
	const leftBranch = node(selected[1], 'quiet');
	const rightBranch = node(selected[2], 'quiet');
	const secondCombat = node(selected[3], 'normal-combat', secondEnemy);
	const eventRoom = node(selected[4], 'event');
	const lootRoom = node(selected[5], 'loot');
	const finale = node(FINALE_ROOM, 'finale', 'barnabe');

	connect(entry, firstCombat, 'Climb toward the shrine');
	connect(firstCombat, leftBranch, `Turn toward ${leftBranch.id}`);
	connect(firstCombat, rightBranch, `Turn toward ${rightBranch.id}`);
	connect(leftBranch, secondCombat, 'Follow the blood trail');
	connect(rightBranch, secondCombat, 'Descend behind the altar');
	connect(secondCombat, eventRoom, 'Press deeper');
	connect(eventRoom, lootRoom, 'Follow the saint’s smoke');
	connect(lootRoom, finale, 'Enter the resting chamber');

	return {
		entryId: entry.id,
		finaleId: finale.id,
		nodes: Object.fromEntries(
			[entry, firstCombat, leftBranch, rightBranch, secondCombat, eventRoom, lootRoom, finale].map(
				(room) => [room.id, room]
			)
		),
		middleTemplateIds: selected.map((room) => room.id)
	};
}
