/* eslint-disable @typescript-eslint/triple-slash-reference */
/// <reference path="../pb_data/types.d.ts" />

const ownerIndex = 'CREATE INDEX idx_run_records_owner ON run_records (owner)';
const historyIndex = 'CREATE INDEX idx_run_records_owner_created ON run_records (owner, created)';

migrate(
	(app) => {
		const records = app.findCollectionByNameOrId('run_records');
		records.indexes = records.indexes.filter((index) => index !== ownerIndex);
		records.indexes.push(historyIndex);
		app.save(records);
	},
	(app) => {
		const records = app.findCollectionByNameOrId('run_records');
		records.indexes = records.indexes.filter((index) => index !== historyIndex);
		records.indexes.push(ownerIndex);
		app.save(records);
	}
);
