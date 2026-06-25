import { existsSync, readFileSync } from 'node:fs';

const defaultProfileMaxAgeDays = 7;
const millisecondsPerSecond = 1000;
const secondsPerMinute = 60;
const minutesPerHour = 60;
const hoursPerDay = 24;
export const DEFAULT_PROFILE_MAX_AGE_MS =
	defaultProfileMaxAgeDays * hoursPerDay * minutesPerHour * secondsPerMinute * millisecondsPerSecond;

function normalizeProfilePath(value) {
	return String(value).replaceAll('\\', '/').replace(/^\.?\//u, '');
}

function isNonNegativeNumber(value) {
	return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function emptyProfileEvidence(status, reason, extras = {}) {
	return {
		status,
		reason,
		durations: new Map(),
		generatedAt: undefined,
		ageMs: undefined,
		maxAgeMs: DEFAULT_PROFILE_MAX_AGE_MS,
		totalEntries: 0,
		validEntries: 0,
		invalidEntries: 0,
		...extras,
	};
}

function parseGeneratedAt(profile) {
	const generatedAtMs = Date.parse(String(profile.generated_at ?? ''));
	return Number.isFinite(generatedAtMs)
		? {
				generatedAt: new Date(generatedAtMs).toISOString(),
				generatedAtMs,
			}
		: undefined;
}

export function readProfileTimingEvidence(profilePath, options = {}) {
	const maxAgeMs = options.maxAgeMs ?? DEFAULT_PROFILE_MAX_AGE_MS;

	if (!existsSync(profilePath)) {
		return emptyProfileEvidence('skipped', 'missing', { maxAgeMs });
	}

	try {
		const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
		if (!profile || typeof profile !== 'object' || !Array.isArray(profile.test_files)) {
			return emptyProfileEvidence('skipped', 'malformed', { maxAgeMs });
		}
		const nowMs = options.nowMs ?? Date.now();
		const timestamp = parseGeneratedAt(profile);

		if (!timestamp) {
			return emptyProfileEvidence('skipped', 'missing_timestamp', { maxAgeMs });
		}

		const ageMs = nowMs - timestamp.generatedAtMs;

		if (ageMs < 0) {
			return emptyProfileEvidence('skipped', 'future_timestamp', {
				generatedAt: timestamp.generatedAt,
				ageMs,
				maxAgeMs,
			});
		}

		if (ageMs > maxAgeMs) {
			return emptyProfileEvidence('skipped', 'stale', {
				generatedAt: timestamp.generatedAt,
				ageMs,
				maxAgeMs,
			});
		}

		const durations = new Map();
		let invalidEntries = 0;
		for (const entry of profile.test_files) {
			if (
				!entry ||
				typeof entry !== 'object' ||
				typeof entry.path !== 'string' ||
				!isNonNegativeNumber(entry.duration_ms)
			) {
				invalidEntries += 1;
				continue;
			}

			durations.set(normalizeProfilePath(entry.path), entry.duration_ms);
		}

		return {
			status: durations.size > 0 ? 'used' : 'skipped',
			reason: durations.size > 0 ? 'fresh' : 'no_valid_entries',
			durations,
			generatedAt: timestamp.generatedAt,
			ageMs,
			maxAgeMs,
			totalEntries: profile.test_files.length,
			validEntries: durations.size,
			invalidEntries,
		};
	} catch {
		return emptyProfileEvidence('skipped', 'malformed', { maxAgeMs });
	}
}

export function readProfileDurations(profilePath, options = {}) {
	return readProfileTimingEvidence(profilePath, options).durations;
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
