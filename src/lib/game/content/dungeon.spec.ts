import { describe, expect, it } from 'vitest';
import { generateDungeon } from './dungeon';

function reachable(graph: ReturnType<typeof generateDungeon>): Set<string> {
	const seen = new Set<string>();
	const pending = [graph.entryId];
	while (pending.length > 0) {
		const roomId = pending.pop();
		if (!roomId || seen.has(roomId)) continue;
		seen.add(roomId);
		for (const exit of graph.nodes[roomId].exits) pending.push(exit.to);
	}
	return seen;
}

describe('generateDungeon', () => {
	it('replays byte-equivalent graphs for the same seed', () => {
		expect(generateDungeon('bozma-reference')).toEqual(generateDungeon('bozma-reference'));
	});

	it('builds the eight-room quotas with a meaningful branch over a seed corpus', () => {
		for (let seed = 0; seed < 250; seed += 1) {
			const graph = generateDungeon(`property-${seed}`);
			const nodes = Object.values(graph.nodes);

			expect(nodes).toHaveLength(8);
			expect(new Set(graph.middleTemplateIds).size).toBe(6);
			expect(graph.entryId).toBe('monastery-grounds');
			expect(graph.finaleId).toBe('saint-bozmas-resting-chamber');
			expect(reachable(graph).size).toBe(8);
			expect(nodes.some((room) => room.exits.length >= 2)).toBe(true);
			expect(nodes.filter((room) => room.kind === 'normal-combat')).toHaveLength(2);
			expect(nodes.filter((room) => room.kind === 'event')).toHaveLength(1);
			expect(nodes.filter((room) => room.kind === 'loot')).toHaveLength(1);
			expect(nodes.filter((room) => room.kind === 'finale')).toHaveLength(1);
		}
	});
});
