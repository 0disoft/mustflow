import { availableParallelism } from 'node:os';

export const DEFAULT_VERIFY_PARALLELISM = 1;
export const MAX_VERIFY_PARALLELISM = 8;

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
	readonly error?: string;
}

export function parseVerifyArgs(args: readonly string[]): ParsedVerifyArgs {
	let reason: string | undefined;
	let fromClassification: string | undefined;
	let fromPlan: string | undefined;
	let writePlan: string | undefined;
	let reproEvidence: string | undefined;
	let externalEvidence: string | undefined;
	let json = false;
	let planOnly = false;
	let changed = false;
	let parallelism = DEFAULT_VERIFY_PARALLELISM;
	let parallelismSpecified = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--json') {
			json = true;
			continue;
		}

		if (arg === '--plan-only') {
			planOnly = true;
			continue;
		}

		if (arg === '--changed') {
			changed = true;
			continue;
		}

		if (arg === '--parallel') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, planOnly, changed, reason, parallelism, error: 'missing_parallel_value' };
			}

			const parsedParallelism = parseVerifyParallelism(value);
			if (parsedParallelism === null) {
				return { json, planOnly, changed, reason, parallelism, error: 'invalid_parallel_value' };
			}

			parallelism = parsedParallelism;
			parallelismSpecified = true;
			index += 1;
			continue;
		}

		if (arg === '--reason') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, planOnly, changed, reason, error: 'missing_reason_value' };
			}

			reason = value;
			index += 1;
			continue;
		}

		if (arg === '--from-plan') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { json, planOnly, changed, reason, fromClassification, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			index += 1;
			continue;
		}

		if (arg === '--from-classification') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					error: 'missing_from_classification_value',
				};
			}

			fromClassification = value;
			index += 1;
			continue;
		}

		if (arg === '--write-plan') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					error: 'missing_write_plan_value',
				};
			}

			writePlan = value;
			index += 1;
			continue;
		}

		if (arg === '--external-evidence') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					externalEvidence,
					error: 'missing_external_evidence_value',
				};
			}

			externalEvidence = value;
			index += 1;
			continue;
		}

		if (arg === '--repro-evidence') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					reproEvidence,
					externalEvidence,
					error: 'missing_repro_evidence_value',
				};
			}

			reproEvidence = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--reason=')) {
			const value = arg.slice('--reason='.length);
			if (value.length === 0) {
				return { json, planOnly, changed, reason, error: 'missing_reason_value' };
			}

			reason = value;
			continue;
		}

		if (arg.startsWith('--parallel=')) {
			const value = arg.slice('--parallel='.length);
			const parsedParallelism = parseVerifyParallelism(value);
			if (parsedParallelism === null) {
				return { json, planOnly, changed, reason, parallelism, error: 'invalid_parallel_value' };
			}

			parallelism = parsedParallelism;
			parallelismSpecified = true;
			continue;
		}

		if (arg.startsWith('--from-plan=')) {
			const value = arg.slice('--from-plan='.length);
			if (value.length === 0) {
				return { json, planOnly, changed, reason, fromClassification, fromPlan, error: 'missing_from_plan_value' };
			}

			fromPlan = value;
			continue;
		}

		if (arg.startsWith('--from-classification=')) {
			const value = arg.slice('--from-classification='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					error: 'missing_from_classification_value',
				};
			}

			fromClassification = value;
			continue;
		}

		if (arg.startsWith('--write-plan=')) {
			const value = arg.slice('--write-plan='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					error: 'missing_write_plan_value',
				};
			}

			writePlan = value;
			continue;
		}

		if (arg.startsWith('--external-evidence=')) {
			const value = arg.slice('--external-evidence='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					externalEvidence,
					error: 'missing_external_evidence_value',
				};
			}

			externalEvidence = value;
			continue;
		}

		if (arg.startsWith('--repro-evidence=')) {
			const value = arg.slice('--repro-evidence='.length);
			if (value.length === 0) {
				return {
					json,
					planOnly,
					changed,
					reason,
					fromClassification,
					fromPlan,
					writePlan,
					reproEvidence,
					externalEvidence,
					error: 'missing_repro_evidence_value',
				};
			}

			reproEvidence = value;
			continue;
		}

		if (arg.startsWith('-')) {
			return { json, planOnly, changed, reason, fromClassification, fromPlan, writePlan, reproEvidence, externalEvidence, error: arg };
		}

		return {
			json,
			planOnly,
			changed,
			reason,
			fromClassification,
			fromPlan,
			writePlan,
			reproEvidence,
			externalEvidence,
			error: `unexpected:${arg}`,
		};
	}

	return {
		json,
		planOnly,
		changed,
		reason,
		fromClassification,
		fromPlan,
		writePlan,
		reproEvidence,
		externalEvidence,
		parallelism,
		parallelismSpecified,
	};
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
	const cpuLimit = cpuAvailable === null ? MAX_VERIFY_PARALLELISM : Math.max(DEFAULT_VERIFY_PARALLELISM, cpuAvailable);
	const effectiveLimit = Math.max(DEFAULT_VERIFY_PARALLELISM, Math.min(MAX_VERIFY_PARALLELISM, cpuLimit));
	const effective = Math.max(DEFAULT_VERIFY_PARALLELISM, Math.min(requested, effectiveLimit));
	const capped = effective !== requested;
	const mode = effective > DEFAULT_VERIFY_PARALLELISM ? 'parallel_chunks' : 'serial';
	const note =
		mode === 'parallel_chunks'
			? 'Parallel verification is a bounded optimization for eligible non-conflicting entries; it is not stronger evidence than serial verification.'
			: 'Verification runs serially unless an eligible non-conflicting batch receives an effective parallelism greater than 1.';

	return {
		requested,
		effective,
		repositoryMax: MAX_VERIFY_PARALLELISM,
		cpuAvailable,
		capped,
		mode,
		note,
	};
}
