import { describe, expect, it } from 'vitest';
import { createMemoryRunRepository, RunConflictError, RunNotFoundError } from './run-repository';

const newRun = {
	runId: 'testrun00000001',
	name: 'Mara',
	className: 'Scout' as const,
	seed: 'repository'
};

describe('run repository command contract', () => {
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
});
