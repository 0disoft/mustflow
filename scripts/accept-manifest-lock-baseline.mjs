#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const allowedPaths = new Set([
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/commands.toml',
	'.mustflow/config/commands.d/scoped-check.toml',
	'.mustflow/config/commands.d/command-contract-scaling.toml',
	'.mustflow/config/preferences.toml',
	'.mustflow/skills/INDEX.md',
	'.mustflow/skills/routes.toml',
	'.mustflow/skills/router.toml',
	'.mustflow/skills/dependency-upgrade-review/SKILL.md',
	'.mustflow/skills/native-crash-forensics-review/SKILL.md',
	'.mustflow/skills/security-privacy-review/SKILL.md',
]);

// The manifest-lock policy (mustflow 2.134.0) tracks the whole skill surface:
// every installed skill SKILL.md is part of the locked install surface.
function isAllowedPath(entry) {
	if (allowedPaths.has(entry)) {
		return true;
	}

	return /^\.mustflow\/skills\/[a-z0-9-]+\/SKILL\.md$/u.test(entry);
}

function toPosixRelative(value) {
	return value.replace(/\\/g, '/').replace(/^\.\//u, '');
}

const args = process.argv.slice(2);
const action = args[0] === 'plan' || args[0] === 'apply' ? args[0] : 'accept';
const planPath = action === 'plan' || action === 'apply' ? toPosixRelative(args[1] ?? '') : null;
const requestedPaths = (action === 'plan' ? args.slice(2) : action === 'accept' ? args : []).map(toPosixRelative);

if ((action !== 'apply' && requestedPaths.length === 0) || ((action === 'plan' || action === 'apply') && !planPath)) {
	console.error('Usage: node scripts/accept-manifest-lock-baseline.mjs [plan <plan-path> <relative-path>... | apply <plan-path> | <relative-path>...]');
	process.exit(2);
}

const invalidPath = requestedPaths.find((entry) => !isAllowedPath(entry));

if (invalidPath) {
	console.error(`Refusing to accept manifest lock baseline for unsupported path: ${invalidPath}`);
	process.exit(2);
}

const projectRoot = process.cwd();
const manifestLockModule = await import(
	pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'manifest-lock.js')).href
);

function resolvePlanPath(relativePath) {
	if (!relativePath.startsWith('.mustflow/cache/manifest-lock-plans/') || !relativePath.endsWith('.json')) {
		throw new Error('Manifest lock plan path must stay under .mustflow/cache/manifest-lock-plans/ and end in .json');
	}
	const resolved = path.resolve(projectRoot, ...relativePath.split('/'));
	const cacheRoot = path.resolve(projectRoot, '.mustflow', 'cache', 'manifest-lock-plans');
	if (path.relative(cacheRoot, resolved).startsWith('..')) {
		throw new Error('Manifest lock plan path escapes the plan cache');
	}
	return resolved;
}

if (action === 'plan') {
	const resolvedPlanPath = resolvePlanPath(planPath);
	if (existsSync(resolvedPlanPath)) {
		throw new Error(`Refusing to replace an existing manifest lock plan: ${planPath}`);
	}
	const plan = manifestLockModule.createManifestLockCustomizationPlan(projectRoot, requestedPaths);
	mkdirSync(path.dirname(resolvedPlanPath), { recursive: true });
	writeFileSync(resolvedPlanPath, `${JSON.stringify(plan, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
	console.log(JSON.stringify({ schema_version: '1', command: 'plan-manifest-lock-baseline', plan_path: planPath, files: requestedPaths }, null, 2));
	process.exit(0);
}

if (action === 'apply') {
	const resolvedPlanPath = resolvePlanPath(planPath);
	const plan = manifestLockModule.parseManifestLockCustomizationPlan(JSON.parse(readFileSync(resolvedPlanPath, 'utf8')));
	const updated = manifestLockModule.applyManifestLockCustomizationPlan(projectRoot, plan);
	rmSync(resolvedPlanPath, { force: true });
	console.log(JSON.stringify({ schema_version: '1', command: 'accept-manifest-lock-baseline', plan_path: planPath, updated }, null, 2));
	process.exit(0);
}

const plan = manifestLockModule.createManifestLockCustomizationPlan(projectRoot, requestedPaths);
const updated = manifestLockModule.applyManifestLockCustomizationPlan(projectRoot, plan);
console.log(JSON.stringify({ schema_version: '1', command: 'accept-manifest-lock-baseline', updated }, null, 2));
