import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import {
	orderTestPathsByProfile,
	profileDurationForTestPath,
	profileOrderingSummary,
	readProfileDurations,
	readProfileTimingEvidence,
} from '../../../scripts/lib/test-ordering.mjs';

export const projectRoot = path.resolve(fileURLToPath(new URL('../../..', import.meta.url)));
export const runTests = [
	'run-execution.test.js',
	'run-preview.test.js',
	'run-receipts.test.js',
	'run-safety.test.js',
];
export const indexTests = [
	'index-workflow.test.js',
	'index-verification-evidence.test.js',
	'index-source-anchors.test.js',
];
export const dashboardTests = [
	'dashboard-preferences.test.js',
	'dashboard-rendering.test.js',
	'dashboard-safety.test.js',
	'dashboard-verification.test.js',
];
export const schemaSmokeTests = [
	'schema-api-workspace-contracts.test.js',
	'schema-cli-output-contracts.test.js',
	'schema-command-contracts.test.js',
	'schema-docs-workflow-contracts.test.js',
	'schema-explain-verify-output.test.js',
	'schema-manifest-contracts.test.js',
	'schema-script-pack-code-contracts.test.js',
	'schema-script-pack-repo-contracts.test.js',
];
export const scriptPackContractTests = [
	'script-pack-catalog-contracts.test.js',
	'script-pack-code-boundary-contracts.test.js',
	'script-pack-code-change-contracts.test.js',
	'script-pack-code-outline-contracts.test.js',
	'script-pack-code-symbol-read-contracts.test.js',
	'script-pack-docs-contracts.test.js',
	'script-pack-repo-security-contracts.test.js',
	'script-pack-repo-surface-contracts.test.js',
	'script-pack-route-related-contracts.test.js',
	'script-pack-suggest-code-contracts.test.js',
	'script-pack-suggest-repo-contracts.test.js',
	'script-pack-suggest-safety-contracts.test.js',
	'script-pack-test-tool-contracts.test.js',
	'script-pack-text-generated-contracts.test.js',
	...schemaSmokeTests,
];
export const packageContractTests = [
	'package-command-contracts.test.js',
	'package-metadata-contracts.test.js',
	'package-release-workflow-contracts.test.js',
	'package-template-skill-contracts.test.js',
];

export function toPosixPath(filePath) {
	return filePath.split(path.sep).join('/');
}

export function uniqueSorted(values) {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

export function readProjectFile(relativePath) {
	return readFileSync(path.join(projectRoot, ...relativePath.split('/')), 'utf8');
}

export function extractRegisteredScriptPackWrapperPaths() {
	const registrySource = readProjectFile('src/cli/lib/script-pack-registry.ts');
	const importPattern = /import\(['"]\.\.\/script-packs\/([^'"]+)\.js['"]\)/gu;
	const wrapperPaths = [...registrySource.matchAll(importPattern)].map((match) => `src/cli/script-packs/${match[1]}.ts`);

	assert.notEqual(wrapperPaths.length, 0, 'script-pack registry should expose loadRunner wrapper imports');
	return uniqueSorted(wrapperPaths);
}

export function extractCoreImplementationPathsFromWrappers(wrapperPaths) {
	const corePaths = [];

	for (const wrapperPath of wrapperPaths) {
		const wrapperSource = readProjectFile(wrapperPath);
		const importPattern = /from\s+['"]\.\.\/\.\.\/core\/([^'"]+)\.js['"]/gu;

		for (const match of wrapperSource.matchAll(importPattern)) {
			const corePath = `src/core/${match[1]}.ts`;
			const absoluteCorePath = path.join(projectRoot, ...corePath.split('/'));
			const coreSource = existsSync(absoluteCorePath) ? readFileSync(absoluteCorePath, 'utf8') : '';
			if (/export const [A-Z_]+_SCRIPT_REF\b/u.test(coreSource)) {
				corePaths.push(corePath);
			}
		}
	}

	return uniqueSorted(corePaths);
}

export const scriptPackWrapperPaths = extractRegisteredScriptPackWrapperPaths();
export const scriptPackCoreImplementationPaths = extractCoreImplementationPathsFromWrappers(scriptPackWrapperPaths);
export const scriptPackRelatedSelectionPaths = uniqueSorted([
	...scriptPackWrapperPaths,
	...scriptPackCoreImplementationPaths,
	'src/core/change-impact.ts',
	'src/core/change-surface-classification.ts',
	'src/core/script-pack-suggestions.ts',
	'src/core/test-regression-selector.ts',
]);

export const precomputedSelectionRequests = [
	{ mode: 'related', changedFiles: ['src/cli/commands/verify.ts'] },
	{ mode: 'related', changedFiles: ['src/cli/index.ts'] },
	{ mode: 'related', changedFiles: ['src/core/command-intent-eligibility.ts'] },
	{ mode: 'related', changedFiles: ['src/core/public-json-contracts.ts'] },
	{ mode: 'related', changedFiles: ['.mustflow/config/commands.toml'] },
	{ mode: 'related', changedFiles: ['src/cli/lib/package-info.ts'] },
	{ mode: 'related', changedFiles: ['scripts/run-cli-tests.mjs'] },
	{ mode: 'related', changedFiles: ['scripts/audit-related-selection.mjs'] },
	{ mode: 'related', changedFiles: ['scripts/analyze-test-ops.mjs'] },
	{ mode: 'related', changedFiles: ['scripts/lib/build-freshness.mjs'] },
	{ mode: 'related', changedFiles: ['scripts/lib/test-selection.mjs'] },
	{ mode: 'related', changedFiles: ['scripts/lib/test-ordering.mjs'] },
	{ mode: 'related-cached', changedFiles: ['src/core/line-endings.ts'] },
	{ mode: 'related', changedFiles: ['package.json'] },
	{ mode: 'related', changedFiles: ['misc/notes.txt'] },
	{ mode: 'related', changedFiles: [] },
	{ mode: 'related-profile', changedFiles: [] },
	...scriptPackRelatedSelectionPaths.map((changedFile) => ({ mode: 'related', changedFiles: [changedFile] })),
	{ mode: 'related', changedFiles: ['src/core/line-endings.ts'] },
	{ mode: 'related', changedFiles: ['src/cli/commands/line-endings.ts'] },
	{ mode: 'related', changedFiles: ['src/core/change-verification.ts'] },
	{ mode: 'related', changedFiles: ['tests/cli/helpers/cli-harness.js'] },
	{ mode: 'related', changedFiles: ['tests/cli/helpers/ops-profiler.js'] },
	{ mode: 'related', changedFiles: ['tests/cli/helpers/test-selection-contracts.js'] },
	{ mode: 'related', changedFiles: ['templates/default/AGENTS.md'] },
	{ mode: 'related', changedFiles: ['src/cli/commands/init.ts'] },
	{ mode: 'related', changedFiles: ['.mustflow/skills/cpp-code-change/SKILL.md'] },
	{ mode: 'related', changedFiles: ['templates/default/locales/en/.mustflow/skills/cpp-code-change/SKILL.md'] },
	{ mode: 'related', changedFiles: ['src/core/new-cross-cutting-module.ts'] },
	{ mode: 'related', changedFiles: ['src/cli/lib/new-cross-cutting-helper.ts'] },
	{ mode: 'related', changedFiles: ['tests/cli/helpers/new-shared-utils.js'] },
	{ mode: 'related', changedFiles: ['src\\core\\line-endings.ts'] },
	{ mode: 'fast', changedFiles: [] },
	{ mode: 'full', changedFiles: [] },
	{ mode: 'full-auto', changedFiles: [] },
];

let precomputedSelectionReports;

export function selectionCacheKey(mode, changedFiles) {
	return JSON.stringify([mode, changedFiles]);
}

export function loadPrecomputedSelectionReports() {
	if (precomputedSelectionReports) {
		return precomputedSelectionReports;
	}

	const tempRoot = mkdtempSync(path.join(tmpdir(), 'mustflow-test-selection-'));
	const requestPath = path.join(tempRoot, 'requests.json');

	try {
		writeFileSync(
			requestPath,
			`${JSON.stringify(precomputedSelectionRequests.map((request) => ({ mode: request.mode, changed_files: request.changedFiles })))}\n`,
		);

		const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', `--list-batch=${requestPath}`], {
			cwd: projectRoot,
			encoding: 'utf8',
		});

		assert.equal(result.status, 0, result.stderr || result.stdout);
		precomputedSelectionReports = new Map(
			JSON.parse(result.stdout).map((report) => [selectionCacheKey(report.mode, report.changed_files), report]),
		);
		return precomputedSelectionReports;
	} finally {
		rmSync(tempRoot, { recursive: true, force: true });
	}
}

export function selectRelated(changedFiles) {
	return listSuite('related', changedFiles);
}

export function listSuite(mode, changedFiles = []) {
	const cached = loadPrecomputedSelectionReports().get(selectionCacheKey(mode, changedFiles));
	if (cached) {
		return cached;
	}

	const result = spawnSync(process.execPath, ['scripts/run-cli-tests.mjs', mode, '--list'], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: {
			...process.env,
			MUSTFLOW_TEST_CHANGED_FILES: JSON.stringify(changedFiles),
		},
	});

	assert.equal(result.status, 0, result.stderr || result.stdout);
	return JSON.parse(result.stdout);
}

export function selectedFor(changedFiles) {
	return new Set(selectRelated(changedFiles).selected);
}

export function reasonsFor(report, reason) {
	return report.selection_reasons.filter((entry) => entry.reason === reason);
}

export {
	assert,
	existsSync,
	mkdirSync,
	mkdtempSync,
	orderTestPathsByProfile,
	path,
	profileDurationForTestPath,
	profileOrderingSummary,
	readFileSync,
	readProfileDurations,
	readProfileTimingEvidence,
	rmSync,
	spawnSync,
	test,
	tmpdir,
	writeFileSync,
};
