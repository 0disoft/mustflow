import { copyFileSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

export type CopyStatus = 'created' | 'skipped';

export interface CopyResult {
	readonly status: CopyStatus;
	readonly relativePath: string;
}

export interface ListFilesOptions {
	readonly ignoredDirectoryNames?: ReadonlySet<string>;
}

export function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

export function ensureInside(parentPath: string, childPath: string): void {
	const parent = path.resolve(parentPath);
	const child = path.resolve(childPath);
	const relative = path.relative(parent, child);

	if (relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
		return;
	}

	throw new Error(`Path escapes allowed directory: ${childPath}`);
}

export function copyFileIfMissing(sourcePath: string, targetPath: string, relativePath: string): CopyResult {
	if (existsSync(targetPath)) {
		return { status: 'skipped', relativePath };
	}

	mkdirSync(path.dirname(targetPath), { recursive: true });
	copyFileSync(sourcePath, targetPath);

	return { status: 'created', relativePath };
}

export function listFilesRecursive(rootPath: string, options: ListFilesOptions = {}): string[] {
	const results: string[] = [];

	function visit(currentPath: string): void {
		for (const entry of readdirSync(currentPath, { withFileTypes: true })) {
			const entryPath = path.join(currentPath, entry.name);

			if (entry.isDirectory()) {
				if (options.ignoredDirectoryNames?.has(entry.name)) {
					continue;
				}

				visit(entryPath);
				continue;
			}

			if (entry.isFile()) {
				results.push(toPosixPath(path.relative(rootPath, entryPath)));
			}
		}
	}

	if (!existsSync(rootPath) || !statSync(rootPath).isDirectory()) {
		return [];
	}

	visit(rootPath);
	return results.sort();
}
