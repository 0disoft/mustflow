import {
	closeSync,
	constants,
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
} from 'node:fs';
import path from 'node:path';

const NOFOLLOW_FLAG = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;

export type CopyStatus = 'created' | 'skipped';

export interface CopyResult {
	readonly status: CopyStatus;
	readonly relativePath: string;
}

export interface ListFilesOptions {
	readonly ignoredDirectoryNames?: ReadonlySet<string>;
}

interface NoSymlinkPathOptions {
	readonly allowMissingLeaf?: boolean;
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

function isMissingPathError(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export function ensureInsideWithoutSymlinks(
	parentPath: string,
	childPath: string,
	options: NoSymlinkPathOptions = {},
): void {
	ensureInside(parentPath, childPath);

	const parent = path.resolve(parentPath);
	const child = path.resolve(childPath);
	const relative = path.relative(parent, child);
	const segments = relative === '' ? [] : relative.split(path.sep).filter((segment) => segment.length > 0);
	let currentPath = parent;

	const parentStats = lstatSync(parent);
	if (parentStats.isSymbolicLink()) {
		throw new Error(`Path must not contain symlinks: ${childPath}`);
	}

	for (const [index, segment] of segments.entries()) {
		currentPath = path.join(currentPath, segment);
		const isLeaf = index === segments.length - 1;

		try {
			const stats = lstatSync(currentPath);

			if (stats.isSymbolicLink()) {
				throw new Error(`Path must not contain symlinks: ${childPath}`);
			}

			if (!isLeaf && !stats.isDirectory()) {
				throw new Error(`Path component is not a directory: ${currentPath}`);
			}
		} catch (error) {
			if (isMissingPathError(error) && options.allowMissingLeaf) {
				return;
			}

			throw error;
		}
	}
}

export function readUtf8FileInsideWithoutSymlinks(parentPath: string, childPath: string): string {
	return readFileInsideWithoutSymlinks(parentPath, childPath).toString('utf8');
}

export function readFileInsideWithoutSymlinks(parentPath: string, childPath: string): Buffer {
	const absoluteChildPath = path.resolve(childPath);
	ensureInsideWithoutSymlinks(parentPath, absoluteChildPath);
	const fileDescriptor = openSync(absoluteChildPath, constants.O_RDONLY | NOFOLLOW_FLAG);

	try {
		return readFileSync(fileDescriptor);
	} finally {
		closeSync(fileDescriptor);
	}
}

export function ensureFileTargetInsideWithoutSymlinks(
	parentPath: string,
	childPath: string,
	options: NoSymlinkPathOptions = {},
): void {
	const absoluteChildPath = path.resolve(childPath);
	ensureInside(parentPath, absoluteChildPath);
	ensureInsideWithoutSymlinks(parentPath, path.dirname(absoluteChildPath), { allowMissingLeaf: true });

	try {
		const stats = lstatSync(absoluteChildPath);

		if (stats.isSymbolicLink()) {
			throw new Error(`Path must not contain symlinks: ${childPath}`);
		}

		if (!stats.isFile()) {
			throw new Error(`Path must be a regular file: ${childPath}`);
		}
	} catch (error) {
		if (isMissingPathError(error) && options.allowMissingLeaf) {
			return;
		}

		throw error;
	}
}

export function writeUtf8FileInsideWithoutSymlinks(parentPath: string, childPath: string, content: string): void {
	writeFileInsideWithoutSymlinks(parentPath, childPath, content);
}

export function writeFileInsideWithoutSymlinks(parentPath: string, childPath: string, content: string | Buffer): void {
	const absoluteChildPath = path.resolve(childPath);
	const directoryPath = path.dirname(absoluteChildPath);

	ensureInsideWithoutSymlinks(parentPath, directoryPath, { allowMissingLeaf: true });
	mkdirSync(directoryPath, { recursive: true });
	ensureFileTargetInsideWithoutSymlinks(parentPath, absoluteChildPath, { allowMissingLeaf: true });

	const fileDescriptor = openSync(
		absoluteChildPath,
		constants.O_WRONLY | constants.O_CREAT | constants.O_TRUNC | NOFOLLOW_FLAG,
	);

	try {
		writeFileSync(fileDescriptor, content);
	} finally {
		closeSync(fileDescriptor);
	}
}

export function copyFileInsideWithoutSymlinks(
	sourceParentPath: string,
	sourcePath: string,
	targetParentPath: string,
	targetPath: string,
): void {
	const content = readFileInsideWithoutSymlinks(sourceParentPath, sourcePath);
	writeFileInsideWithoutSymlinks(targetParentPath, targetPath, content);
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
