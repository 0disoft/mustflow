const HANDOFF_SCHEMA_VERSION = '1';

export const MAX_HANDOFF_RECORD_BYTES = 256 * 1024;

const MAX_STRING_LENGTH = 2_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_DEPTH = 8;

export type HandoffRecordKind = 'work_item' | 'handoff';
export type HandoffCoverageStatus = 'covered' | 'partial' | 'missing' | 'blocked';
export type HandoffVerificationStatus = 'planned' | 'run' | 'skipped';
export type HandoffIssueSeverity = 'error' | 'warning';

export interface HandoffRecordIssue {
	readonly severity: HandoffIssueSeverity;
	readonly code: string;
	readonly path: string;
	readonly message: string;
}

export interface HandoffValidationSummary {
	readonly scope_count: number;
	readonly acceptance_criteria_count: number;
	readonly source_ref_count: number;
	readonly verification_plan_count: number;
	readonly coverage_count: number;
	readonly remaining_risk_count: number;
}

export interface HandoffValidationReport {
	readonly schema_version: string;
	readonly command: 'handoff_validate';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly path: string;
	readonly record_kind: HandoffRecordKind | null;
	readonly task_id: string | null;
	readonly summary: HandoffValidationSummary;
	readonly issues: readonly HandoffRecordIssue[];
}

interface HandoffValidationOptions {
	readonly mustflowRoot: string;
	readonly path: string;
}

interface ForbiddenKeyRule {
	readonly code: string;
	readonly pattern: RegExp;
	readonly message: string;
}

interface SecretValueRule {
	readonly code: string;
	readonly pattern: RegExp;
	readonly message: string;
}

const ALLOWED_TOP_LEVEL_KEYS = new Set([
	'schema_version',
	'kind',
	'task_id',
	'goal',
	'scope',
	'non_goals',
	'acceptance_criteria',
	'source_refs',
	'changed_surfaces',
	'verification_plan',
	'coverage',
	'remaining_risks',
	'next_restart_point',
]);

const ALLOWED_VERIFICATION_PLAN_KEYS = new Set([
	'intent',
	'reason',
	'status',
	'receipt_path',
	'skip_reason',
]);

const ALLOWED_COVERAGE_KEYS = new Set(['status', 'requirement', 'evidence', 'gap']);

const RECORD_KINDS = new Set<HandoffRecordKind>(['work_item', 'handoff']);
const COVERAGE_STATUSES = new Set<HandoffCoverageStatus>(['covered', 'partial', 'missing', 'blocked']);
const VERIFICATION_STATUSES = new Set<HandoffVerificationStatus>(['planned', 'run', 'skipped']);

const FORBIDDEN_KEY_RULES: readonly ForbiddenKeyRule[] = [
	{
		code: 'forbidden_transcript_or_log_field',
		pattern: /^(?:transcript|raw_transcript|chat|conversation|messages|terminal_log|command_log|logs?|stdout|stderr|raw_output|full_output)$/iu,
		message: 'Handoff records must not store raw chats, transcripts, terminal logs, or command output.',
	},
	{
		code: 'forbidden_secret_field',
		pattern: /(?:secret|password|token|api[_-]?key|credential|private[_-]?key)/iu,
		message: 'Handoff records must not store secrets, credentials, tokens, or key material.',
	},
	{
		code: 'forbidden_hidden_reasoning_field',
		pattern: /(?:reasoning|chain[_-]?of[_-]?thought|hidden[_-]?thoughts?)/iu,
		message: 'Handoff records must not store hidden reasoning or chain-of-thought content.',
	},
	{
		code: 'forbidden_memory_field',
		pattern: /(?:memory|memory[_-]?summary|broad[_-]?summary)/iu,
		message: 'Handoff records must not become broad memory summaries.',
	},
	{
		code: 'forbidden_worker_state_field',
		pattern: /(?:worker[_-]?state|autonomous[_-]?loop|background[_-]?process|persona|agent[_-]?state)/iu,
		message: 'Handoff records must not store autonomous worker state or background-loop state.',
	},
	{
		code: 'forbidden_command_authority_field',
		pattern: /^(?:argv|cmd|run_policy|lifecycle|stdin|timeout_seconds|writes|network|destructive|required_after|skip_validation|agent_action|command_authority)$/iu,
		message: 'Handoff records must not include command-authority fields that bypass commands.toml.',
	},
];

const SECRET_VALUE_RULES: readonly SecretValueRule[] = [
	{
		code: 'secret_like_private_key',
		pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
		message: 'Value looks like private key material.',
	},
	{
		code: 'secret_like_token',
		pattern: /\b(?:sk-[A-Za-z0-9_-]{12,}|ghp_[A-Za-z0-9_]{12,}|github_pat_[A-Za-z0-9_]{12,}|xox[abprs]-[A-Za-z0-9-]{12,})\b/u,
		message: 'Value looks like an API token or service token.',
	},
	{
		code: 'secret_like_aws_access_key',
		pattern: /\bAKIA[0-9A-Z]{16}\b/u,
		message: 'Value looks like an AWS access key.',
	},
	{
		code: 'secret_like_assignment',
		pattern: /\b(?:password|token|secret|api[_-]?key)\s*[:=]\s*\S+/iu,
		message: 'Value looks like an inline secret assignment.',
	},
];

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isString(value: unknown): value is string {
	return typeof value === 'string';
}

function normalizeKey(value: string): string {
	return value.replaceAll('-', '_').toLowerCase();
}

function makeEmptySummary(): HandoffValidationSummary {
	return {
		scope_count: 0,
		acceptance_criteria_count: 0,
		source_ref_count: 0,
		verification_plan_count: 0,
		coverage_count: 0,
		remaining_risk_count: 0,
	};
}

function countArray(value: unknown): number {
	return Array.isArray(value) ? value.length : 0;
}

function getSummary(value: unknown): HandoffValidationSummary {
	if (!isRecord(value)) {
		return makeEmptySummary();
	}

	return {
		scope_count: countArray(value.scope),
		acceptance_criteria_count: countArray(value.acceptance_criteria),
		source_ref_count: countArray(value.source_refs),
		verification_plan_count: countArray(value.verification_plan),
		coverage_count: countArray(value.coverage),
		remaining_risk_count: countArray(value.remaining_risks),
	};
}

function getRecordKind(value: unknown): HandoffRecordKind | null {
	if (!isRecord(value) || !isString(value.kind) || !RECORD_KINDS.has(value.kind as HandoffRecordKind)) {
		return null;
	}

	return value.kind as HandoffRecordKind;
}

function getTaskId(value: unknown): string | null {
	return isRecord(value) && isString(value.task_id) ? value.task_id : null;
}

function pushIssue(
	issues: HandoffRecordIssue[],
	severity: HandoffIssueSeverity,
	code: string,
	path: string,
	message: string,
): void {
	issues.push({ severity, code, path, message });
}

function validateString(
	issues: HandoffRecordIssue[],
	value: unknown,
	pointer: string,
	label: string,
	options: { required: boolean; nonEmpty: boolean },
): void {
	if (value === undefined) {
		if (options.required) {
			pushIssue(issues, 'error', 'missing_required_field', pointer, `${label} is required.`);
		}
		return;
	}

	if (!isString(value)) {
		pushIssue(issues, 'error', 'invalid_string', pointer, `${label} must be a string.`);
		return;
	}

	if (options.nonEmpty && value.trim().length === 0) {
		pushIssue(issues, 'error', 'empty_string', pointer, `${label} must not be empty.`);
	}

	if (value.length > MAX_STRING_LENGTH) {
		pushIssue(
			issues,
			'error',
			'string_too_long',
			pointer,
			`${label} is too long for a restart pointer record.`,
		);
	}
}

function validateStringArray(
	issues: HandoffRecordIssue[],
	value: unknown,
	pointer: string,
	label: string,
	options: { required: boolean; nonEmpty: boolean },
): void {
	if (value === undefined) {
		if (options.required) {
			pushIssue(issues, 'error', 'missing_required_field', pointer, `${label} is required.`);
		}
		return;
	}

	if (!Array.isArray(value)) {
		pushIssue(issues, 'error', 'invalid_array', pointer, `${label} must be an array.`);
		return;
	}

	if (options.nonEmpty && value.length === 0) {
		pushIssue(issues, 'error', 'empty_array', pointer, `${label} must include at least one entry.`);
	}

	if (value.length > MAX_ARRAY_ITEMS) {
		pushIssue(issues, 'error', 'array_too_large', pointer, `${label} has too many entries for a restart pointer.`);
	}

	value.forEach((item, index) => {
		validateString(issues, item, `${pointer}[${index}]`, `${label} item`, {
			required: true,
			nonEmpty: true,
		});
	});
}

function validateAllowedKeys(
	issues: HandoffRecordIssue[],
	record: Record<string, unknown>,
	allowedKeys: ReadonlySet<string>,
	pointer: string,
): void {
	for (const key of Object.keys(record)) {
		if (!allowedKeys.has(key)) {
			pushIssue(issues, 'error', 'unknown_field', `${pointer}.${key}`, `Field is not part of the handoff record contract.`);
		}
	}
}

function validateVerificationPlan(issues: HandoffRecordIssue[], value: unknown): void {
	if (value === undefined) {
		return;
	}

	if (!Array.isArray(value)) {
		pushIssue(issues, 'error', 'invalid_array', '$.verification_plan', 'verification_plan must be an array.');
		return;
	}

	if (value.length > MAX_ARRAY_ITEMS) {
		pushIssue(
			issues,
			'error',
			'array_too_large',
			'$.verification_plan',
			'verification_plan has too many entries for a restart pointer.',
		);
	}

	value.forEach((entry, index) => {
		const pointer = `$.verification_plan[${index}]`;

		if (!isRecord(entry)) {
			pushIssue(issues, 'error', 'invalid_object', pointer, 'verification_plan entries must be objects.');
			return;
		}

		validateAllowedKeys(issues, entry, ALLOWED_VERIFICATION_PLAN_KEYS, pointer);
		validateString(issues, entry.intent, `${pointer}.intent`, 'intent', { required: true, nonEmpty: true });
		validateString(issues, entry.reason, `${pointer}.reason`, 'reason', { required: true, nonEmpty: true });

		if (!isString(entry.status) || !VERIFICATION_STATUSES.has(entry.status as HandoffVerificationStatus)) {
			pushIssue(
				issues,
				'error',
				'invalid_verification_status',
				`${pointer}.status`,
				'status must be one of planned, run, or skipped.',
			);
		}

		validateString(issues, entry.receipt_path, `${pointer}.receipt_path`, 'receipt_path', {
			required: false,
			nonEmpty: true,
		});
		validateString(issues, entry.skip_reason, `${pointer}.skip_reason`, 'skip_reason', {
			required: false,
			nonEmpty: true,
		});

		if (entry.status === 'skipped' && entry.skip_reason === undefined) {
			pushIssue(
				issues,
				'error',
				'missing_skip_reason',
				`${pointer}.skip_reason`,
				'Skipped verification must explain why it was skipped.',
			);
		}

		if (entry.status !== 'run' && entry.receipt_path !== undefined) {
			pushIssue(
				issues,
				'error',
				'unrun_verification_receipt_claim',
				`${pointer}.receipt_path`,
				'Only verification entries with status run may include a receipt_path.',
			);
		}

		if (entry.status !== 'skipped' && entry.skip_reason !== undefined) {
			pushIssue(
				issues,
				'warning',
				'unused_skip_reason',
				`${pointer}.skip_reason`,
				'skip_reason is meaningful only when status is skipped.',
			);
		}
	});
}

function validateCoverage(issues: HandoffRecordIssue[], value: unknown): void {
	if (value === undefined) {
		return;
	}

	if (!Array.isArray(value)) {
		pushIssue(issues, 'error', 'invalid_array', '$.coverage', 'coverage must be an array.');
		return;
	}

	if (value.length > MAX_ARRAY_ITEMS) {
		pushIssue(issues, 'error', 'array_too_large', '$.coverage', 'coverage has too many entries for a restart pointer.');
	}

	value.forEach((entry, index) => {
		const pointer = `$.coverage[${index}]`;

		if (!isRecord(entry)) {
			pushIssue(issues, 'error', 'invalid_object', pointer, 'coverage entries must be objects.');
			return;
		}

		validateAllowedKeys(issues, entry, ALLOWED_COVERAGE_KEYS, pointer);

		if (!isString(entry.status) || !COVERAGE_STATUSES.has(entry.status as HandoffCoverageStatus)) {
			pushIssue(
				issues,
				'error',
				'invalid_coverage_status',
				`${pointer}.status`,
				'coverage status must be one of covered, partial, missing, or blocked.',
			);
		}

		validateString(issues, entry.requirement, `${pointer}.requirement`, 'requirement', {
			required: false,
			nonEmpty: true,
		});
		validateStringArray(issues, entry.evidence, `${pointer}.evidence`, 'evidence', {
			required: false,
			nonEmpty: false,
		});
		validateString(issues, entry.gap, `${pointer}.gap`, 'gap', { required: false, nonEmpty: true });

		if (entry.status === 'covered' && (!Array.isArray(entry.evidence) || entry.evidence.length === 0)) {
			pushIssue(
				issues,
				'warning',
				'covered_without_evidence',
				`${pointer}.evidence`,
				'covered entries should name the guard, file, or receipt that supports the claim.',
			);
		}
	});
}

function scanForbiddenKeysAndValues(
	issues: HandoffRecordIssue[],
	value: unknown,
	pointer: string,
	depth = 0,
): void {
	if (depth > MAX_OBJECT_DEPTH) {
		pushIssue(issues, 'error', 'record_too_deep', pointer, 'Handoff records must stay shallow restart pointers.');
		return;
	}

	if (isString(value)) {
		for (const rule of SECRET_VALUE_RULES) {
			if (rule.pattern.test(value)) {
				pushIssue(issues, 'error', rule.code, pointer, rule.message);
			}
		}

		if (/[A-Z]:\\Users\\/u.test(value) || /\/home\/[^/\s]+/u.test(value)) {
			pushIssue(
				issues,
				'warning',
				'personal_path_candidate',
				pointer,
				'Value looks like a personal local path; use repository-relative paths when possible.',
			);
		}
		return;
	}

	if (Array.isArray(value)) {
		value.forEach((item, index) => scanForbiddenKeysAndValues(issues, item, `${pointer}[${index}]`, depth + 1));
		return;
	}

	if (!isRecord(value)) {
		return;
	}

	for (const [key, nestedValue] of Object.entries(value)) {
		const nestedPointer = pointer === '$' ? `$.${key}` : `${pointer}.${key}`;
		const normalizedKey = normalizeKey(key);

		for (const rule of FORBIDDEN_KEY_RULES) {
			if (rule.pattern.test(normalizedKey)) {
				pushIssue(issues, 'error', rule.code, nestedPointer, rule.message);
			}
		}

		scanForbiddenKeysAndValues(issues, nestedValue, nestedPointer, depth + 1);
	}
}

function validateRecordShape(issues: HandoffRecordIssue[], value: unknown): void {
	if (!isRecord(value)) {
		pushIssue(issues, 'error', 'invalid_record', '$', 'Handoff record must be a JSON object.');
		return;
	}

	validateAllowedKeys(issues, value, ALLOWED_TOP_LEVEL_KEYS, '$');

	if (value.schema_version !== HANDOFF_SCHEMA_VERSION) {
		pushIssue(issues, 'error', 'invalid_schema_version', '$.schema_version', 'schema_version must be "1".');
	}

	if (!isString(value.kind) || !RECORD_KINDS.has(value.kind as HandoffRecordKind)) {
		pushIssue(issues, 'error', 'invalid_kind', '$.kind', 'kind must be work_item or handoff.');
	}

	validateString(issues, value.task_id, '$.task_id', 'task_id', { required: true, nonEmpty: true });
	validateString(issues, value.goal, '$.goal', 'goal', { required: true, nonEmpty: true });
	validateStringArray(issues, value.scope, '$.scope', 'scope', { required: true, nonEmpty: true });
	validateStringArray(issues, value.non_goals, '$.non_goals', 'non_goals', { required: false, nonEmpty: false });
	validateStringArray(issues, value.acceptance_criteria, '$.acceptance_criteria', 'acceptance_criteria', {
		required: true,
		nonEmpty: true,
	});
	validateStringArray(issues, value.source_refs, '$.source_refs', 'source_refs', {
		required: true,
		nonEmpty: true,
	});
	validateStringArray(issues, value.changed_surfaces, '$.changed_surfaces', 'changed_surfaces', {
		required: false,
		nonEmpty: false,
	});
	validateVerificationPlan(issues, value.verification_plan);
	validateCoverage(issues, value.coverage);
	validateStringArray(issues, value.remaining_risks, '$.remaining_risks', 'remaining_risks', {
		required: false,
		nonEmpty: false,
	});
	validateString(issues, value.next_restart_point, '$.next_restart_point', 'next_restart_point', {
		required: true,
		nonEmpty: true,
	});
}

export function validateHandoffRecord(value: unknown, options: HandoffValidationOptions): HandoffValidationReport {
	const issues: HandoffRecordIssue[] = [];

	validateRecordShape(issues, value);
	scanForbiddenKeysAndValues(issues, value, '$');

	const hasErrors = issues.some((issue) => issue.severity === 'error');

	return {
		schema_version: HANDOFF_SCHEMA_VERSION,
		command: 'handoff_validate',
		ok: !hasErrors,
		mustflow_root: options.mustflowRoot,
		path: options.path,
		record_kind: getRecordKind(value),
		task_id: getTaskId(value),
		summary: getSummary(value),
		issues,
	};
}

export function validateHandoffRecordJson(
	content: string,
	options: HandoffValidationOptions,
): HandoffValidationReport {
	let parsed: unknown;

	try {
		parsed = JSON.parse(content);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);

		return {
			schema_version: HANDOFF_SCHEMA_VERSION,
			command: 'handoff_validate',
			ok: false,
			mustflow_root: options.mustflowRoot,
			path: options.path,
			record_kind: null,
			task_id: null,
			summary: makeEmptySummary(),
			issues: [
				{
					severity: 'error',
					code: 'invalid_json',
					path: '$',
					message: `Handoff record must be valid JSON: ${message}`,
				},
			],
		};
	}

	return validateHandoffRecord(parsed, options);
}
