import { env } from '$env/dynamic/private';
import type PocketBase from 'pocketbase';
import { ClientResponseError, type RecordModel } from 'pocketbase';
import type { GameCommand } from '$lib/game/commands';
import { resolveCommand } from '$lib/game/engine';
import type { GameState, RunSummary } from '$lib/game/model';
import { projectRun, type RunProjection } from '$lib/game/projection';
import { createRng } from '$lib/game/rng';
import {
	createInitialState,
	decodeGameState,
	summarizeRun,
	type NewRunInput
} from '$lib/game/state';
import { createPocketBaseService } from './pocketbase';

export interface CommandEnvelope {
	runId: string;
	commandId: string;
	expectedVersion: number;
	command: GameCommand;
}

export type CommandResult =
	| { kind: 'accepted'; projection: RunProjection }
	| { kind: 'duplicate'; projection: RunProjection }
	| { kind: 'stale'; projection: RunProjection }
	| { kind: 'rejected'; projection: RunProjection };

export interface RunRepository {
	getActive(ownerId: string): Promise<RunProjection | null>;
	create(ownerId: string, input: NewRunInput): Promise<RunProjection>;
	command(ownerId: string, envelope: CommandEnvelope): Promise<CommandResult>;
	history(ownerId: string): Promise<RunSummary[]>;
}

interface StoredRun {
	ownerId: string;
	state: GameState;
	version: number;
	commands: Map<string, RunProjection>;
}

class MemoryRunRepository implements RunRepository {
	private runs = new Map<string, StoredRun>();
	private activeRuns = new Map<string, string>();
	private records = new Map<string, RunSummary[]>();

	async getActive(ownerId: string): Promise<RunProjection | null> {
		const runId = this.activeRuns.get(ownerId);
		const run = runId ? this.runs.get(runId) : null;
		return run ? projectRun(run.state, run.version) : null;
	}

	async create(ownerId: string, input: NewRunInput): Promise<RunProjection> {
		if (this.activeRuns.has(ownerId)) throw new RunConflictError('An active run already exists.');
		const state = createInitialState(input);
		this.runs.set(state.runId, { ownerId, state, version: 0, commands: new Map() });
		this.activeRuns.set(ownerId, state.runId);
		return projectRun(state, 0, [
			{
				kind: 'room-entered',
				text: `You reach ${state.graph.nodes[state.roomId].id}. The run begins.`,
				tone: 'command',
				turn: 0
			}
		]);
	}

	async command(ownerId: string, envelope: CommandEnvelope): Promise<CommandResult> {
		const run = this.runs.get(envelope.runId);
		if (!run || run.ownerId !== ownerId) throw new RunNotFoundError();
		const duplicate = run.commands.get(envelope.commandId);
		if (duplicate) return { kind: 'duplicate', projection: structuredClone(duplicate) };
		if (run.version !== envelope.expectedVersion) {
			return { kind: 'stale', projection: projectRun(run.state, run.version) };
		}

		const rng = createRng(`${run.state.seed}:commands`, run.state.rngCursor);
		const resolution = resolveCommand(run.state, envelope.command, rng);
		if (resolution.events[0]?.kind === 'command-rejected') {
			return {
				kind: 'rejected',
				projection: projectRun(run.state, run.version, resolution.events)
			};
		}
		run.state = resolution.state;
		run.version += 1;
		const projection = projectRun(run.state, run.version, resolution.events);
		run.commands.set(envelope.commandId, projection);

		const summary = summarizeRun(run.state);
		if (summary) {
			this.records.set(ownerId, [summary, ...(this.records.get(ownerId) ?? [])]);
			this.activeRuns.delete(ownerId);
		}

		return { kind: 'accepted', projection };
	}

	async history(ownerId: string): Promise<RunSummary[]> {
		return structuredClone(this.records.get(ownerId) ?? []);
	}
}

interface GameRunRecord extends RecordModel {
	owner: string;
	active_owner: string;
	snapshot: unknown;
	seed: string;
	rng_cursor: number;
	status: GameState['status'];
	outcome: string;
	version: number;
	content_version: string;
}

interface RunActionRecord extends RecordModel {
	run: string;
	command_id: string;
	projection: RunProjection;
}

class PocketBaseRunRepository implements RunRepository {
	constructor(private pb: PocketBase) {}

	async getActive(ownerId: string): Promise<RunProjection | null> {
		try {
			const record = await this.pb
				.collection('game_runs')
				.getFirstListItem<GameRunRecord>(
					this.pb.filter('owner = {:owner} && status = "active"', { owner: ownerId })
				);
			return projectRun(decodeGameState(record.snapshot), record.version);
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 404) return null;
			throw error;
		}
	}

	async create(ownerId: string, input: NewRunInput): Promise<RunProjection> {
		const state = createInitialState(input);
		try {
			await this.pb.collection('game_runs').create({
				id: state.runId,
				owner: ownerId,
				active_owner: ownerId,
				snapshot: state,
				seed: state.seed,
				rng_cursor: state.rngCursor,
				status: 'active',
				outcome: '',
				version: 0,
				content_version: state.contentVersion
			});
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 400) {
				throw new RunConflictError('An active run already exists.');
			}
			throw error;
		}
		return projectRun(state, 0);
	}

	async command(ownerId: string, envelope: CommandEnvelope): Promise<CommandResult> {
		const run = await this.pb.collection('game_runs').getOne<GameRunRecord>(envelope.runId);
		if (run.owner !== ownerId) throw new RunNotFoundError();
		const existing = await this.findCommand(envelope.runId, envelope.commandId);
		if (existing) return { kind: 'duplicate', projection: existing.projection };
		const snapshot = decodeGameState(run.snapshot);
		if (run.version !== envelope.expectedVersion) {
			return { kind: 'stale', projection: projectRun(snapshot, run.version) };
		}

		const rng = createRng(`${snapshot.seed}:commands`, snapshot.rngCursor);
		const resolution = resolveCommand(snapshot, envelope.command, rng);
		if (resolution.events[0]?.kind === 'command-rejected') {
			return {
				kind: 'rejected',
				projection: projectRun(snapshot, run.version, resolution.events)
			};
		}
		const nextVersion = run.version + 1;
		const projection = projectRun(resolution.state, nextVersion, resolution.events);
		const summary = summarizeRun(resolution.state);
		const batch = this.pb.createBatch();

		batch.collection('run_actions').create({
			run: run.id,
			owner: ownerId,
			command_id: envelope.commandId,
			expected_version: envelope.expectedVersion,
			command: envelope.command,
			events: resolution.events,
			projection,
			resulting_version: nextVersion
		});
		batch.collection('game_runs').update(run.id, {
			snapshot: resolution.state,
			rng_cursor: resolution.state.rngCursor,
			status: resolution.state.status,
			outcome: resolution.state.status === 'active' ? '' : resolution.state.status,
			version: nextVersion,
			active_owner: resolution.state.status === 'active' ? ownerId : ''
		});
		if (summary) {
			batch.collection('run_records').create({
				run: run.id,
				owner: ownerId,
				summary,
				outcome: summary.outcome,
				character_name: summary.characterName,
				class_name: summary.className,
				seed: summary.seed
			});
		}

		try {
			await batch.send();
			return { kind: 'accepted', projection };
		} catch (error) {
			const duplicate = await this.findCommand(envelope.runId, envelope.commandId);
			if (duplicate) return { kind: 'duplicate', projection: duplicate.projection };
			const latest = await this.pb.collection('game_runs').getOne<GameRunRecord>(run.id);
			if (latest.version !== envelope.expectedVersion) {
				return {
					kind: 'stale',
					projection: projectRun(decodeGameState(latest.snapshot), latest.version)
				};
			}
			throw error;
		}
	}

	async history(ownerId: string): Promise<RunSummary[]> {
		const records = await this.pb.collection('run_records').getFullList({
			filter: this.pb.filter('owner = {:owner}', { owner: ownerId }),
			sort: '-created',
			fields: 'summary'
		});
		return records.map((record) => record.summary as RunSummary);
	}

	private async findCommand(runId: string, commandId: string): Promise<RunActionRecord | null> {
		try {
			return await this.pb.collection('run_actions').getFirstListItem<RunActionRecord>(
				this.pb.filter('run = {:run} && command_id = {:command}', {
					run: runId,
					command: commandId
				})
			);
		} catch (error) {
			if (error instanceof ClientResponseError && error.status === 404) return null;
			throw error;
		}
	}
}

export class RunConflictError extends Error {}
export class RunNotFoundError extends Error {
	constructor() {
		super('Run not found.');
	}
}

const memoryRepository = new MemoryRunRepository();

export function createMemoryRunRepository(): RunRepository {
	return new MemoryRunRepository();
}

export function getRunRepository(): RunRepository {
	return env.FIVEFOLD_TEST_MODE === 'true'
		? memoryRepository
		: new PocketBaseRunRepository(createPocketBaseService());
}

export function isTestRunRepository(): boolean {
	return env.FIVEFOLD_TEST_MODE === 'true';
}
