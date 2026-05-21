import { existsSync } from 'node:fs';
import path from 'node:path';

function hasMustflowMarker(directoryPath: string): boolean {
	return (
		existsSync(path.join(directoryPath, '.mustflow', 'config', 'mustflow.toml')) ||
		existsSync(path.join(directoryPath, '.mustflow', 'config', 'commands.toml'))
	);
}

export function findMustflowRoot(startPath: string = process.cwd()): string | undefined {
	let current = path.resolve(startPath);

	while (true) {
		if (hasMustflowMarker(current)) {
			return current;
		}

		const parent = path.dirname(current);

		if (parent === current) {
			return undefined;
		}

		current = parent;
	}
}

export function resolveMustflowRoot(startPath: string = process.cwd()): string {
	return findMustflowRoot(startPath) ?? path.resolve(startPath);
}
