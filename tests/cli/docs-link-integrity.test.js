import assert from 'node:assert/strict';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import path from 'node:path';
import { test } from 'node:test';

import { checkLinkIntegrity } from '../../dist/core/docs-link-integrity.js';
import { createTempProject, removeTempProject } from './helpers/cli-harness.js';

test('repeated anchor links read their target once and retain per-link results', (t) => {
	const root = createTempProject();
	const source = path.join(root, 'README.md');
	const target = path.join(root, 'guide.md');
	const originalOpen = fs.openSync;
	let reads = 0;
	try {
		fs.writeFileSync(source, '[first](guide.md#heading)\n[duplicate](./guide.md#heading-1)\n[missing](guide.md#missing)\n'.repeat(100));
		fs.writeFileSync(target, '# Heading\n# Heading\n' + 'ordinary paragraph\n'.repeat(1000));
		t.mock.method(fs, 'openSync', function (file, ...args) {
			if (file === target) reads++;
			return originalOpen.call(this, file, ...args);
		});
		syncBuiltinESMExports();
		const report = checkLinkIntegrity(root, { paths: [source] });
		assert.equal(report.status, 'failed');
		assert.equal(report.summary.links_checked, 300);
		assert.equal(report.summary.ok, 200);
		assert.equal(report.summary.missing, 100);
		assert.equal(reads, 1);

		fs.writeFileSync(target, '# Replaced\n');
		const refreshed = checkLinkIntegrity(root, { paths: [source] });
		assert.equal(refreshed.summary.missing, 300);
		assert.equal(reads, 2, 'a later inspection must read current contents');
	} finally {
		t.mock.restoreAll();
		syncBuiltinESMExports();
		removeTempProject(root);
	}
});

test('anchor reuse observes a rewrite between links within one inspection', (t) => {
	const root = createTempProject();
	const source = path.join(root, 'README.md');
	const target = path.join(root, 'guide.md');
	const originalExists = fs.existsSync;
	let visits = 0;
	try {
		fs.writeFileSync(source, '[next](guide.md#new)\n'.repeat(3));
		fs.writeFileSync(target, '# Old\n');
		t.mock.method(fs, 'existsSync', function (file) {
			if (file === target && ++visits === 2) {
				fs.writeFileSync(target, '# New\n');
				fs.utimesSync(target, new Date(100000), new Date(100000));
			}
			return originalExists.call(this, file);
		});
		syncBuiltinESMExports();
		const report = checkLinkIntegrity(root, { paths: [source] });
		assert.deepEqual(report.links.map(link => link.status), ['missing', 'ok', 'ok']);
	} finally {
		t.mock.restoreAll();
		syncBuiltinESMExports();
		removeTempProject(root);
	}
});

test('anchor reuse still rejects a target replaced with a directory', (t) => {
	const root = createTempProject();
	const source = path.join(root, 'README.md');
	const target = path.join(root, 'guide.md');
	const originalExists = fs.existsSync;
	let visits = 0;
	try {
		fs.writeFileSync(source, '[target](guide.md#target)\n'.repeat(3));
		fs.writeFileSync(target, '# Target\n');
		t.mock.method(fs, 'existsSync', function (file) {
			if (file === target && ++visits === 2) {
				fs.unlinkSync(target);
				fs.mkdirSync(target);
			}
			return originalExists.call(this, file);
		});
		syncBuiltinESMExports();
		const report = checkLinkIntegrity(root, { paths: [source] });
		assert.equal(report.status, 'error');
		assert.equal(report.links.length, 1);
		assert.equal(report.findings.filter(finding => finding.code === 'link_integrity_unreadable_path').length, 2);
	} finally {
		t.mock.restoreAll();
		syncBuiltinESMExports();
		removeTempProject(root);
	}
});
