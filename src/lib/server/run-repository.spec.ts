import { describe, expect, it } from 'vitest';
import type { LegalCommand } from '$lib/game/commands';
import { LEGACY_CONTENT_VERSION, V2_CONTENT_VERSION } from '$lib/game/state';
import { createMemoryRunRepository, RunConflictError, RunNotFoundError } from './run-repository';

const newRun = {
	runId: 'testrun00000001',
	name: 'Mara',
	className: 'Scout' as const,
	seed: 'repository'
};

const newPartyRun = {
	runId: 'partyrun0000001',
	seed: 'repository-party',
	party: [
		{ templateId: 'warrior-corren', startingRank: 'near' as const },
		{ templateId: 'priest-odelle', startingRank: 'far' as const }
	]
};

function selectReferenceCommand(projection: {
	phase: string;
	player: { hp: number; maxHp: number };
	commands: LegalCommand[];
}): LegalCommand | undefined {
	const legal = projection.commands;
	if (projection.phase === 'exploration') {
		return (
			legal.find(
				(candidate) =>
					candidate.command.type === 'patch-up' && projection.player.hp < projection.player.maxHp
			) ?? legal.find((candidate) => candidate.command.type === 'move')
		);
	}
	if (projection.phase === 'event') {
		return legal.find(
			(candidate) =>
				candidate.command.type === 'choose' && candidate.command.optionId === 'offer-mercy'
		);
	}
	if (projection.phase === 'loot') {
		return legal.find(
			(candidate) =>
				candidate.command.type === 'choose' &&
				candidate.command.optionId ===
					(projection.player.hp < projection.player.maxHp ? 'drink-potion' : 'take-sensor')
		);
	}
	if (projection.phase !== 'combat') return undefined;
	return (
		legal.find(
			(candidate) =>
				candidate.command.type === 'use-feature' &&
				['aegis-raised', 'eye-for-an-eye'].includes(candidate.command.featureId)
		) ??
		legal.find(
			(candidate) => candidate.command.type === 'attack' && candidate.economy !== 'maneuver'
		) ??
		legal.find((candidate) => candidate.command.type === 'close-distance') ??
		legal.find((candidate) => candidate.command.type === 'end-turn')
	);
}

describe('run repository command contract', () => {
	it('persists and resumes a party snapshot with actor-aware legal commands', async () => {
		const repository = createMemoryRunRepository();
		const created = await repository.create('party-owner', newPartyRun);
		const resumed = await repository.getActive('party-owner');
		expect(created.party?.map((member) => member.templateId)).toEqual([
			'warrior-corren',
			'priest-odelle'
		]);
		expect(created.leaderMemberId).toBe(created.party?.[0].memberId);
		expect(resumed).toEqual({ ...created, events: [] });
		expect(
			created.commands.every((entry) => entry.command.actorId === created.leaderMemberId)
		).toBe(true);
	});

	it('keeps party commands idempotent and stale-safe', async () => {
		const repository = createMemoryRunRepository();
		const created = await repository.create('party-owner', newPartyRun);
		const inspect = created.commands.find((entry) => entry.command.type === 'inspect')?.command;
		if (!inspect) throw new Error('Expected party inspect.');
		const envelope = {
			runId: newPartyRun.runId,
			commandId: 'party-command-0001',
			expectedVersion: 0,
			command: inspect
		};
		const accepted = await repository.command('party-owner', envelope);
		const duplicate = await repository.command('party-owner', envelope);
		const stale = await repository.command('party-owner', {
			...envelope,
			commandId: 'party-command-0002'
		});
		expect(accepted.kind).toBe('accepted');
		expect(duplicate.kind).toBe('duplicate');
		expect(duplicate.projection).toEqual(accepted.projection);
		expect(stale.kind).toBe('stale');
		expect(stale.projection.version).toBe(1);
	});

	it('creates one active run and rejects a second active slot', async () => {
		const repository = createMemoryRunRepository();
		const created = await repository.create('owner-1', newRun);

		expect(created.version).toBe(0);
		expect(created.player.name).toBe('Mara');
		await expect(
			repository.create('owner-1', { ...newRun, runId: 'testrun00000002' })
		).rejects.toBeInstanceOf(RunConflictError);
	});

	it('accepts a command once and returns the stored projection for a duplicate id', async () => {
		const repository = createMemoryRunRepository();
		await repository.create('owner-1', newRun);
		const envelope = {
			runId: newRun.runId,
			commandId: 'command-0001',
			expectedVersion: 0,
			command: { type: 'inspect' as const }
		};

		const accepted = await repository.command('owner-1', envelope);
		const duplicate = await repository.command('owner-1', envelope);

		expect(accepted.kind).toBe('accepted');
		expect(accepted.projection.version).toBe(1);
		expect(duplicate.kind).toBe('duplicate');
		expect(duplicate.projection).toEqual(accepted.projection);
	});

	it('rejects a stale version without resolving the command', async () => {
		const repository = createMemoryRunRepository();
		await repository.create('owner-1', newRun);
		await repository.command('owner-1', {
			runId: newRun.runId,
			commandId: 'command-0001',
			expectedVersion: 0,
			command: { type: 'inspect' }
		});

		const stale = await repository.command('owner-1', {
			runId: newRun.runId,
			commandId: 'command-0002',
			expectedVersion: 0,
			command: { type: 'inspect' }
		});

		expect(stale.kind).toBe('stale');
		expect(stale.projection.version).toBe(1);
		expect(stale.projection.turn).toBe(1);
	});

	it('rejects an illegal command without consuming the run version', async () => {
		const repository = createMemoryRunRepository();
		await repository.create('owner-1', newRun);

		const rejected = await repository.command('owner-1', {
			runId: newRun.runId,
			commandId: 'command-0001',
			expectedVersion: 0,
			command: { type: 'attack', targetId: 'missing' }
		});

		expect(rejected.kind).toBe('rejected');
		expect(rejected.projection.version).toBe(0);
		expect(rejected.projection.turn).toBe(0);
		expect((await repository.getActive('owner-1'))?.version).toBe(0);
	});

	it('isolates active runs by owner', async () => {
		const repository = createMemoryRunRepository();
		await repository.create('owner-1', newRun);

		expect(await repository.getActive('owner-2')).toBeNull();
		await expect(
			repository.command('owner-2', {
				runId: newRun.runId,
				commandId: 'command-0001',
				expectedVersion: 0,
				command: { type: 'inspect' }
			})
		).rejects.toBeInstanceOf(RunNotFoundError);
	});

	it('resumes and resolves a legacy v1 snapshot under its recorded version', async () => {
		const repository = createMemoryRunRepository();
		const created = await repository.create('owner-1', {
			...newRun,
			contentVersion: LEGACY_CONTENT_VERSION
		});
		const resumed = await repository.getActive('owner-1');
		if (!resumed) throw new Error('Expected active run.');

		expect(created.contentVersion).toBe(LEGACY_CONTENT_VERSION);
		expect(resumed).toEqual({ ...created, events: [] });
		const resolved = await repository.command('owner-1', {
			runId: newRun.runId,
			commandId: 'legacy-command-0001',
			expectedVersion: resumed.version,
			command: { type: 'inspect' }
		});
		expect(resolved.kind).toBe('accepted');
		expect(resolved.projection.contentVersion).toBe(LEGACY_CONTENT_VERSION);
	});

	it('archives exactly one immutable summary when a v2 run terminates', async () => {
		const repository = createMemoryRunRepository();
		let projection = await repository.create('owner-1', {
			...newRun,
			className: 'Warrior',
			seed: 'v2-Warrior-3',
			contentVersion: V2_CONTENT_VERSION
		});
		let terminalEnvelope;

		for (let index = 0; index < 240 && projection.status === 'active'; index += 1) {
			const selected = selectReferenceCommand(projection);
			if (!selected) throw new Error(`No command for ${projection.phase}.`);
			terminalEnvelope = {
				runId: newRun.runId,
				commandId: `terminal-command-${String(index).padStart(4, '0')}`,
				expectedVersion: projection.version,
				command: selected.command
			};
			const result = await repository.command('owner-1', terminalEnvelope);
			if (result.kind !== 'accepted') throw new Error(`Unexpected ${result.kind}.`);
			projection = result.projection;
		}

		expect(projection.status).toBe('victory');
		expect(await repository.getActive('owner-1')).toBeNull();
		expect(await repository.history('owner-1')).toHaveLength(1);
		if (!terminalEnvelope) throw new Error('Expected a terminal command.');
		const duplicate = await repository.command('owner-1', terminalEnvelope);
		expect(duplicate.kind).toBe('duplicate');
		expect(await repository.history('owner-1')).toHaveLength(1);
	});

	it('commits an expedition purchase once and rejects duplicate or stale economy writes atomically', async () => {
		const repository = createMemoryRunRepository();
		let projection = await repository.create('owner-1', {
			...newRun,
			className: 'Warrior',
			seed: 'v3-Warrior-39'
		});

		for (let index = 0; index < 240 && !projection.expedition?.merchant; index += 1) {
			const selected = selectReferenceCommand(projection);
			if (!selected) throw new Error(`No command for ${projection.phase}.`);
			const result = await repository.command('owner-1', {
				runId: newRun.runId,
				commandId: `merchant-command-${String(index).padStart(4, '0')}`,
				expectedVersion: projection.version,
				command: selected.command
			});
			if (result.kind !== 'accepted') throw new Error(`Unexpected ${result.kind}.`);
			projection = result.projection;
		}

		expect(projection.expedition?.merchant).not.toBeNull();
		expect(projection.player.gold).toBeGreaterThanOrEqual(20);
		const purchase = projection.commands.find(
			(entry) => entry.command.type === 'buy' && entry.command.stockId === 'stock:blue-hive-wax'
		)?.command;
		if (!purchase) throw new Error('Expected wax purchase.');
		const envelope = {
			runId: newRun.runId,
			commandId: 'purchase-command-0001',
			expectedVersion: projection.version,
			command: purchase
		};
		const accepted = await repository.command('owner-1', envelope);
		const duplicate = await repository.command('owner-1', envelope);
		const stale = await repository.command('owner-1', {
			...envelope,
			commandId: 'purchase-command-0002'
		});

		expect(accepted.kind).toBe('accepted');
		expect(accepted.projection.player.gold).toBe(projection.player.gold - 20);
		expect(accepted.projection.expedition?.inventory.consumables).toContainEqual(
			expect.objectContaining({ id: 'blue-hive-wax', quantity: 1 })
		);
		expect(duplicate.kind).toBe('duplicate');
		expect(duplicate.projection).toEqual(accepted.projection);
		expect(stale.kind).toBe('stale');
		expect(stale.projection).toEqual({ ...accepted.projection, events: [] });
	});

	it('commits a combat weapon swap once and rejects duplicate or stale retries', async () => {
		const repository = createMemoryRunRepository();
		let projection = await repository.create('owner-1', {
			...newRun,
			className: 'Scout',
			seed: 'combat-equip-repository'
		});
		const move = projection.commands.find((entry) => entry.command.type === 'move')?.command;
		if (!move) throw new Error('Expected initial move.');
		const moved = await repository.command('owner-1', {
			runId: newRun.runId,
			commandId: 'combat-equip-move',
			expectedVersion: projection.version,
			command: move
		});
		if (moved.kind !== 'accepted') throw new Error(`Unexpected ${moved.kind}.`);
		projection = moved.projection;

		const equip = projection.commands.find((entry) => entry.command.type === 'equip')?.command;
		if (!equip || equip.type !== 'equip') throw new Error('Expected combat equip.');
		const envelope = {
			runId: newRun.runId,
			commandId: 'combat-equip-command',
			expectedVersion: projection.version,
			command: equip
		};
		const accepted = await repository.command('owner-1', envelope);
		const duplicate = await repository.command('owner-1', envelope);
		const stale = await repository.command('owner-1', {
			...envelope,
			commandId: 'combat-equip-stale'
		});

		expect(accepted.kind).toBe('accepted');
		expect(accepted.projection.player.equippedWeapon).toBe('Dagger');
		expect(accepted.projection.combat?.actionPoints).toBe(1);
		expect(accepted.projection.combat?.usedActionIds).toContain('equip');
		expect(duplicate.kind).toBe('duplicate');
		expect(duplicate.projection).toEqual(accepted.projection);
		expect(stale.kind).toBe('stale');
		expect(stale.projection).toEqual({ ...accepted.projection, events: [] });
	});
});
