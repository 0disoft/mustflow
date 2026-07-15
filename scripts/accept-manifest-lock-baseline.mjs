#!/usr/bin/env node
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const allowedPaths = new Set([
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/commands.toml',
	'.mustflow/skills/router.toml',
]);

function toPosixRelative(value) {
	return value.replace(/\\/g, '/').replace(/^\.\//u, '');
}

const requestedPaths = process.argv.slice(2).map(toPosixRelative);

if (requestedPaths.length === 0) {
	console.error('Usage: node scripts/accept-manifest-lock-baseline.mjs <relative-path>...');
	process.exit(2);
}

const invalidPath = requestedPaths.find((entry) => !allowedPaths.has(entry));

if (invalidPath) {
	console.error(`Refusing to accept manifest lock baseline for unsupported path: ${invalidPath}`);
	process.exit(2);
}

const projectRoot = process.cwd();
const manifestLockModule = await import(
	pathToFileURL(path.join(projectRoot, 'dist', 'cli', 'lib', 'manifest-lock.js')).href
);

const updated = [];

for (const relativePath of requestedPaths) {
	if (manifestLockModule.markManifestLockFileCustomized(projectRoot, relativePath)) {
		updated.push(relativePath);
	}
}

console.log(JSON.stringify({
	schema_version: '1',
	command: 'accept-manifest-lock-baseline',
	updated,
}, null, 2));
