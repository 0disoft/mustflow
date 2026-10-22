import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createExternalSkillImportReport } from '../../dist/cli/lib/external-skill-import.js';
import { mapExternalSkillFiles, withExternalSkillReadSlot } from '../../dist/cli/lib/external-skill-downloads.js';

const sourceUrl = 'https://github.com/example/skills/tree/main/review';
const mainText = '# Review\n';
const json = (value, status = 200) => new Response(JSON.stringify(value), { status });

function downloadFixture(count, contentFor = (index) => `file ${index}\n`) {
	const stats = { active: 0, peak: 0, downloads: 0, metadata: 0 };
	return {
		stats,
		async fetch(url, options) {
			const address = String(url);
			if (address.includes('/contents/review/SKILL.md?')) return json({ type: 'file', name: 'SKILL.md', path: 'review/SKILL.md', content: Buffer.from(mainText).toString('base64'), encoding: 'base64' });
			if (address.includes('/contents/review/scripts?')) return json(Array.from({ length: count }, (_, index) => ({ type: 'file', name: `${index}.txt`, path: `review/scripts/${index}.txt`, download_url: `https://raw.example.invalid/${index}` })).reverse());
			if (address.startsWith('https://raw.example.invalid/')) {
				const index = Number(new URL(address).pathname.slice(1));
				stats.downloads += 1;
				return { ok: true, status: 200, async text() {
					stats.active += 1;
					stats.peak = Math.max(stats.peak, stats.active);
					try {
						await new Promise((resolve) => setImmediate(resolve));
						options.signal.throwIfAborted();
						return contentFor(index);
					} finally { stats.active -= 1; }
				} };
			}
			if (address.includes('/contents/review/scripts/')) stats.metadata += 1;
			return json({ message: 'not found' }, 404);
		},
	};
}

test('concurrent imports share four HTTP slots and reuse directory metadata', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-download-limit-'));
	const fixture = downloadFixture(12);
	try {
		const reports = await Promise.all(Array.from({ length: 3 }, () => createExternalSkillImportReport(root, sourceUrl, { mode: 'dry_run', fetch: fixture.fetch })));
		for (const report of reports) {
			assert.equal(report.ok, true, report.issues.join('\n'));
			assert.deepEqual(report.files.map((file) => file.relative_path), [...report.files.map((file) => file.relative_path)].sort((a, b) => a.localeCompare(b)));
		}
		assert.ok(fixture.stats.peak > 1);
		assert.ok(fixture.stats.peak <= 4);
		assert.equal(fixture.stats.active, 0);
		assert.equal(fixture.stats.metadata, 0);
		assert.equal(fixture.stats.downloads, 36);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('file count and cumulative byte budgets reject before installing', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-download-budget-'));
	try {
		for (const count of [39, 40]) {
			const fixture = downloadFixture(count);
			const report = await createExternalSkillImportReport(root, sourceUrl, { mode: 'dry_run', fetch: fixture.fetch });
			assert.equal(report.ok, count === 39, report.issues.join('\n'));
			assert.equal(fixture.stats.downloads, count === 39 ? 39 : 0);
		}
		for (const excess of [0, 1]) {
			const fixture = downloadFixture(3, (index) => 'x'.repeat([262144, 262144 - Buffer.byteLength(mainText) - 1, 1 + excess][index]));
			const report = await createExternalSkillImportReport(root, sourceUrl, { mode: 'dry_run', fetch: fixture.fetch });
			assert.equal(report.ok, excess === 0, report.issues.join('\n'));
			if (excess) assert.match(report.issues.join('\n'), /exceeds 524288 bytes/u);
		}
		assert.equal(existsSync(path.join(root, '.mustflow/external-skills')), false);
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('failed file workers cancel siblings and never schedule the remaining files', async () => {
	const failure = new Error('first download failed');
	let started = 0;
	let stopped = 0;
	await assert.rejects(mapExternalSkillFiles(Array.from({ length: 20 }, (_, i) => i), undefined, async (index, signal) => {
		started += 1;
		if (index === 0) throw failure;
		await new Promise((resolve, reject) => signal.addEventListener('abort', () => { stopped += 1; reject(signal.reason); }, { once: true }));
	}), (error) => error === failure);
	assert.equal(started, 4);
	assert.equal(stopped, 3);
});

test('base64 file responses obey the same per-file byte ceiling as downloads', async () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-download-base64-'));
	try {
		for (const excess of [0, 1]) {
			const report = await createExternalSkillImportReport(root, sourceUrl, {
				mode: 'dry_run',
				fetch: async (url) => String(url).includes('/SKILL.md?')
					? json({ type: 'file', name: 'SKILL.md', path: 'review/SKILL.md', content: Buffer.from('x'.repeat(262144 + excess)).toString('base64'), encoding: 'base64' })
					: json({ message: 'not found' }, 404),
			});
			assert.equal(report.ok, excess === 0, report.issues.join('\n'));
			if (excess) assert.match(report.issues.join('\n'), /exceeds 262144 bytes/u);
		}
	} finally { rmSync(root, { recursive: true, force: true }); }
});

test('queued cancellation releases its listener and leaves all read slots reusable', async () => {
	const releases = [];
	const active = Array.from({ length: 4 }, () => withExternalSkillReadSlot(undefined, () => new Promise((resolve) => releases.push(resolve))));
	await new Promise((resolve) => setImmediate(resolve));
	const controller = new AbortController();
	const reason = new Error('cancel queued read');
	let started = false;
	const queued = withExternalSkillReadSlot(controller.signal, async () => { started = true; });
	controller.abort(reason);
	await assert.rejects(queued, (error) => error === reason);
	for (const release of releases) release();
	await Promise.all(active);
	assert.equal(started, false);
	assert.deepEqual(await Promise.all(Array.from({ length: 4 }, (_, index) => withExternalSkillReadSlot(undefined, async () => index))), [0, 1, 2, 3]);
});
