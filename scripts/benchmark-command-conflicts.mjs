import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { loadSqlJs } from '../dist/cli/lib/local-index/sql.js';
import { createSchema } from '../dist/cli/lib/local-index/schema.js';
import { commandLockConflictQuery } from '../dist/cli/lib/local-index/command-effect-queries.js';
import { queryRows, splitIndexedList } from '../dist/cli/lib/local-index/database-read.js';

const SQL = await loadSqlJs();
for (const [commands, effects, dense] of [[160, 8, false], [80, 1, true], [80, 8, true], [160, 8, true]]) {
	const database = new SQL.Database();
	try {
		createSchema(database, { backend: 'table_scan', fts5Available: false });
		const names = Array.from({ length: commands }, (_, index) => `command_${String(index).padStart(4, '0')}`);
		for (const [index, name] of names.entries()) {
			for (let ordinal = 0; ordinal < effects; ordinal += 1) database.run('INSERT INTO command_effects VALUES (?, ?, ?, ?, ?, ?, ?)', [name, 'effects', 'write', 'replace', `${name}/${ordinal}`, dense ? 'shared' : `lock_${index}`, 'exclusive']);
		}
		const placeholders = names.map(() => '?').join(',');
		const baseline = `SELECT * FROM command_lock_conflicts WHERE left_intent IN (${placeholders}) OR right_intent IN (${placeholders}) ORDER BY lock, left_intent, right_intent`;
		const optimized = commandLockConflictQuery(placeholders);
		const normalize = (rows) => rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, ['lock', 'left_intent', 'right_intent'].includes(key) ? value : splitIndexedList(value)])));
		assert.deepEqual(normalize(queryRows(database, optimized, [...names, ...names, ...names])), normalize(queryRows(database, baseline, [...names, ...names])));
		const samples = [];
		for (let sample = 0; sample < 3; sample += 1) {
			const measure = (sql, params) => {
				const start = performance.now();
				const rows = queryRows(database, sql, params);
				return { ms: performance.now() - start, rows: rows.length };
			};
			// Alternate order so one implementation does not always run after the other.
			const results = sample % 2 === 0
				? [measure(baseline, [...names, ...names]), measure(optimized, [...names, ...names, ...names])]
				: [measure(optimized, [...names, ...names, ...names]), measure(baseline, [...names, ...names])].reverse();
			samples.push(results);
		}
		const median = (column) => samples.map((sample) => sample[column].ms).sort((a, b) => a - b)[1];
		console.log(JSON.stringify({ commands, effects_per_command: effects, dense, conflict_rows: samples[0][0].rows, baseline_median_ms: Math.round(median(0)), optimized_median_ms: Math.round(median(1)), samples: 3 }));
	} finally { database.close(); }
}
