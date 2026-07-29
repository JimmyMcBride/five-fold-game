/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../pb_data/types.d.ts" />

migrate(
	(app) => {
		const runs = app.findCollectionByNameOrId('game_runs');
		runs.fields.getByName('rng_cursor').required = false;
		runs.fields.getByName('version').required = false;
		app.save(runs);

		const actions = app.findCollectionByNameOrId('run_actions');
		actions.fields.getByName('expected_version').required = false;
		app.save(actions);

		const records = app.findCollectionByNameOrId('run_records');
		records.fields.add(
			new AutodateField({
				name: 'created',
				onCreate: true
			})
		);
		app.save(records);
	},
	(app) => {
		const records = app.findCollectionByNameOrId('run_records');
		records.fields.removeByName('created');
		app.save(records);

		const actions = app.findCollectionByNameOrId('run_actions');
		actions.fields.getByName('expected_version').required = true;
		app.save(actions);

		const runs = app.findCollectionByNameOrId('game_runs');
		runs.fields.getByName('rng_cursor').required = true;
		runs.fields.getByName('version').required = true;
		app.save(runs);
	}
);
