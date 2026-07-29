import { env } from '$env/dynamic/private';
import PocketBase, { type RecordModel } from 'pocketbase';

const DEFAULT_POCKETBASE_URL = 'https://fivefold-pb.jimmymcbride.dev';

export function getPocketBaseUrl(): string {
	return env.POCKETBASE_URL || DEFAULT_POCKETBASE_URL;
}

export function createPocketBase(): PocketBase {
	return new PocketBase(getPocketBaseUrl());
}

export function sanitizeSession(record: RecordModel | null): App.SessionUser | null {
	if (!record) return null;

	const displayName =
		typeof record.name === 'string' && record.name.trim()
			? record.name
			: typeof record.username === 'string' && record.username.trim()
				? record.username
				: 'Delver';

	return { id: record.id, displayName };
}
