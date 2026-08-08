import { describe, expect, it } from 'vitest';
import { POST } from './+server';

describe('run command request validation', () => {
	it.each([null, 42, {}])('rejects a non-string use-item target (%j)', async (targetId) => {
		const response = await POST({
			locals: { session: { id: 'user-1' } },
			params: { runId: 'run-1' },
			request: new Request('http://localhost/api/runs/run-1/commands', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({
					commandId: 'command-0001',
					expectedVersion: 0,
					command: { type: 'use-item', itemId: 'healing-potion', targetId }
				})
			})
		} as never);

		expect(response.status).toBe(400);
		expect(await response.json()).toEqual({ message: 'Invalid game command.' });
	});
});
