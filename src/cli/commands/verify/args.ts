import { availableParallelism } from 'node:os';

import {
	getParsedCliStringOption,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionParseError,
	type CliOptionSpec,
	type ParsedCliOptions,
} from '../../lib/option-parser.js';
import { VERIFICATION_PROFILES, type VerificationProfile } from '../../../core/verification-profile.js';

export const DEFAULT_VERIFY_PARALLELISM = 4;
export const MAX_VERIFY_PARALLELISM = 8;
export const VERIFY_PARALLEL_EXECUTION_ENABLED = true;

const VERIFY_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--plan-only', kind: 'boolean' },
	{ name: '--changed', kind: 'boolean' },
	{ name: '--reason', kind: 'string' },
	{ name: '--parallel', kind: 'string' },
	{ name: '--profile', kind: 'string' },
	{ name: '--from-classification', kind: 'string' },
	{ name: '--from-plan', kind: 'string' },
	{ name: '--write-plan', kind: 'string' },
	{ name: '--external-evidence', kind: 'string' },
	{ name: '--repro-evidence', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

const VERIFY_MISSING_VALUE_ERRORS = new Map<string, string>([
	['--parallel', 'missing_parallel_value'],
	['--profile', 'missing_profile_value'],
	['--reason', 'missing_reason_value'],
	['--from-plan', 'missing_from_plan_value'],
	['--from-classification', 'missing_from_classification_value'],
	['--write-plan', 'missing_write_plan_value'],
	['--external-evidence', 'missing_external_evidence_value'],
	['--repro-evidence', 'missing_repro_evidence_value'],
]);

export interface VerifyParallelismSettings {
	readonly requested: number;
	readonly effective: number;
	readonly repositoryMax: number;
	readonly cpuAvailable: number | null;
	readonly capped: boolean;
	readonly mode: 'serial' | 'parallel_chunks';
	readonly note: string;
}

export interface ParsedVerifyArgs {
	readonly json: boolean;
	readonly planOnly: boolean;
	readonly changed: boolean;
	readonly reason?: string;
	readonly fromClassification?: string;
	readonly fromPlan?: string;
	readonly writePlan?: string;
	readonly reproEvidence?: string;
	readonly externalEvidence?: string;
	readonly parallelism?: number;
	readonly parallelismSpecified?: boolean;
	readonly profile: VerificationProfile;
	readonly error?: string;
}

export function parseVerifyArgs(args: readonly string[]): ParsedVerifyArgs {
	const parsed = parseCliOptions(args, VERIFY_OPTIONS);
	const base = createParsedVerifyArgsBase(parsed);
	let parallelism = DEFAULT_VERIFY_PARALLELISM;
	let parallelismSpecified = false;
	const rawProfile = getParsedCliStringOption(parsed, '--profile');
	const profile = rawProfile ?? 'edit';

	if (parsed.error) {
		return { ...base, parallelism, parallelismSpecified, profile: 'edit', error: mapVerifyOptionParseError(parsed.error) };
	}
	if (!VERIFICATION_PROFILES.includes(profile as VerificationProfile)) {
		return { ...base, parallelism, parallelismSpecified, profile: 'edit', error: 'invalid_profile_value' };
	}

	const parallelValue = getParsedCliStringOption(parsed, '--parallel');
	if (parallelValue !== null) {
		const parsedParallelism = parseVerifyParallelism(parallelValue);
		if (parsedParallelism === null) {
			return { ...base, parallelism, parallelismSpecified, profile: profile as VerificationProfile, error: 'invalid_parallel_value' };
		}

		parallelism = parsedParallelism;
		parallelismSpecified = true;
	}

	return {
		...base,
		parallelism,
		parallelismSpecified,
		profile: profile as VerificationProfile,
	};
}

function createParsedVerifyArgsBase(parsed: ParsedCliOptions): Omit<ParsedVerifyArgs, 'parallelism' | 'parallelismSpecified' | 'profile' | 'error'> {
	return {
		json: hasParsedCliOption(parsed, '--json'),
		planOnly: hasParsedCliOption(parsed, '--plan-only'),
		changed: hasParsedCliOption(parsed, '--changed'),
		reason: getParsedCliStringOption(parsed, '--reason') ?? undefined,
		fromClassification: getParsedCliStringOption(parsed, '--from-classification') ?? undefined,
		fromPlan: getParsedCliStringOption(parsed, '--from-plan') ?? undefined,
		writePlan: getParsedCliStringOption(parsed, '--write-plan') ?? undefined,
		reproEvidence: getParsedCliStringOption(parsed, '--repro-evidence') ?? undefined,
		externalEvidence: getParsedCliStringOption(parsed, '--external-evidence') ?? undefined,
	};
}

function mapVerifyOptionParseError(error: CliOptionParseError): string {
	if (error.kind === 'missing_value') {
		return VERIFY_MISSING_VALUE_ERRORS.get(error.option) ?? error.option;
	}

	return error.option.startsWith('-') ? error.option : `unexpected:${error.option}`;
}

function parseVerifyParallelism(value: string): number | null {
	if (!/^[1-9][0-9]*$/u.test(value)) {
		return null;
	}

	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : null;
}

function readAvailableParallelism(): number | null {
	try {
		const value = availableParallelism();
		return Number.isSafeInteger(value) && value > 0 ? value : null;
	} catch {
		return null;
	}
}

export function resolveVerifyParallelism(
	requested: number,
	cpuAvailable: number | null = readAvailableParallelism(),
): VerifyParallelismSettings {
	const cpuLimit = cpuAvailable === null ? MAX_VERIFY_PARALLELISM : Math.max(1, cpuAvailable);
	const configuredLimit = VERIFY_PARALLEL_EXECUTION_ENABLED ? MAX_VERIFY_PARALLELISM : DEFAULT_VERIFY_PARALLELISM;
	const effectiveLimit = Math.max(1, Math.min(configuredLimit, cpuLimit));
	const effective = Math.max(1, Math.min(requested, effectiveLimit));
	const capped = effective !== requested;
	const mode = effective > 1 ? 'parallel_chunks' : 'serial';
	const note =
		!VERIFY_PARALLEL_EXECUTION_ENABLED
			? 'Parallel verification is temporarily held at serial execution until process, lock, path-scope, and write-drift safety gates are satisfied.'
			: mode === 'parallel_chunks'
				? 'Parallel verification is a bounded optimization for eligible non-conflicting entries; each started intent also acquires shared host and repository CPU and memory tokens, plus a disk token when the command declares writes.'
				: 'Verification runs serially, and the started intent still acquires the same shared host and repository resource tokens.';

	return {
		requested,
		effective,
		repositoryMax: configuredLimit,
		cpuAvailable,
		capped,
		mode,
		note,
	};
}
