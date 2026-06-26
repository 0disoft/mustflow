export const DEFAULT_IGNORED_DIRECTORIES = [
	'.git',
	'.mustflow/cache',
	'.mustflow/state',
	'node_modules',
	'dist',
	'build',
	'coverage',
	'.next',
	'.turbo',
	'.astro',
] as const;

function normalizeDirectoryPath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

function containsSegmentSequence(segments: readonly string[], sequence: readonly string[]): boolean {
	if (sequence.length === 0 || sequence.length > segments.length) {
		return false;
	}

	for (let index = 0; index <= segments.length - sequence.length; index += 1) {
		if (sequence.every((segment, offset) => segments[index + offset] === segment)) {
			return true;
		}
	}

	return false;
}

export function isIgnoredDirectoryPath(
	relativePath: string,
	ignoredDirectories: readonly string[] = DEFAULT_IGNORED_DIRECTORIES,
): boolean {
	const normalized = normalizeDirectoryPath(relativePath);
	if (normalized === '.') {
		return false;
	}

	const segments = normalized.split('/').filter((segment) => segment.length > 0);
	return ignoredDirectories.some((entry) => {
		const ignoredSegments = normalizeDirectoryPath(entry).split('/').filter((segment) => segment.length > 0);
		if (ignoredSegments.length === 1) {
			return segments.includes(ignoredSegments[0] ?? '');
		}
		return containsSegmentSequence(segments, ignoredSegments);
	});
}
