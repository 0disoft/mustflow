import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, projectRoot, runCliInProcess } from './helpers/cli-harness.js';
import {
	createLocalIndexDirect,
	createMinimalWorkflowProject,
	getCachedIndexedProjectFixture,
	loadSqlJsCached,
	prepareInvalidSourceAnchorProject,
	prepareSourceAnchorProject,
	prepareSourceAnchorStatusProject,
	prepareSourceIndexConfigProject,
	queryRows,
	removeTempProject,
	sourceAnchorStatusChangedSource,
} from './index-support.js';

test('does not index source anchors unless source indexing is requested', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-opt-in-');

	try {
		prepareSourceAnchorProject(projectPath);

		const output = await createLocalIndexDirect(projectPath);
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchorCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchors');
		const [sourceIndexedFileCount] = queryRows(
			database,
			'SELECT COUNT(*) AS count FROM indexed_source_candidates',
		);

		assert.equal(output.source_index_enabled, false);
		assert.equal(output.source_anchor_count, 0);
		assert.equal(anchorCount.count, 0);
		assert.equal(sourceIndexedFileCount.count, 0);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('indexes source anchors only when source indexing is requested', async () => {
	const fixture = getCachedIndexedProjectFixture({
		variant: 'source-anchors',
		indexArgs: ['--source'],
		prepare: prepareSourceAnchorProject,
		prepareKey: 'source-anchors-v1',
	});
	const projectPath = fixture.projectPath;

	const output = fixture.indexOutput;
	const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
	const SQL = await loadSqlJsCached();
	const database = new SQL.Database(readFileSync(indexPath));
	const [anchor] = queryRows(database, 'SELECT * FROM source_anchors WHERE id = "auth.session.resolve"');
	const [fingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.resolve"');
	const [constFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.mapper"');
	const [classFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.store"');
	const [methodFingerprint] = queryRows(database, 'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "auth.session.store.get-user"');
	const [status] = queryRows(database, 'SELECT * FROM source_anchor_status WHERE anchor_id = "auth.session.resolve"');

	assert.equal(output.schema_version, '21');
	assert.equal(output.source_index_enabled, true);
	assert.equal(output.source_anchor_count, 4);
	assert.ok(output.indexed_paths.includes('src/auth.ts'));
	assert.equal(anchor.path, 'src/auth.ts');
	assert.equal(anchor.purpose, 'Map verified server session claims to app user context.');
	assert.equal(anchor.search_terms, 'login, session refresh, role mapping, authorization');
	assert.equal(anchor.risk, 'authz, pii');
	assert.equal(anchor.navigation_only, 1);
	assert.equal(anchor.can_instruct_agent, 0);
	assert.match(fingerprint.anchor_metadata_hash, /^sha256:/);
	assert.match(fingerprint.anchor_text_hash, /^sha256:/);
	assert.match(fingerprint.context_hash, /^sha256:/);
	assert.equal(fingerprint.symbol_kind, 'function');
	assert.equal(fingerprint.symbol_name, 'resolveSessionUser');
	assert.equal(fingerprint.symbol_exported, 1);
	assert.match(fingerprint.signature_hash, /^sha256:/);
	assert.match(fingerprint.body_hash, /^sha256:/);
	assert.equal(fingerprint.symbol_start_line, 8);
	assert.equal(fingerprint.symbol_end_line, 10);
	assert.equal(constFingerprint.symbol_kind, 'const');
	assert.equal(constFingerprint.symbol_name, 'sessionMapper');
	assert.equal(constFingerprint.symbol_exported, 1);
	assert.equal(classFingerprint.symbol_kind, 'class');
	assert.equal(classFingerprint.symbol_name, 'SessionStore');
	assert.equal(classFingerprint.symbol_exported, 0);
	assert.equal(methodFingerprint.symbol_kind, 'method');
	assert.equal(methodFingerprint.symbol_name, 'getUser');
	assert.equal(methodFingerprint.symbol_exported, 1);
	assert.equal(status.status, 'valid');
	assert.equal(status.confidence, 1);
	assert.equal(status.identity_signal, 'current_anchor_id_valid');
	assert.equal(status.symbol_signal, 'current_symbol_fingerprinted');
	assert.equal(status.body_signal, 'current_body_fingerprinted');
	assert.equal(status.navigation_only, 1);
	assert.equal(status.can_instruct_agent, 0);
	assert.equal(Object.hasOwn(anchor, 'source_content'), false);
	database.close();
});

test('indexes YAML service contract source anchors', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-yaml-source-anchor-');

	try {
		writeFileSync(
			path.join(projectPath, 'service.yaml'),
			[
				'# mf:anchor contracts.service.yaml',
				'# purpose: Locate machine-readable service ownership and boundary metadata.',
				'# search: service contract, ownership, platform boundary',
				'# invariant: YAML contract anchors remain navigation metadata only.',
				'# risk: config',
				'service:',
				'  id: service-yaml',
				'',
			].join('\n'),
		);

		const output = await createLocalIndexDirect(projectPath, { includeSource: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchor] = queryRows(database, 'SELECT * FROM source_anchors WHERE id = "contracts.service.yaml"');
		const [fingerprint] = queryRows(
			database,
			'SELECT * FROM source_anchor_fingerprints WHERE anchor_id = "contracts.service.yaml"',
		);
		const indexedSourcePaths = queryRows(
			database,
			'SELECT path FROM indexed_source_candidates ORDER BY path',
		).map((row) => row.path);

		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 1);
		assert.deepEqual(indexedSourcePaths, ['service.yaml']);
		assert.equal(anchor.path, 'service.yaml');
		assert.equal(anchor.purpose, 'Locate machine-readable service ownership and boundary metadata.');
		assert.equal(anchor.search_terms, 'service contract, ownership, platform boundary');
		assert.equal(anchor.risk, 'config');
		assert.equal(anchor.navigation_only, 1);
		assert.equal(anchor.can_instruct_agent, 0);
		assert.equal(fingerprint.symbol_kind, 'unknown');
		assert.equal(fingerprint.symbol_name, null);
		assert.equal(fingerprint.symbol_exported, 0);
		assert.equal(fingerprint.signature_hash, null);
		assert.equal(fingerprint.body_hash, null);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('source incremental index reuses unchanged candidate fingerprints before parsing anchors', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-preflight-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'src', 'with-anchor.ts'),
			`/**
 * mf:anchor source.preflight.cached
 * purpose: Track source index preflight reuse.
 * search: source index preflight
 * invariant: Candidate fingerprints can prove unchanged source files before parsing anchors.
 * risk: cache
 */
export const cachedAnchor = true;
`,
		);
		writeFileSync(path.join(projectPath, 'src', 'plain.ts'), 'export const plainSource = true;\n');

		const firstOutput = await createLocalIndexDirect(projectPath, { includeSource: true });
		const secondOutput = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const indexedSourcePaths = queryRows(
			database,
			'SELECT path FROM indexed_source_candidates ORDER BY path',
		).map((row) => row.path);
		const anchorRows = queryRows(database, 'SELECT id, path FROM source_anchors ORDER BY id');

		assert.equal(firstOutput.source_anchor_count, 1);
		assert.equal(secondOutput.index_mode, 'incremental');
		assert.equal(secondOutput.reused_existing, true);
		assert.equal(secondOutput.wrote_files, false);
		assert.equal(secondOutput.rebuild_reason, null);
		assert.equal(secondOutput.source_anchor_count, 1);
		assert.deepEqual(indexedSourcePaths, ['src/plain.ts', 'src/with-anchor.ts']);
		assert.deepEqual(anchorRows, [{ id: 'source.preflight.cached', path: 'src/with-anchor.ts' }]);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('source index skips volatile and generated source candidate directories by default', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-prune-generated-');

	try {
		const keptSource = `/**
 * mf:anchor source.prune.kept
 * purpose: Keep source anchors in ordinary source directories.
 * search: source index prune kept
 * invariant: Default source indexing keeps ordinary source files.
 * risk: cache
 */
export const keptAnchor = true;
`;
		const skippedSource = (id, label) => `/**
 * mf:anchor source.prune.${id}
 * purpose: ${label} should not enter source indexing.
 * search: source index prune skipped
 * invariant: Generated, cache, and temporary trees stay out of source indexing.
 * risk: cache
 */
export const skippedAnchor = true;
`;

		const skippedFiles = [
			['.tmp/ohrisk-e2e/prettier/tests/format/typescript/example.ts', 'tmp-prettier', 'Temporary formatter output'],
			['.tmp-agent-repair-markrail/src/transient.ts', 'tmp-agent-repair', 'Agent repair scratch output'],
			['.cache/generated.ts', 'cache', 'Cache output'],
			['.next/server/page.ts', 'next', 'Next.js build output'],
			['.nuxt/server/page.ts', 'nuxt', 'Nuxt build output'],
			['.svelte-kit/output/server/page.js', 'svelte-kit', 'SvelteKit build output'],
			['.astro/types.d.ts', 'astro', 'Astro generated output'],
			['out/server.js', 'out', 'Generic output'],
			['target/debug/build.rs', 'target', 'Rust build output'],
			['src/generated/client.ts', 'generated', 'Generated source output'],
		];

		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'kept.ts'), keptSource);

		for (const [relativePath, id, label] of skippedFiles) {
			const absolutePath = path.join(projectPath, ...relativePath.split('/'));
			mkdirSync(path.dirname(absolutePath), { recursive: true });
			writeFileSync(absolutePath, skippedSource(id, label));
		}

		const output = await createLocalIndexDirect(projectPath, { includeSource: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const indexedSourcePaths = queryRows(
			database,
			'SELECT path FROM indexed_source_candidates ORDER BY path',
		).map((row) => row.path);
		const anchorRows = queryRows(database, 'SELECT id, path FROM source_anchors ORDER BY id');

		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 1);
		assert.deepEqual(indexedSourcePaths, ['src/kept.ts']);
		assert.deepEqual(anchorRows, [{ id: 'source.prune.kept', path: 'src/kept.ts' }]);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('source indexed file records fail closed when a required source candidate disappears', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-disappeared-candidate-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'kept.ts'), 'export const keptSource = true;\n');

		const { collectIndexedFileRecords } = await import('../../dist/cli/lib/local-index/source-index.js');
		assert.throws(
			() => collectIndexedFileRecords(projectPath, [], [], ['src/disappeared.ts', 'src/kept.ts']),
			/ENOENT|no such file/u,
		);
	} finally {
		removeTempProject(projectPath);
	}
});

test('source incremental reuse compares mixed-case candidate paths as a set in both reuse phases', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-mixed-case-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(path.join(projectPath, 'src', 'B.ts'), 'export const upper = true;\n');
		writeFileSync(path.join(projectPath, 'src', 'a.ts'), 'export const lower = true;\n');
		await createLocalIndexDirect(projectPath, { includeSource: true });

		const preflightReuse = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		assert.equal(preflightReuse.reused_existing, true);
		assert.equal(preflightReuse.wrote_files, false);
		assert.equal(preflightReuse.rebuild_reason, null);

		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		try {
			database.run('UPDATE indexed_files SET mtime_ms = mtime_ms + 10 WHERE path = ?', ['src/B.ts']);
			writeFileSync(indexPath, database.export());
		} finally {
			database.close();
		}

		const postCollectionReuse = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		assert.equal(postCollectionReuse.reused_existing, true);
		assert.equal(postCollectionReuse.wrote_files, false);
		assert.equal(postCollectionReuse.rebuild_reason, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('source preflight compares metadata before hashing content', () => {
	const localIndexSource = readFileSync(path.join(projectRoot, 'src', 'cli', 'lib', 'local-index', 'source-index.ts'), 'utf8');
	const preflightStart = localIndexSource.indexOf('function collectFastPreflightIndexedFileMetadataRecords');
	const preflightEnd = localIndexSource.length;
	const preflightFunction = localIndexSource.slice(preflightStart, preflightEnd);

	assert.notEqual(preflightStart, -1);
	assert.match(preflightFunction, /readIndexedFileMetadataRecord/u);
	assert.doesNotMatch(preflightFunction, /readIndexedFileRecord|sha256Bytes|contentHash|readFileSync/u);
});

test('source incremental index rebuilds when the candidate source set changes', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-candidate-change-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(
			path.join(projectPath, 'src', 'with-anchor.ts'),
			`/**
 * mf:anchor source.preflight.changed-set
 * purpose: Track source index candidate set changes.
 * search: source index candidate set
 * invariant: New candidate source files force a deterministic incremental rebuild.
 * risk: cache
 */
export const changedSetAnchor = true;
`,
		);
		await createLocalIndexDirect(projectPath, { includeSource: true });
		writeFileSync(path.join(projectPath, 'src', 'new-plain.ts'), 'export const newPlainSource = true;\n');

		const output = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const indexedSourcePaths = queryRows(
			database,
			'SELECT path FROM indexed_source_candidates ORDER BY path',
		).map((row) => row.path);
		const anchorRows = queryRows(database, 'SELECT id, path FROM source_anchors ORDER BY id');

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'source_scope_mismatch');
		assert.equal(output.source_anchor_count, 1);
		assert.deepEqual(indexedSourcePaths, ['src/new-plain.ts', 'src/with-anchor.ts']);
		assert.deepEqual(anchorRows, [{ id: 'source.preflight.changed-set', path: 'src/with-anchor.ts' }]);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('source incremental index rebuilds when a source file changes without size or mtime drift', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-same-fingerprint-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		const sourcePath = path.join(projectPath, 'src', 'with-anchor.ts');
		const originalSource = `/**
 * mf:anchor source.preflight.same-fingerprint
 * purpose: Initial source anchor metadata.
 * search: source same fingerprint
 * invariant: Metadata-identical edits still force rebuild.
 * risk: cache
 */
export const sameFingerprintAnchor = true;
`;
		const changedSource = originalSource.replace('Initial source anchor metadata.', 'Changed source anchor metadata.');

		assert.equal(changedSource.length, originalSource.length);
		writeFileSync(sourcePath, originalSource);
		await createLocalIndexDirect(projectPath, { includeSource: true });

		const originalStats = statSync(sourcePath);
		writeFileSync(sourcePath, changedSource);
		utimesSync(sourcePath, originalStats.atime, originalStats.mtime);

		const output = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const [anchor] = queryRows(
			database,
			'SELECT purpose FROM source_anchors WHERE id = "source.preflight.same-fingerprint"',
		);

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.wrote_files, true);
		assert.equal(anchor.purpose, 'Changed source anchor metadata.');
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('uses index config to bound source anchor scanning', async () => {
	const fixture = getCachedIndexedProjectFixture({
		variant: 'source-index-config',
		prepare: prepareSourceIndexConfigProject,
		prepareKey: 'source-index-config-v1',
	});
	const projectPath = fixture.projectPath;

	const output = fixture.indexOutput;
	const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
	const SQL = await loadSqlJsCached();
	const database = new SQL.Database(readFileSync(indexPath));
	const anchorRows = queryRows(database, 'SELECT id, path, navigation_only, can_instruct_agent FROM source_anchors ORDER BY id');

	assert.equal(output.source_index_enabled, true);
	assert.equal(output.source_anchor_count, 1);
	assert.deepEqual(anchorRows, [
		{
			id: 'source.config.kept',
			path: 'src/kept/anchor.ts',
			navigation_only: 1,
			can_instruct_agent: 0,
		},
	]);
	database.close();
});

test('applies the default source index file-size ceiling', async () => {
	const projectPath = createMinimalWorkflowProject('mustflow-index-source-hard-limit-');

	try {
		mkdirSync(path.join(projectPath, 'src'), { recursive: true });
		writeFileSync(
			path.join(projectPath, '.mustflow', 'config', 'index.toml'),
			['[source_index]', 'enabled_by_default = true', 'include = ["src/**/*.ts"]', 'allowed_extensions = [".ts"]', ''].join('\n'),
		);
		writeFileSync(
			path.join(projectPath, 'src', 'small.ts'),
			`/**
 * mf:anchor source.default.small
 * purpose: Keep this bounded source anchor.
 * search: default source limit
 * invariant: Default source indexing can read small source files.
 */
export const smallAnchor = true;
`,
		);
		writeFileSync(
			path.join(projectPath, 'src', 'large.ts'),
			`/**
 * mf:anchor source.default.large
 * purpose: This oversized source anchor should be skipped by the default source limit.
 * search: oversized source limit
 * invariant: Default source indexing skips oversized source files.
 */
export const largeAnchor = true;
${'x'.repeat(270000)}
`,
		);

		const output = await createLocalIndexDirect(projectPath);

		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const anchorRows = queryRows(database, 'SELECT id, path FROM source_anchors ORDER BY id');
		const [metadataLimit] = queryRows(database, 'SELECT value FROM metadata WHERE key = "source_index_max_file_bytes"');

		assert.equal(output.source_index_enabled, true);
		assert.equal(output.source_anchor_count, 1);
		assert.deepEqual(anchorRows, [{ id: 'source.default.small', path: 'src/small.ts' }]);
		assert.equal(metadataLimit.value, '262144');
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('does not index invalid source anchors and leaves them to strict validation', async () => {
	const fixture = getCachedIndexedProjectFixture({
		variant: 'invalid-source-anchors',
		indexArgs: ['--source'],
		prepare: prepareInvalidSourceAnchorProject,
		prepareKey: 'invalid-source-anchors-v1',
	});
	const projectPath = fixture.projectPath;

	const output = fixture.indexOutput;
	const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
	const SQL = await loadSqlJsCached();
	const database = new SQL.Database(readFileSync(indexPath));
	const [anchorCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchors');
	const [statusCount] = queryRows(database, 'SELECT COUNT(*) AS count FROM source_anchor_status');
	const checkResult = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
	const check = JSON.parse(checkResult.stdout);
	const issueIds = new Set(check.issueDetails.map((issue) => issue.id));

	assert.equal(output.source_index_enabled, true);
	assert.equal(output.source_anchor_count, 0);
	assert.equal(anchorCount.count, 0);
	assert.equal(statusCount.count, 0);
	assert.equal(checkResult.status, 1);
	assert.ok(issueIds.has('mustflow.source_anchor.invalid_format'));
	assert.ok(issueIds.has('mustflow.source_anchor.secret_like'));
	database.close();
});

test('compares source anchor status against the previous fingerprint snapshot', async () => {
	const projectPath = createTempProject('mustflow-index-source-status-');

	try {
		initProject(projectPath);
		prepareSourceAnchorStatusProject(projectPath);
		await createLocalIndexDirect(projectPath, { includeSource: true });
		const sourcePath = path.join(projectPath, 'src', 'anchors.ts');
		writeFileSync(sourcePath, sourceAnchorStatusChangedSource());

		const output = await createLocalIndexDirect(projectPath, { includeSource: true, incremental: true });
		const indexPath = path.join(projectPath, '.mustflow', 'cache', 'mustflow.sqlite');
		const SQL = await loadSqlJsCached();
		const database = new SQL.Database(readFileSync(indexPath));
		const statuses = Object.fromEntries(
			queryRows(database, 'SELECT anchor_id, status, confidence, risk_signal FROM source_anchor_status').map((row) => [
				row.anchor_id,
				row,
			]),
		);
		const riskSignals = queryRows(database, 'SELECT * FROM source_anchor_risk_signals ORDER BY anchor_id');

		assert.equal(output.index_mode, 'incremental');
		assert.equal(output.reused_existing, false);
		assert.equal(output.rebuild_reason, 'file_fingerprint_mismatch');
		assert.equal(output.source_anchor_count, 4);
		assert.equal(output.source_anchor_risk_signal_count, 3);
		assert.equal(statuses['docs.helper'].status, 'changed');
		assert.equal(statuses['auth.critical'].status, 'review');
		assert.equal(statuses['auth.critical'].risk_signal, 'high_risk_anchor_requires_review_after_change');
		assert.equal(statuses['moved.target'].status, 'moved');
		assert.equal(statuses['stale.target'].status, 'stale');
		assert.ok(statuses['stale.target'].confidence < 0.5);
		assert.deepEqual(
			riskSignals.map((signal) => ({
				anchor_id: signal.anchor_id,
				status: signal.status,
				risk_signal: signal.risk_signal,
				path_hash_matches: /^sha256:/u.test(signal.path_hash),
				navigation_only: signal.navigation_only,
				can_instruct_agent: signal.can_instruct_agent,
			})),
			[
				{
					anchor_id: 'auth.critical',
					status: 'review',
					risk_signal: 'high_risk_anchor_requires_review_after_change',
					path_hash_matches: true,
					navigation_only: 1,
					can_instruct_agent: 0,
				},
				{
					anchor_id: 'docs.helper',
					status: 'changed',
					risk_signal: 'no_risk_tags',
					path_hash_matches: true,
					navigation_only: 1,
					can_instruct_agent: 0,
				},
				{
					anchor_id: 'stale.target',
					status: 'stale',
					risk_signal: 'previous_risk_tags_only',
					path_hash_matches: true,
					navigation_only: 1,
					can_instruct_agent: 0,
				},
			],
		);

		const checkResult = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(checkResult.stdout);
		const sourceAnchorStatusWarnings = check.issueDetails.filter((issue) => issue.id === 'mustflow.source_anchor.index_status');

		assert.equal(checkResult.status, 0, checkResult.stderr || checkResult.stdout);
		assert.equal(check.ok, true);
		assert.ok(sourceAnchorStatusWarnings.length >= 3);
		assert.ok(
			sourceAnchorStatusWarnings.some((issue) =>
				issue.message.includes('source anchor local index marks anchor "stale.target" as stale'),
			),
		);
		database.close();
	} finally {
		removeTempProject(projectPath);
	}
});

test('strict check warns when generated source anchor index points at deleted source files', async () => {
	const projectPath = createTempProject('mustflow-check-source-index-stale-');

	try {
		initProject(projectPath);
		prepareSourceAnchorProject(projectPath);
		await createLocalIndexDirect(projectPath, { includeSource: true });
		rmSync(path.join(projectPath, 'src', 'auth.ts'));

		const checkResult = await runCliInProcess(projectPath, ['check', '--strict', '--json']);
		const check = JSON.parse(checkResult.stdout);
		const staleWarning = check.issueDetails.find((issue) => issue.id === 'mustflow.source_anchor.index_stale');

		assert.equal(checkResult.status, 0, checkResult.stderr || checkResult.stdout);
		assert.equal(check.ok, true);
		assert.ok(staleWarning);
		assert.equal(staleWarning.severity, 'warning');
		assert.match(staleWarning.message, /source anchor local index is stale for source paths: src\/auth\.ts/u);
	} finally {
		removeTempProject(projectPath);
	}
});
