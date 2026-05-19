export const DEFAULT_VERIFY_PARALLELISM = 1;

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
	};
}

function parseVerifyParallelism(value: string): number | null {
	if (!/^[1-9][0-9]*$/u.test(value)) {
		return null;
	}

	const parsed = Number(value);
	return Number.isSafeInteger(parsed) ? parsed : null;
}
