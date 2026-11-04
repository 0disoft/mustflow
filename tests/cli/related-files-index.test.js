import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { inspectRelatedFiles } from '../../dist/core/related-files.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

test('related-files indexes importers once instead of rescanning every reference per target', (t) => {
	const root = createTempProject('mustflow-related-index-');
	const targets = Array.from({ length: 128 }, (_, i) => `dep-${String(i).padStart(3, '0')}.ts`);
	const set = Map.prototype.set;
	let referenceReads = 0;
	let report;
	try {
		for (const name of targets) writeFileSync(path.join(root, name), 'export {};\n');
		writeFileSync(path.join(root, 'many.ts'), targets.map(name => `import './${name}'; require('./${name}');`).join('\n'));
		Map.prototype.set = function (key, value) {
			if (key === 'many.ts' && Array.isArray(value)) {
				for (const reference of value) {
					const resolved = reference.resolvedPath;
					Object.defineProperty(reference, 'resolvedPath', { configurable: true, get() { referenceReads++; return resolved; } });
				}
			}
			return set.call(this, key, value);
		};
		try {
			report = inspectRelatedFiles(root, { paths: [...targets].reverse().map(name => path.join(root, name)) });
		} finally { Map.prototype.set = set; }
		t.diagnostic(JSON.stringify({ targets: targets.length, imports: targets.length * 2, referenceReads }));
		assert.equal(report.status, 'passed');
		assert.deepEqual(report.candidates.map(candidate => [candidate.relationship, candidate.path, candidate.target_path, candidate.line]),
			targets.map((name, index) => ['importer', 'many.ts', name, index + 1]));
		assert.ok(referenceReads <= targets.length * 4, `Importer lookup rescanned ${referenceReads} resolved references`);
	} finally {
		Map.prototype.set = set;
		removeTempProject(root);
	}
});

test('importer indexing preserves sorted results, duplicate rules, self exclusion and the first capped candidate', () => {
	const root = createTempProject('mustflow-related-order-');
	try {
		const files = {
			'z-importer.ts': ["import './dep-b.ts'; require('./dep-b.ts');", "import './dep-b.ts';", "import './dep-a.ts';", "import './z-importer.ts';"].join('\n'),
			'a-importer.ts': "import './dep-a.ts';\nimport './dep-a.ts';\n",
			'dep-a.ts': 'export {};\n', 'dep-b.ts': 'export {};\n',
		};
		for (const [name, content] of Object.entries(files)) writeFileSync(path.join(root, name), content);
		const paths = ['dep-b.ts', 'dep-a.ts', 'dep-b.ts', 'z-importer.ts'].map(name => path.join(root, name));
		const report = inspectRelatedFiles(root, { paths });
		assert.equal(report.status, 'passed');
		assert.equal(report.targets.length, 4);
		assert.deepEqual(report.candidates.map(candidate => [candidate.relationship, candidate.path, candidate.target_path, candidate.line]), [
			['import', 'dep-a.ts', 'z-importer.ts', 3],
			['import', 'dep-b.ts', 'z-importer.ts', 1],
			['import', 'dep-b.ts', 'z-importer.ts', 2],
			['importer', 'a-importer.ts', 'dep-a.ts', 1],
			['importer', 'a-importer.ts', 'dep-a.ts', 2],
			['importer', 'z-importer.ts', 'dep-a.ts', 3],
			['importer', 'z-importer.ts', 'dep-b.ts', 1],
			['importer', 'z-importer.ts', 'dep-b.ts', 2],
		]);
		const capped = inspectRelatedFiles(root, { paths, maxCandidates: 1 });
		assert.equal(capped.truncated, true);
		assert.deepEqual(capped.candidates.map(candidate => [candidate.relationship, candidate.path, candidate.target_path, candidate.line]),
			[['importer', 'z-importer.ts', 'dep-b.ts', 1]]);
		assert.deepEqual(capped.findings.map(finding => [finding.code, finding.path]), [['related_files_max_candidates_exceeded', 'dep-b.ts']]);
	} finally { removeTempProject(root); }
});

test('importer index storage follows the candidate budget rather than all matching edges', (t) => {
	const root = createTempProject('mustflow-related-budget-');
	const targets = Array.from({ length: 8 }, (_, i) => `dep-${i}.ts`);
	const set = Map.prototype.set;
	const buckets = [];
	const maxCandidates = 3;
	try {
		for (const name of targets) writeFileSync(path.join(root, name), 'export {};\n');
		const statements = Array.from({ length: 100 }, () => targets.map(name => `import './${name}';`)).flat();
		writeFileSync(path.join(root, 'many.ts'), statements.join('\n'));
		Map.prototype.set = function (key, value) {
			if (targets.includes(key) && Array.isArray(value) && value[0]?.sourcePath === 'many.ts') buckets.push(value);
			return set.call(this, key, value);
		};
		let report;
		try {
			report = inspectRelatedFiles(root, { paths: targets.map(name => path.join(root, name)), maxCandidates });
		} finally { Map.prototype.set = set; }
		const indexEntries = buckets.reduce((count, entries) => count + entries.length, 0);
		t.diagnostic(JSON.stringify({ imports: statements.length, indexEntries, maxCandidates }));
		assert.equal(report.candidates.length, maxCandidates);
		assert.equal(report.truncated, true);
		assert.equal(buckets.length, targets.length);
		assert.ok(indexEntries <= targets.length * (maxCandidates + 1), `Unbounded importer index retained ${indexEntries} entries`);
	} finally {
		Map.prototype.set = set;
		removeTempProject(root);
	}
});
