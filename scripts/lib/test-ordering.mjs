import { existsSync, readFileSync } from 'node:fs';

function normalizeProfilePath(value) {
	return String(value).replaceAll('\\', '/').replace(/^\.?\//u, '');
}

function isNonNegativeNumber(value) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

export function readProfileDurations(profilePath) {
	if (!existsSync(profilePath)) {
		return new Map();
	}

	try {
		const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
		if (!profile || typeof profile !== 'object' || !Array.isArray(profile.test_files)) {
			return new Map();
		}

		const durations = new Map();
		for (const entry of profile.test_files) {
			if (
				!entry ||
				typeof entry !== 'object' ||
				typeof entry.path !== 'string' ||
				!isNonNegativeNumber(entry.duration_ms)
			) {
				continue;
			}

			durations.set(normalizeProfilePath(entry.path), entry.duration_ms);
		}

		return durations;
	} catch {
		return new Map();
	}
}

export function profileDurationForTestPath(testPath, durations) {
	const duration = durations.get(normalizeProfilePath(testPath));
	return isNonNegativeNumber(duration) ? duration : undefined;
}

export function profileOrderingSummary(testPaths, durations) {
	return {
		known: testPaths.filter((testPath) => profileDurationForTestPath(testPath, durations) !== undefined).length,
		total: testPaths.length,
	};
}

export function orderTestPathsByProfile(testPaths, durations) {
	return testPaths
		.map((testPath, index) => ({
			testPath,
			index,
			durationMs: profileDurationForTestPath(testPath, durations),
		}))
		.sort((left, right) => {
			const leftKnown = isNonNegativeNumber(left.durationMs);
			const rightKnown = isNonNegativeNumber(right.durationMs);

			if (leftKnown && rightKnown) {
				return right.durationMs - left.durationMs || left.index - right.index;
			}

			if (leftKnown) {
				return -1;
			}

			if (rightKnown) {
				return 1;
			}

			return left.index - right.index;
		})
		.map((entry) => entry.testPath);
}
