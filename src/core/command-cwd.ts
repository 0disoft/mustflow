import path from 'node:path';

export function resolveSafeProjectCwd(projectRoot: string, rawCwd: string | undefined): string {
	const cwd = rawCwd ?? '.';
	const resolved = path.resolve(projectRoot, cwd);
	const root = path.resolve(projectRoot);
	const resolvedLower = resolved.toLowerCase();
	const rootLower = root.toLowerCase();

	if (resolvedLower !== rootLower && !resolvedLower.startsWith(`${rootLower}${path.sep}`)) {
		throw new Error(`Intent cwd must stay inside the current root: ${cwd}`);
	}

	return resolved;
}
