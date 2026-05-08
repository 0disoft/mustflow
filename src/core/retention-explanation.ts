import {
	isRecord,
	readPositiveInteger,
	readString,
	type TomlTable,
} from './config-loading.js';
import {
	readNestedRetentionTable,
	readRetentionTable,
	resolveRetentionLimits,
	resolveRunReceiptRetentionPolicy,
} from './retention-policy.js';

export interface RawEventsRetentionSummary {
	readonly store: string | null;
	readonly maxFileMb: number | null;
	readonly maxTotalMb: number | null;
	readonly maxAgeDays: number | null;
	readonly onLimit: string | null;
}

export interface RunReceiptsRetentionSummary {
	readonly store: string;
	readonly maxFileKb: number;
	readonly maxItems: number;
	readonly maxTotalMb: number;
	readonly stdoutTailBytes: number;
	readonly stderrTailBytes: number;
}

export interface KnowledgeRetentionSummary {
	readonly enabled: boolean | null;
	readonly store: string | null;
	readonly maxFileKb: number;
	readonly maxTotalMb: number | null;
}

export interface ContextRetentionSummary {
	readonly maxFileKb: number;
}

export interface RepoMapRetentionSummary {
	readonly maxFileKb: number;
	readonly failIfLarger: boolean;
}

export interface RetentionSummary {
	readonly enabled: boolean;
	readonly rawEvents: RawEventsRetentionSummary;
	readonly runReceipts: RunReceiptsRetentionSummary;
	readonly knowledge: KnowledgeRetentionSummary;
	readonly context: ContextRetentionSummary;
	readonly repoMap: RepoMapRetentionSummary;
}

export interface RetentionDecision {
	readonly kind: 'retention';
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly retention: RetentionSummary;
}

const RETENTION_POLICY_SOURCE_FILES = [
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/mustflow.toml',
];

function readBoolean(table: TomlTable | undefined, key: string): boolean | null {
	const value = table?.[key];
	return typeof value === 'boolean' ? value : null;
}

function summarizeRawEvents(retention: TomlTable | undefined): RawEventsRetentionSummary {
	const rawEvents = readNestedRetentionTable(retention, 'raw_events');

	return {
		store: rawEvents ? readString(rawEvents, 'store') ?? null : null,
		maxFileMb: rawEvents ? readPositiveInteger(rawEvents, 'max_file_mb') ?? null : null,
		maxTotalMb: rawEvents ? readPositiveInteger(rawEvents, 'max_total_mb') ?? null : null,
		maxAgeDays: rawEvents ? readPositiveInteger(rawEvents, 'max_age_days') ?? null : null,
		onLimit: rawEvents ? readString(rawEvents, 'on_limit') ?? null : null,
	};
}

function summarizeKnowledge(retention: TomlTable | undefined, maxFileKb: number): KnowledgeRetentionSummary {
	const knowledge = readNestedRetentionTable(retention, 'knowledge');

	return {
		enabled: readBoolean(knowledge, 'enabled'),
		store: knowledge ? readString(knowledge, 'store') ?? null : null,
		maxFileKb,
		maxTotalMb: knowledge ? readPositiveInteger(knowledge, 'max_total_mb') ?? null : null,
	};
}

function summarizeRetention(mustflowToml: TomlTable | undefined): RetentionSummary {
	const retention = readRetentionTable(mustflowToml);
	const limits = resolveRetentionLimits(mustflowToml);
	const runReceipts = resolveRunReceiptRetentionPolicy(mustflowToml);

	return {
		enabled: readBoolean(retention, 'enabled') ?? false,
		rawEvents: summarizeRawEvents(retention),
		runReceipts,
		knowledge: summarizeKnowledge(retention, limits.knowledgeMaxFileKb),
		context: {
			maxFileKb: limits.contextMaxFileKb,
		},
		repoMap: {
			maxFileKb: limits.repoMapMaxFileKb,
			failIfLarger: limits.repoMapFailIfLarger,
		},
	};
}

function describeRetentionDecision(retention: RetentionSummary): Pick<
	RetentionDecision,
	'decision' | 'reason' | 'effectiveAction'
> {
	if (!retention.enabled) {
		return {
			decision: 'retention policy is not enabled',
			reason: 'the [retention] table is missing or does not set enabled = true.',
			effectiveAction:
				'Treat retention as unavailable and avoid assuming raw events, run receipts, or knowledge files are preserved.',
		};
	}

	return {
		decision: 'retention policy is enabled',
		reason:
			`run receipts are stored as ${retention.runReceipts.store} with stdout and stderr tails capped at ` +
			`${retention.runReceipts.stdoutTailBytes} bytes and ${retention.runReceipts.stderrTailBytes} bytes.`,
		effectiveAction:
			'Use bounded run receipts for verification evidence, and do not treat raw event storage as available unless the configured store permits it.',
	};
}

export function explainRetentionPolicy(mustflowToml: TomlTable | undefined): RetentionDecision {
	const retention = summarizeRetention(isRecord(mustflowToml) ? mustflowToml : undefined);
	const description = describeRetentionDecision(retention);

	return {
		kind: 'retention',
		...description,
		countsAsMustflowVerification: false,
		sourceFiles: RETENTION_POLICY_SOURCE_FILES,
		retention,
	};
}
