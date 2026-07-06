import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, removeTempProject, runCli } from '../run-support.js';

export function runTextBudgetJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runGeneratedBoundaryJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/generated-boundary', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRelatedFilesJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/related-files', 'map', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runConfigChainJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/config-chain', 'inspect', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runEnvContractJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/env-contract', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runSecretRiskScanJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/secret-risk-scan', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runSecurityPatternScanJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/security-pattern-scan', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeOutlineJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/outline', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeDependencyGraphJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/dependency-graph', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeImportCycleJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/import-cycle', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeModuleBoundaryJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/module-boundary', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeChangeImpactJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/change-impact', 'analyze', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeSymbolReadJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/symbol-read', 'read', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeRouteOutlineJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/route-outline', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runCodeExportDiffJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/export-diff', 'compare', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runDocsReferenceDriftJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'docs/reference-drift', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runDocsLinkIntegrityJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'docs/link-integrity', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runTestPerformanceReportJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'test/performance-report', 'summarize', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runTestRegressionSelectorJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'test/regression-selector', 'select', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runScriptPackSuggestJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'suggest', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoApprovalGateJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/approval-gate', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoDeploySurfaceJson(projectPath, args = []) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/deploy-surface', 'inspect', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoToolchainProvenanceJson(projectPath, args = []) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/toolchain-provenance', 'inspect', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoAutomationSurfaceJson(projectPath, args = []) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/automation-surface', 'inspect', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoDependencySurfaceJson(projectPath, args = []) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/dependency-surface', 'inspect', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoMergeConflictScanJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/merge-conflict-scan', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoGitIgnoreAuditJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/git-ignore-audit', 'audit', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runRepoManifestLockDriftJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/manifest-lock-drift', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

export function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

export function commitGitBaseline(projectPath) {
	for (const args of [
		['init'],
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		const result = runGit(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
	}
}

export {
	assert,
	createTempProject,
	initProject,
	mkdirSync,
	path,
	readFileSync,
	removeTempProject,
	runCli,
	spawnSync,
	test,
	unlinkSync,
	writeFileSync,
};
