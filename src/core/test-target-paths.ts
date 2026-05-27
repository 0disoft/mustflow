import path from 'node:path';

export const TEST_TARGET_PATH_ERROR = "entries must be non-empty relative paths that do not start with '-'";

export function normalizeSafeTestTargetPath(value: unknown): string | null {
	if (typeof value !== 'string') {
		return null;
	}

	const raw = value.trim();
	const normalized = raw.replace(/\\/g, '/');

	if (
		normalized.length === 0 ||
		normalized.startsWith('-') ||
		path.posix.isAbsolute(normalized) ||
		path.win32.isAbsolute(raw)
	) {
		return null;
	}

	const segments = normalized.split('/');
	return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..') ? normalized : null;
}
