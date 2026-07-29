/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		const users = app.findCollectionByNameOrId('users');

		const runs = new Collection({
			type: 'base',
			name: 'game_runs',
			listRule: null,
			viewRule: null,
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				{
					type: 'relation',
					name: 'owner',
					required: true,
					maxSelect: 1,
					collectionId: users.id,
					cascadeDelete: true
				},
				{ type: 'text', name: 'active_owner', max: 15 },
				{ type: 'json', name: 'snapshot', required: true, maxSize: 2097152 },
				{ type: 'text', name: 'seed', required: true, max: 64 },
				{ type: 'number', name: 'rng_cursor', required: true, onlyInt: true, min: 0 },
				{
					type: 'select',
					name: 'status',
					required: true,
					maxSelect: 1,
					values: ['active', 'victory', 'death', 'objective-failure']
				},
				{
					type: 'select',
					name: 'outcome',
					maxSelect: 1,
					values: ['victory', 'death', 'objective-failure']
				},
				{ type: 'number', name: 'version', required: true, onlyInt: true, min: 0 },
				{ type: 'text', name: 'content_version', required: true, max: 80 }
			],
			indexes: [
				"CREATE UNIQUE INDEX idx_game_runs_active_owner ON game_runs (active_owner) WHERE active_owner != ''",
				'CREATE INDEX idx_game_runs_owner_status ON game_runs (owner, status)'
			]
		});
		app.save(runs);

		const actions = new Collection({
			type: 'base',
			name: 'run_actions',
			listRule: null,
			viewRule: null,
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				{
					type: 'relation',
					name: 'run',
					required: true,
					maxSelect: 1,
					collectionId: runs.id,
					cascadeDelete: true
				},
				{
					type: 'relation',
					name: 'owner',
					required: true,
					maxSelect: 1,
					collectionId: users.id,
					cascadeDelete: true
				},
				{ type: 'text', name: 'command_id', required: true, max: 80 },
				{ type: 'number', name: 'expected_version', required: true, onlyInt: true, min: 0 },
				{ type: 'json', name: 'command', required: true, maxSize: 65536 },
				{ type: 'json', name: 'events', required: true, maxSize: 524288 },
				{ type: 'json', name: 'projection', required: true, maxSize: 2097152 },
				{ type: 'number', name: 'resulting_version', required: true, onlyInt: true, min: 1 }
			],
			indexes: [
				'CREATE UNIQUE INDEX idx_run_actions_command ON run_actions (run, command_id)',
				'CREATE UNIQUE INDEX idx_run_actions_version ON run_actions (run, resulting_version)'
			]
		});
		app.save(actions);

		const records = new Collection({
			type: 'base',
			name: 'run_records',
			listRule: null,
			viewRule: null,
			createRule: null,
			updateRule: null,
			deleteRule: null,
			fields: [
				{
					type: 'relation',
					name: 'run',
					required: true,
					maxSelect: 1,
					collectionId: runs.id,
					cascadeDelete: true
				},
				{
					type: 'relation',
					name: 'owner',
					required: true,
					maxSelect: 1,
					collectionId: users.id,
					cascadeDelete: true
				},
				{ type: 'json', name: 'summary', required: true, maxSize: 524288 },
				{
					type: 'select',
					name: 'outcome',
					required: true,
					maxSelect: 1,
					values: ['victory', 'death', 'objective-failure']
				},
				{ type: 'text', name: 'character_name', required: true, max: 40 },
				{
					type: 'select',
					name: 'class_name',
					required: true,
					maxSelect: 1,
					values: ['Warrior', 'Scout', 'Priest', 'Magi', 'Versant']
				},
				{ type: 'text', name: 'seed', required: true, max: 64 }
			],
			indexes: [
				'CREATE UNIQUE INDEX idx_run_records_run ON run_records (run)',
				'CREATE INDEX idx_run_records_owner_created ON run_records (owner, created)'
			]
		});
		app.save(records);
	},
	(app) => {
		for (const name of ['run_records', 'run_actions', 'game_runs']) {
			try {
				app.delete(app.findCollectionByNameOrId(name));
			} catch {
				// Allow a partial local rollback.
			}
		}
	}
);
