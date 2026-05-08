import { isRecord, readPositiveInteger, readString, type TomlTable } from './config-loading.js';

export const ALLOWED_RETENTION_STORES = new Set(['none', 'cache', 'repo_local_ignored']);
export const ALLOWED_RETENTION_ON_LIMIT = new Set(['report', 'compact_then_archive']);

export const DEFAULT_RETENTION_LIMITS = {
	repoMapMaxFileKb: 128,
	repoMapFailIfLarger: true,
	runReceiptMaxFileKb: 128,
	contextMaxFileKb: 8,
	knowledgeMaxFileKb: 128,
} as const;

export const DEFAULT_RUN_RECEIPT_TAIL_BYTES = 64 * 1024;

export interface RetentionLimits {
	readonly repoMapMaxFileKb: number;
	readonly repoMapFailIfLarger: boolean;
	readonly runReceiptMaxFileKb: number;
	readonly contextMaxFileKb: number;
	readonly knowledgeMaxFileKb: number;
}

export interface RunReceiptRetentionPolicy {
	readonly store: string;
	readonly maxFileKb: number;
	readonly maxItems: number;
	readonly maxTotalMb: number;
	readonly stdoutTailBytes: number;
	readonly stderrTailBytes: number;
}

export function readRetentionTable(mustflowToml: TomlTable | undefined): TomlTable | undefined {
	return mustflowToml && isRecord(mustflowToml.retention) ? mustflowToml.retention : undefined;
}

export function readNestedRetentionTable(retention: TomlTable | undefined, key: string): TomlTable | undefined {
	if (!retention || !isRecord(retention[key])) {
		return undefined;
	}

	return retention[key];
}

export function readRetentionStore(retention: TomlTable | undefined, tableName: string): string | undefined {
	const table = readNestedRetentionTable(retention, tableName);
	return table ? readString(table, 'store') : undefined;
}

function readPositiveIntegerWithDefault(table: TomlTable | undefined, key: string, fallback: number): number {
	return table ? readPositiveInteger(table, key) ?? fallback : fallback;
}

function readBooleanWithDefault(table: TomlTable | undefined, key: string, fallback: boolean): boolean {
	const value = table?.[key];
	return typeof value === 'boolean' ? value : fallback;
}

export function resolveRetentionLimits(mustflowToml: TomlTable | undefined): RetentionLimits {
	const retention = readRetentionTable(mustflowToml);
	const repoMap = readNestedRetentionTable(retention, 'repo_map');
	const runReceipts = readNestedRetentionTable(retention, 'run_receipts');
	const context = readNestedRetentionTable(retention, 'context');
	const knowledge = readNestedRetentionTable(retention, 'knowledge');

	return {
		repoMapMaxFileKb: readPositiveIntegerWithDefault(
			repoMap,
			'max_file_kb',
			DEFAULT_RETENTION_LIMITS.repoMapMaxFileKb,
		),
		repoMapFailIfLarger: readBooleanWithDefault(
			repoMap,
			'fail_if_larger',
			DEFAULT_RETENTION_LIMITS.repoMapFailIfLarger,
		),
		runReceiptMaxFileKb: readPositiveIntegerWithDefault(
			runReceipts,
			'max_file_kb',
			DEFAULT_RETENTION_LIMITS.runReceiptMaxFileKb,
		),
		contextMaxFileKb: readPositiveIntegerWithDefault(
			context,
			'max_file_kb',
			DEFAULT_RETENTION_LIMITS.contextMaxFileKb,
		),
		knowledgeMaxFileKb: readPositiveIntegerWithDefault(
			knowledge,
			'max_file_kb',
			DEFAULT_RETENTION_LIMITS.knowledgeMaxFileKb,
		),
	};
}

export function resolveRunReceiptRetentionPolicy(mustflowToml: TomlTable | undefined): RunReceiptRetentionPolicy {
	const retention = readRetentionTable(mustflowToml);
	const runReceipts = readNestedRetentionTable(retention, 'run_receipts');

	return {
		store: readString(runReceipts ?? {}, 'store') ?? 'repo_local_ignored',
		maxFileKb: readPositiveIntegerWithDefault(
			runReceipts,
			'max_file_kb',
			DEFAULT_RETENTION_LIMITS.runReceiptMaxFileKb,
		),
		maxItems: readPositiveIntegerWithDefault(runReceipts, 'max_items', 1),
		maxTotalMb: readPositiveIntegerWithDefault(runReceipts, 'max_total_mb', 1),
		stdoutTailBytes: readPositiveIntegerWithDefault(
			runReceipts,
			'keep_stdout_tail_bytes',
			DEFAULT_RUN_RECEIPT_TAIL_BYTES,
		),
		stderrTailBytes: readPositiveIntegerWithDefault(
			runReceipts,
			'keep_stderr_tail_bytes',
			DEFAULT_RUN_RECEIPT_TAIL_BYTES,
		),
	};
}
