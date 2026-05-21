import {
	closeSync,
	constants,
	lstatSync,
	mkdirSync,
	openSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';

const NOFOLLOW_FLAG = typeof constants.O_NOFOLLOW === 'number' ? constants.O_NOFOLLOW : 0;

interface NoSymlinkPathOptions {
	readonly allowMissingLeaf?: boolean;
}

function isMissingPathError(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function tempFilePath(targetPath: string): string {
	const suffix = `${process.pid}-${Date.now()}-${randomBytes(6).toString('hex')}`;
	return path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${suffix}.tmp`);
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

function ensureDirectoryInsideWithoutSymlinks(parentPath: string, directoryPath: string): void {
	ensureInside(parentPath, directoryPath);

	const parent = path.resolve(parentPath);
	const directory = path.resolve(directoryPath);
	const relative = path.relative(parent, directory);
	const segments = relative === '' ? [] : relative.split(path.sep).filter((segment) => segment.length > 0);
	let currentPath = parent;

	const parentStats = lstatSync(parent);
	if (parentStats.isSymbolicLink()) {
		throw new Error(`Path must not contain symlinks: ${directoryPath}`);
	}

	for (const segment of segments) {
		currentPath = path.join(currentPath, segment);

		try {
			const stats = lstatSync(currentPath);
			if (stats.isSymbolicLink()) {
				throw new Error(`Path must not contain symlinks: ${directoryPath}`);
			}
			if (!stats.isDirectory()) {
				throw new Error(`Path component is not a directory: ${currentPath}`);
			}
		} catch (error) {
			if (!isMissingPathError(error)) {
				throw error;
			}

			mkdirSync(currentPath);
			const stats = lstatSync(currentPath);
			if (!stats.isDirectory() || stats.isSymbolicLink()) {
				throw new Error(`Path component is not a directory: ${currentPath}`);
			}
		}
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

export function readUtf8FileInsideWithoutSymlinks(parentPath: string, childPath: string): string {
	return readFileInsideWithoutSymlinks(parentPath, childPath).toString('utf8');
}

export function writeFileInsideWithoutSymlinks(
	parentPath: string,
	childPath: string,
	content: string | Buffer | Uint8Array,
): void {
	const absoluteChildPath = path.resolve(childPath);
	const directoryPath = path.dirname(absoluteChildPath);
	ensureDirectoryInsideWithoutSymlinks(parentPath, directoryPath);
	ensureFileTargetInsideWithoutSymlinks(parentPath, absoluteChildPath, { allowMissingLeaf: true });

	const temporaryPath = tempFilePath(absoluteChildPath);
	let fileDescriptor: number | null = null;

	try {
		fileDescriptor = openSync(
			temporaryPath,
			constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | NOFOLLOW_FLAG,
		);
		writeFileSync(fileDescriptor, content);
		closeSync(fileDescriptor);
		fileDescriptor = null;
		ensureFileTargetInsideWithoutSymlinks(parentPath, absoluteChildPath, { allowMissingLeaf: true });
		renameSync(temporaryPath, absoluteChildPath);
	} catch (error) {
		if (fileDescriptor !== null) {
			try {
				closeSync(fileDescriptor);
			} catch {
				// Best-effort cleanup before removing the temporary file.
			}
		}
		try {
			unlinkSync(temporaryPath);
		} catch {
			// Best-effort cleanup for a temporary file that may not have been created.
		}
		throw error;
	}
}

export function writeUtf8FileInsideWithoutSymlinks(parentPath: string, childPath: string, content: string): void {
	writeFileInsideWithoutSymlinks(parentPath, childPath, content);
}

export function writeJsonFileInsideWithoutSymlinks(parentPath: string, childPath: string, value: unknown): void {
	writeUtf8FileInsideWithoutSymlinks(parentPath, childPath, `${JSON.stringify(value, null, 2)}\n`);
}
