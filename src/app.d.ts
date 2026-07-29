import type PocketBase from 'pocketbase';
import type { RecordModel } from 'pocketbase';

declare global {
	namespace App {
		interface SessionUser {
			id: string;
			displayName: string;
		}

		interface Locals {
			pb: PocketBase;
			user: RecordModel | null;
			session: SessionUser | null;
		}
	}
}

export {};
