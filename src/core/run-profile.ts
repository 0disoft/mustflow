import { performance } from 'node:perf_hooks';
import path from 'node:path';

import { writeJsonFileInsideWithoutSymlinks } from './safe-filesystem.js';

const RUN_PROFILE_SCHEMA_VERSION = '1';
const RUN_PROFILE_ENV = 'MUSTFLOW_RUN_PROFILE';
const RUN_PROFILE_DIR = path.join('.mustflow', 'state', 'runs');
const LATEST_RUN_PROFILE = 'latest.profile.json';

export type RunProfileStatus =
	| 'passed'
	| 'failed'
	| 'timed_out'
	| 'start_failed'
	| 'output_limit_exceeded'
	| 'blocked'
	| 'previewed';

export interface RunProfilePhase {
	readonly name: string;
	readonly duration_ms: number;
}

export interface RunProfile {
	readonly schema_version: string;
	readonly command: 'run';
	readonly profile: true;
	readonly profile_window: 'run_command_handler';
	readonly intent: string;
	readonly status: RunProfileStatus;
	readonly preview_mode: 'dry-run' | 'plan-only' | null;
	readonly started_at: string;
	readonly finished_at: string;
	readonly duration_ms: number;
	readonly phases: readonly RunProfilePhase[];
	readonly profile_path: string;
}

export interface RunProfileFinishInput {
	readonly projectRoot: string;
	readonly intent: string;
	readonly status: RunProfileStatus;
	readonly previewMode: 'dry-run' | 'plan-only' | null;
}

function isRunProfileEnabled(): boolean {
	const value = process.env[RUN_PROFILE_ENV];

	return value === '1' || value?.toLowerCase() === 'true';
}

function roundDurationMs(durationMs: number): number {
	return Math.max(0, Math.round(durationMs * 1000) / 1000);
}

function getProfileRelativePath(): string {
	return path.join(RUN_PROFILE_DIR, LATEST_RUN_PROFILE).split(path.sep).join('/');
}

export class RunProfiler {
	private readonly enabled: boolean;
	private readonly startedAt: Date;
	private readonly startedAtMs: number;
	private readonly phases: RunProfilePhase[] = [];

	constructor(enabled = isRunProfileEnabled()) {
		this.enabled = enabled;
		this.startedAt = new Date();
		this.startedAtMs = performance.now();
	}

	measure<T>(name: string, callback: () => T): T {
		if (!this.enabled) {
			return callback();
		}

		const startedAtMs = performance.now();

		try {
			return callback();
		} finally {
			this.recordPhase(name, startedAtMs);
		}
	}

	async measureAsync<T>(name: string, callback: () => Promise<T>): Promise<T> {
		if (!this.enabled) {
			return callback();
		}

		const startedAtMs = performance.now();

		try {
			return await callback();
		} finally {
			this.recordPhase(name, startedAtMs);
		}
	}

	getReceiptPhases(): readonly RunProfilePhase[] {
		if (!this.enabled) {
			return [];
		}

		return [...this.phases];
	}

	writeLatest(input: RunProfileFinishInput): void {
		if (!this.enabled) {
			return;
		}

		const finishedAt = new Date();
		const profile: RunProfile = {
			schema_version: RUN_PROFILE_SCHEMA_VERSION,
			command: 'run',
			profile: true,
			profile_window: 'run_command_handler',
			intent: input.intent,
			status: input.status,
			preview_mode: input.previewMode,
			started_at: this.startedAt.toISOString(),
			finished_at: finishedAt.toISOString(),
			duration_ms: roundDurationMs(performance.now() - this.startedAtMs),
			phases: [...this.phases],
			profile_path: getProfileRelativePath(),
		};
		const profilePath = path.join(input.projectRoot, RUN_PROFILE_DIR, LATEST_RUN_PROFILE);

		writeJsonFileInsideWithoutSymlinks(input.projectRoot, profilePath, profile);
	}

	private recordPhase(name: string, startedAtMs: number): void {
		this.phases.push({
			name,
			duration_ms: roundDurationMs(performance.now() - startedAtMs),
		});
	}
}
