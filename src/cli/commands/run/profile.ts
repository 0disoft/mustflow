import { RunProfiler } from '../../../core/run-profile.js';

interface RunProfileOptions {
	readonly writeLatestProfile?: boolean;
}

export function writeLatestRunProfile(
	profiler: RunProfiler,
	options: RunProfileOptions,
	input: Parameters<RunProfiler['writeLatest']>[0],
): void {
	if (options.writeLatestProfile === false) {
		return;
	}

	profiler.writeLatest(input);
}
