import type { GameCommand, LegalCommand } from '$lib/game/commands';

interface EnemyTarget {
	id: string;
	rank: string;
}

export interface HealthProgress {
	now: number;
	max: number;
	percent: number;
}

export function healthProgress(current: number, maximum: number): HealthProgress {
	if (maximum <= 0) return { now: 0, max: 1, percent: 0 };

	const now = Math.min(Math.max(current, 0), maximum);
	return {
		now,
		max: maximum,
		percent: Math.round((now / maximum) * 100)
	};
}

export function commandTargetId(command: GameCommand): string | null {
	switch (command.type) {
		case 'attack':
		case 'shove':
			return command.targetId;
		case 'use-feature':
			return command.targetId ?? null;
		default:
			return null;
	}
}

export function eligibleEnemyIds(enemies: EnemyTarget[], commands: LegalCommand[]): string[] {
	const commandTargets = new Set(
		commands
			.map((candidate) => commandTargetId(candidate.command))
			.filter((targetId): targetId is string => targetId !== null)
	);
	const eligible = enemies.filter((enemy) => commandTargets.has(enemy.id));

	return [
		...eligible.filter((enemy) => enemy.rank.toLowerCase() === 'near'),
		...eligible.filter((enemy) => enemy.rank.toLowerCase() !== 'near')
	].map((enemy) => enemy.id);
}

export function reconcileSelectedEnemy(
	previousId: string | null,
	enemies: EnemyTarget[],
	commands: LegalCommand[]
): string | null {
	const eligibleIds = eligibleEnemyIds(enemies, commands);
	if (previousId && eligibleIds.includes(previousId)) return previousId;
	return eligibleIds[0] ?? null;
}

export function commandsForSelectedTarget(
	commands: LegalCommand[],
	selectedEnemyId: string | null
): LegalCommand[] {
	return commands.filter((candidate) => {
		if (candidate.targetKind === 'ally' || candidate.targetKind === 'self') return true;
		const targetId = commandTargetId(candidate.command);
		return targetId === null || targetId === selectedEnemyId;
	});
}
