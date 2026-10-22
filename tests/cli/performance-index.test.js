import assert from 'node:assert/strict';
import { test } from 'node:test';
import { loadSqlJs } from '../../dist/cli/lib/local-index/sql.js';
import { createSchema } from '../../dist/cli/lib/local-index/schema.js';
import { queryLocalCommandEffectGraphs } from '../../dist/cli/lib/local-index/effect-graph-read-model.js';
import { withLocalIndexDatabase, withLocalIndexReadSession } from '../../dist/cli/lib/local-index/read-session.js';
import { createLocalIndexDirect, createMinimalWorkflowProject, removeTempProject } from './index-support.js';

test('command effects batch across 200 intents without duplicate or reversed conflicts', async () => {
	const SQL = await loadSqlJs();
	const database = new SQL.Database();
	try {
		createSchema(database, { backend: 'table_scan', fts5Available: false });
		const names = Array.from({ length: 201 }, (_, index) => `intent_${String(index).padStart(3, '0')}`);
		for (const [index, intent] of names.entries()) {
			database.run('INSERT INTO command_effects VALUES (?, ?, ?, ?, ?, ?, ?)', [intent, 'writes', 'write', 'replace', `${index}.txt`, index === 0 || index === 200 ? 'shared' : `lock_${index}`, 'exclusive']);
		}
		let queryCount = 0;
		const counted = { exec(sql, params) { queryCount += 1; return database.exec(sql, params); } };
		for (const size of [0, 1, 200, 201]) {
			queryCount = 0;
			const requested = names.slice(0, size);
			const graphs = queryLocalCommandEffectGraphs('test.sqlite', counted, [...requested, ...requested]);
			assert.deepEqual([...graphs.keys()], requested);
			assert.equal(queryCount, 2 * Math.ceil(size / 200));
			for (const intent of requested) assert.equal(graphs.get(intent).writeLocks.length, 1);
			if (size) {
				assert.equal(graphs.get(names[0]).lockConflicts[0].intent, names[200]);
				assert.deepEqual(graphs.get(names[0]).lockConflicts[0].paths, ['0.txt']);
				assert.deepEqual(graphs.get(names[0]).lockConflicts[0].conflictingPaths, ['200.txt']);
			}
			if (size === 201) {
				assert.equal(graphs.get(names[200]).lockConflicts.length, 1);
				assert.equal(graphs.get(names[200]).lockConflicts[0].intent, names[0]);
				assert.deepEqual(graphs.get(names[200]).lockConflicts[0].paths, ['200.txt']);
			}
		}
	} finally {
		database.close();
	}
});

test('index read session shares one snapshot and closes it on success and failure', async () => {
	const root = createMinimalWorkflowProject('mustflow-read-session-');
	try {
		await createLocalIndexDirect(root);
		let previous;
		for (const fail of [false, true]) {
			let database;
			const read = withLocalIndexReadSession(root, async () => {
				const [first, second] = await Promise.all([
					withLocalIndexDatabase(root, (snapshot) => snapshot),
					withLocalIndexDatabase(root, (snapshot) => snapshot),
				]);
				assert.equal(first, second);
				assert.notEqual(first, previous);
				assert.deepEqual(first.stalePaths, []);
				previous = first;
				database = first.database;
				assert.ok(database);
				if (fail) throw new Error('reader failed');
			});
			if (fail) await assert.rejects(read, /reader failed/u);
			else await read;
			assert.throws(() => database.exec('SELECT 1'));
		}
	} finally {
		removeTempProject(root);
	}
});
