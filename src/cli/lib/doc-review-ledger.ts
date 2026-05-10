import { existsSync } from 'node:fs';
import path from 'node:path';

import { triageDocReview, type DocReviewTriage } from '../../core/doc-review-triage.js';
import {
	ensureInside,
	ensureInsideWithoutSymlinks,
	readUtf8FileInsideWithoutSymlinks,
	toPosixPath,
	writeUtf8FileInsideWithoutSymlinks,
} from './filesystem.js';
import { parseTomlText, stringifyToml } from './toml.js';

export const DOC_REVIEW_LEDGER_RELATIVE_PATH = '.mustflow/review/docs.toml';

export const DOC_REVIEW_STATUSES = ['pending', 'in_review', 'changes_made', 'approved', 'needs_human', 'ignored'] as const;
export const DOC_REVIEW_ACTIVE_STATUSES = ['pending', 'in_review', 'changes_made', 'needs_human'] as const;
export const REVIEWER_KINDS = ['human', 'llm', 'tool', 'external'] as const;

export type DocReviewStatus = (typeof DOC_REVIEW_STATUSES)[number];
export type ReviewerKind = (typeof REVIEWER_KINDS)[number];

export interface DocReviewEntry {
	readonly path: string;
	readonly status: DocReviewStatus;
	readonly origin: string;
	readonly reason: string;
	readonly first_seen_at: string;
	readonly last_touched_at: string;
	readonly last_touched_by_kind?: ReviewerKind;
	readonly last_touched_by_id?: string;
	readonly reviewed_at?: string;
	readonly reviewer_kind?: ReviewerKind;
	readonly reviewer_id?: string;
	readonly reviewer_label?: string;
	readonly reviewer_provider?: string;
	readonly reviewer_model?: string;
	readonly reviewer_command_intent?: string;
	readonly review_summary?: string;
	readonly review_comment?: string;
	readonly commented_at?: string;
	readonly commented_by_kind?: ReviewerKind;
	readonly commented_by_id?: string;
}

export type DocReviewListEntry = DocReviewEntry & DocReviewTriage;

export interface DocReviewLedger {
	readonly schema_version: string;
	readonly documents: readonly DocReviewEntry[];
}

export interface AddDocReviewEntryInput {
	readonly path: string;
	readonly origin?: string;
	readonly reason?: string;
	readonly comment?: string;
	readonly actorKind?: ReviewerKind;
	readonly actorId?: string;
	readonly now?: string;
}

export interface CommentDocReviewEntryInput {
	readonly path: string;
	readonly comment: string;
	readonly actorKind?: ReviewerKind;
	readonly actorId?: string;
	readonly now?: string;
}

export interface ReviewDocInput {
	readonly path: string;
	readonly status: Extract<DocReviewStatus, 'approved' | 'needs_human' | 'ignored'>;
	readonly reviewerKind: ReviewerKind;
	readonly reviewerId: string;
	readonly reviewerLabel?: string;
	readonly reviewerProvider?: string;
	readonly reviewerModel?: string;
	readonly reviewerCommandIntent?: string;
	readonly summary?: string;
	readonly now?: string;
}

type TomlTable = Record<string, unknown>;

function isRecord(value: unknown): value is TomlTable {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readOptionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value : undefined;
}

export function isDocReviewStatus(value: unknown): value is DocReviewStatus {
	return typeof value === 'string' && DOC_REVIEW_STATUSES.includes(value as DocReviewStatus);
}

export function isReviewerKind(value: unknown): value is ReviewerKind {
	return typeof value === 'string' && REVIEWER_KINDS.includes(value as ReviewerKind);
}

function parseReviewerKind(value: unknown, fallback?: ReviewerKind): ReviewerKind | undefined {
	if (value === undefined) {
		return fallback;
	}

	if (!isReviewerKind(value)) {
		throw new Error(`reviewer kind must be one of: ${REVIEWER_KINDS.join(', ')}`);
	}

	return value;
}

function nowIso(now?: string): string {
	return now ?? new Date().toISOString();
}

function normalizePath(projectRoot: string, inputPath: string): string {
	if (inputPath.trim().length === 0) {
		throw new Error('document path must be a non-empty string');
	}

	const absolutePath = path.resolve(projectRoot, inputPath);
	ensureInside(projectRoot, absolutePath);
	return toPosixPath(path.relative(projectRoot, absolutePath));
}

function parseDocReviewEntry(value: unknown): DocReviewEntry {
	if (!isRecord(value)) {
		throw new Error('document review entry must be a table');
	}

	const pathValue = readOptionalString(value.path);
	if (!pathValue) {
		throw new Error('document review entry path must be a non-empty string');
	}

	if (!isDocReviewStatus(value.status)) {
		throw new Error(`document review status must be one of: ${DOC_REVIEW_STATUSES.join(', ')}`);
	}

	return {
		path: pathValue,
		status: value.status,
		origin: readOptionalString(value.origin) ?? 'llm_modified',
		reason: readOptionalString(value.reason) ?? 'document requires review',
		first_seen_at: readOptionalString(value.first_seen_at) ?? readOptionalString(value.last_touched_at) ?? nowIso(),
		last_touched_at: readOptionalString(value.last_touched_at) ?? nowIso(),
		last_touched_by_kind: parseReviewerKind(value.last_touched_by_kind),
		last_touched_by_id: readOptionalString(value.last_touched_by_id),
		reviewed_at: readOptionalString(value.reviewed_at),
		reviewer_kind: parseReviewerKind(value.reviewer_kind),
		reviewer_id: readOptionalString(value.reviewer_id),
		reviewer_label: readOptionalString(value.reviewer_label),
		reviewer_provider: readOptionalString(value.reviewer_provider),
		reviewer_model: readOptionalString(value.reviewer_model),
		reviewer_command_intent: readOptionalString(value.reviewer_command_intent),
		review_summary: readOptionalString(value.review_summary),
		review_comment: readOptionalString(value.review_comment),
		commented_at: readOptionalString(value.commented_at),
		commented_by_kind: parseReviewerKind(value.commented_by_kind),
		commented_by_id: readOptionalString(value.commented_by_id),
	};
}

function readLedgerFile(projectRoot: string): DocReviewLedger {
	const ledgerPath = path.join(projectRoot, DOC_REVIEW_LEDGER_RELATIVE_PATH);
	const ledgerDirectoryPath = path.dirname(ledgerPath);
	ensureInside(projectRoot, ledgerPath);
	ensureInsideWithoutSymlinks(projectRoot, ledgerDirectoryPath, { allowMissingLeaf: true });

	if (!existsSync(ledgerDirectoryPath)) {
		return { schema_version: '1', documents: [] };
	}

	ensureInsideWithoutSymlinks(projectRoot, ledgerPath, { allowMissingLeaf: true });

	if (!existsSync(ledgerPath)) {
		return { schema_version: '1', documents: [] };
	}

	const parsed = parseTomlText(readUtf8FileInsideWithoutSymlinks(projectRoot, ledgerPath));
	if (!isRecord(parsed)) {
		throw new Error(`${DOC_REVIEW_LEDGER_RELATIVE_PATH} must contain a TOML table`);
	}

	const documents = Array.isArray(parsed.documents) ? parsed.documents.map(parseDocReviewEntry) : [];

	return {
		schema_version: readOptionalString(parsed.schema_version) ?? '1',
		documents,
	};
}

function entryToToml(entry: DocReviewEntry): TomlTable {
	const table: TomlTable = {
		path: entry.path,
		status: entry.status,
		origin: entry.origin,
		reason: entry.reason,
		first_seen_at: entry.first_seen_at,
		last_touched_at: entry.last_touched_at,
	};

	for (const key of [
		'last_touched_by_kind',
		'last_touched_by_id',
		'reviewed_at',
		'reviewer_kind',
		'reviewer_id',
		'reviewer_label',
		'reviewer_provider',
		'reviewer_model',
		'reviewer_command_intent',
		'review_summary',
		'review_comment',
		'commented_at',
		'commented_by_kind',
		'commented_by_id',
	] as const) {
		const value = entry[key];
		if (value) {
			table[key] = value;
		}
	}

	return table;
}

function writeLedgerFile(projectRoot: string, ledger: DocReviewLedger): string {
	const ledgerPath = path.join(projectRoot, DOC_REVIEW_LEDGER_RELATIVE_PATH);
	writeUtf8FileInsideWithoutSymlinks(
		projectRoot,
		ledgerPath,
		stringifyToml({
			schema_version: ledger.schema_version,
			documents: ledger.documents.map(entryToToml),
		}),
	);
	return ledgerPath;
}

export function readDocReviewLedger(projectRoot: string): DocReviewLedger {
	return readLedgerFile(projectRoot);
}

export function listDocReviewEntries(
	projectRoot: string,
	options: { readonly includeAll?: boolean; readonly status?: DocReviewStatus } = {},
): readonly DocReviewListEntry[] {
	const ledger = readLedgerFile(projectRoot);
	const activeStatuses = new Set<string>(DOC_REVIEW_ACTIVE_STATUSES);

	return ledger.documents.filter((entry) => {
		if (options.status) {
			return entry.status === options.status;
		}

		return options.includeAll === true || activeStatuses.has(entry.status);
	}).map((entry) => ({
		...entry,
		...triageDocReview(entry),
	}));
}

export function addDocReviewEntry(projectRoot: string, input: AddDocReviewEntryInput): DocReviewEntry {
	const ledger = readLedgerFile(projectRoot);
	const reviewPath = normalizePath(projectRoot, input.path);
	const timestamp = nowIso(input.now);
	const existing = ledger.documents.find((entry) => entry.path === reviewPath);
	const nextEntry: DocReviewEntry = {
		...existing,
		path: reviewPath,
		status: 'pending',
		origin: input.origin ?? existing?.origin ?? 'llm_modified',
		reason: input.reason ?? existing?.reason ?? 'LLM-created or LLM-modified documentation requires review',
		first_seen_at: existing?.first_seen_at ?? timestamp,
		last_touched_at: timestamp,
		last_touched_by_kind: input.actorKind ?? existing?.last_touched_by_kind,
		last_touched_by_id: input.actorId ?? existing?.last_touched_by_id,
		review_comment: input.comment ?? existing?.review_comment,
		commented_at: input.comment ? timestamp : existing?.commented_at,
		commented_by_kind: input.comment ? input.actorKind : existing?.commented_by_kind,
		commented_by_id: input.comment ? input.actorId : existing?.commented_by_id,
	};
	const documents = existing
		? ledger.documents.map((entry) => (entry.path === reviewPath ? nextEntry : entry))
		: [...ledger.documents, nextEntry].sort((left, right) => left.path.localeCompare(right.path));

	writeLedgerFile(projectRoot, { ...ledger, documents });
	return nextEntry;
}

export function commentDocReviewEntry(projectRoot: string, input: CommentDocReviewEntryInput): DocReviewEntry {
	const ledger = readLedgerFile(projectRoot);
	const reviewPath = normalizePath(projectRoot, input.path);
	const existing = ledger.documents.find((entry) => entry.path === reviewPath);

	if (!existing) {
		throw new Error(`document is not in the review queue: ${reviewPath}`);
	}

	const timestamp = nowIso(input.now);
	const nextEntry: DocReviewEntry = {
		...existing,
		status: 'pending',
		last_touched_at: timestamp,
		last_touched_by_kind: input.actorKind ?? existing.last_touched_by_kind,
		last_touched_by_id: input.actorId ?? existing.last_touched_by_id,
		review_comment: input.comment,
		commented_at: timestamp,
		commented_by_kind: input.actorKind,
		commented_by_id: input.actorId,
	};
	const documents = ledger.documents.map((entry) => (entry.path === reviewPath ? nextEntry : entry));

	writeLedgerFile(projectRoot, { ...ledger, documents });
	return nextEntry;
}

export function markDocReviewEntry(projectRoot: string, input: ReviewDocInput): DocReviewEntry {
	const ledger = readLedgerFile(projectRoot);
	const reviewPath = normalizePath(projectRoot, input.path);
	const existing = ledger.documents.find((entry) => entry.path === reviewPath);

	if (!existing) {
		throw new Error(`document is not in the review queue: ${reviewPath}`);
	}

	const timestamp = nowIso(input.now);
	const nextEntry: DocReviewEntry = {
		...existing,
		status: input.status,
		reviewed_at: timestamp,
		reviewer_kind: input.reviewerKind,
		reviewer_id: input.reviewerId,
		reviewer_label: input.reviewerLabel,
		reviewer_provider: input.reviewerProvider,
		reviewer_model: input.reviewerModel,
		reviewer_command_intent: input.reviewerCommandIntent,
		review_summary: input.summary,
	};
	const documents = ledger.documents.map((entry) => (entry.path === reviewPath ? nextEntry : entry));

	writeLedgerFile(projectRoot, { ...ledger, documents });
	return nextEntry;
}
