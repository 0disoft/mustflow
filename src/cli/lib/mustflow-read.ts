import { existsSync } from 'node:fs';
import path from 'node:path';

import { readUtf8FileInsideWithoutSymlinks } from './filesystem.js';

export const MUSTFLOW_TEXT_MAX_BYTES = 1024 * 1024;
export const MUSTFLOW_TOML_MAX_BYTES = 256 * 1024;
export const MUSTFLOW_JSON_MAX_BYTES = 1024 * 1024;

export interface MustflowReadOptions {
	readonly maxBytes?: number;
}

export type MustflowReadResult =
	| {
			readonly ok: true;
			readonly content: string;
	  }
	| {
			readonly ok: false;
			readonly exists: boolean;
			readonly error: string | null;
	  };

export function mustflowProjectPath(projectRoot: string, relativePath: string): string {
	const normalizedRoot = path.resolve(projectRoot);
	const resolvedPath = path.resolve(normalizedRoot, ...relativePath.split('/'));
	const relative = path.relative(normalizedRoot, resolvedPath);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error(`Path escapes mustflow project root: ${relativePath}`);
	}

	return resolvedPath;
}

function missingPath(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

export function readMustflowTextFile(
	projectRoot: string,
	relativePath: string,
	options: MustflowReadOptions = {},
): string {
	return readUtf8FileInsideWithoutSymlinks(
		projectRoot,
		mustflowProjectPath(projectRoot, relativePath),
		{ maxBytes: options.maxBytes ?? MUSTFLOW_TEXT_MAX_BYTES },
	);
}

export function readMustflowTextFileResult(
	projectRoot: string,
	relativePath: string,
	options: MustflowReadOptions = {},
): MustflowReadResult {
	let filePath: string;
	try {
		filePath = mustflowProjectPath(projectRoot, relativePath);
	} catch (error) {
		return { ok: false, exists: false, error: error instanceof Error ? error.message : String(error) };
	}

	if (!existsSync(filePath)) {
		return { ok: false, exists: false, error: null };
	}

	try {
		return {
			ok: true,
			content: readMustflowTextFile(projectRoot, relativePath, options),
		};
	} catch (error) {
		if (missingPath(error)) {
			return { ok: false, exists: false, error: null };
		}

		return {
			ok: false,
			exists: true,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export function readMustflowTextFileIfExists(
	projectRoot: string,
	relativePath: string,
	options: MustflowReadOptions = {},
): string | null {
	const result = readMustflowTextFileResult(projectRoot, relativePath, options);
	return result.ok ? result.content : null;
}
