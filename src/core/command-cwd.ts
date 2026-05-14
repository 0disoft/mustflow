import { existsSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

function normalizeForContainment(value: string): string {
	const normalized = path.resolve(value);
	return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

function isInsideOrEqual(parent: string, child: string): boolean {
	const normalizedParent = normalizeForContainment(parent);
	const normalizedChild = normalizeForContainment(child);
	return normalizedChild === normalizedParent || normalizedChild.startsWith(`${normalizedParent}${path.sep}`);
}

export function resolveSafeProjectCwd(projectRoot: string, rawCwd: string | undefined): string {
	const cwd = rawCwd ?? '.';
	const resolved = path.resolve(projectRoot, cwd);
	const rootRealPath = realpathSync.native(projectRoot);

	if (!existsSync(resolved) || !statSync(resolved).isDirectory()) {
		throw new Error(`Intent cwd must stay inside the current root and resolve to an existing directory: ${cwd}`);
	}

	const cwdRealPath = realpathSync.native(resolved);

	if (!isInsideOrEqual(rootRealPath, cwdRealPath)) {
		throw new Error(`Intent cwd must stay inside the current root and resolve to an existing directory: ${cwd}`);
	}

	return cwdRealPath;
}
