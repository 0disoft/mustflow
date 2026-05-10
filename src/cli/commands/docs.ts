import { readFileSync, unlinkSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import {
	DOC_REVIEW_LEDGER_RELATIVE_PATH,
	DOC_REVIEW_STATUSES,
	REVIEWER_KINDS,
	addDocReviewEntry,
	commentDocReviewEntry,
	isReviewerKind,
	listDocReviewEntries,
	markDocReviewEntry,
	type DocReviewStatus,
	type ReviewerKind,
} from '../lib/doc-review-ledger.js';
import { ensureInside } from '../lib/filesystem.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

interface ParsedOptions {
	readonly values: ReadonlyMap<string, string>;
	readonly flags: ReadonlySet<string>;
	readonly positionals: readonly string[];
	readonly error?: { readonly option: string; readonly missingValue?: boolean };
}

const LIST_FLAGS = new Set(['--json', '--all']);
const LIST_VALUE_OPTIONS = new Set(['--status']);
const ADD_VALUE_OPTIONS = new Set(['--reason', '--origin', '--actor-kind', '--actor-id', '--comment', '--comment-file']);
const COMMENT_VALUE_OPTIONS = new Set(['--comment', '--comment-file', '--actor-kind', '--actor-id']);
const REVIEW_VALUE_OPTIONS = new Set([
	'--reviewer-kind',
	'--reviewer-id',
	'--reviewer-label',
	'--reviewer-provider',
	'--reviewer-model',
	'--command-intent',
	'--summary',
]);

export function getDocsHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf docs review <list|add|comment|approve|needs-human|ignore> [options]',
			summary: t(lang, 'docs.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '--all', description: t(lang, 'docs.help.option.all') },
				{ label: '--status <status>', description: t(lang, 'docs.help.option.status') },
				{ label: '--reason <text>', description: t(lang, 'docs.help.option.reason') },
				{ label: '--origin <value>', description: t(lang, 'docs.help.option.origin') },
				{ label: '--actor-kind <kind>', description: t(lang, 'docs.help.option.actorKind') },
				{ label: '--actor-id <id>', description: t(lang, 'docs.help.option.actorId') },
				{ label: '--comment <text>', description: t(lang, 'docs.help.option.comment') },
				{ label: '--comment-file <path>', description: t(lang, 'docs.help.option.commentFile') },
				{ label: '--reviewer-kind <kind>', description: t(lang, 'docs.help.option.reviewerKind') },
				{ label: '--reviewer-id <id>', description: t(lang, 'docs.help.option.reviewerId') },
				{ label: '--summary <text>', description: t(lang, 'docs.help.option.summary') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf docs review list',
				'mf docs review add docs/guide.md --reason llm_modified --actor-kind llm --actor-id codex',
				'mf docs review comment docs/guide.md --comment-file review-note.md --actor-kind human --actor-id cherr',
				'mf docs review approve docs/guide.md --reviewer-kind llm --reviewer-id opencode --summary "Rewritten for natural tone."',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'docs.help.exit.ok') },
				{ label: '1', description: t(lang, 'docs.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseOptions(args: readonly string[], valueOptions: ReadonlySet<string>, flags: ReadonlySet<string>): ParsedOptions {
	const values = new Map<string, string>();
	const parsedFlags = new Set<string>();
	const positionals: string[] = [];

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (flags.has(arg)) {
			parsedFlags.add(arg);
			continue;
		}

		const equalsIndex = arg.indexOf('=');
		const optionName = equalsIndex > -1 ? arg.slice(0, equalsIndex) : arg;

		if (valueOptions.has(optionName)) {
			const inlineValue = equalsIndex > -1 ? arg.slice(equalsIndex + 1) : undefined;
			const nextValue = inlineValue ?? args[index + 1];

			if (!nextValue || (!inlineValue && nextValue.startsWith('-'))) {
				return { values, flags: parsedFlags, positionals, error: { option: optionName, missingValue: true } };
			}

			values.set(optionName, nextValue);
			if (inlineValue === undefined) {
				index += 1;
			}
			continue;
		}

		if (arg.startsWith('-')) {
			return { values, flags: parsedFlags, positionals, error: { option: arg } };
		}

		positionals.push(arg);
	}

	return { values, flags: parsedFlags, positionals };
}

function parseStatus(value: string | undefined): DocReviewStatus | undefined {
	if (value === undefined) {
		return undefined;
	}

	return DOC_REVIEW_STATUSES.includes(value as DocReviewStatus) ? (value as DocReviewStatus) : undefined;
}

function parseReviewerKind(value: string | undefined): ReviewerKind | undefined {
	if (value === undefined) {
		return undefined;
	}

	return isReviewerKind(value) ? value : undefined;
}

interface ReviewCommentInput {
	readonly comment?: string;
	readonly importedCommentFilePath?: string;
	readonly error?: string;
}

function readCommentFile(projectRoot: string, commentFile: string): { readonly comment: string; readonly absolutePath: string } {
	const commentFilePath = path.resolve(projectRoot, commentFile);
	ensureInside(projectRoot, commentFilePath);
	return {
		comment: readFileSync(commentFilePath, 'utf8').trimEnd(),
		absolutePath: commentFilePath,
	};
}

function readReviewComment(projectRoot: string, parsed: ParsedOptions, lang: CliLang): ReviewCommentInput {
	const inlineComment = parsed.values.get('--comment');
	const commentFile = parsed.values.get('--comment-file');

	if (inlineComment && commentFile) {
		return { error: t(lang, 'docs.error.commentSourceConflict') };
	}

	if (!inlineComment && !commentFile) {
		return {};
	}

	let comment: string | undefined;
	let importedCommentFilePath: string | undefined;
	try {
		if (commentFile) {
			const imported = readCommentFile(projectRoot, commentFile);
			comment = imported.comment;
			importedCommentFilePath = imported.absolutePath;
		} else {
			comment = inlineComment;
		}
	} catch (error) {
		return { error: error instanceof Error ? error.message : String(error) };
	}

	if (!comment || comment.trim().length === 0) {
		return { error: t(lang, 'docs.error.emptyComment') };
	}

	return { comment, importedCommentFilePath };
}

function ensureCommentFileIsNotDocument(projectRoot: string, documentPath: string, commentFilePath: string | undefined, lang: CliLang): string | undefined {
	if (!commentFilePath) {
		return undefined;
	}

	const documentAbsolutePath = path.resolve(projectRoot, documentPath);
	ensureInside(projectRoot, documentAbsolutePath);
	const normalizedDocumentPath = path.normalize(documentAbsolutePath);
	const normalizedCommentFilePath = path.normalize(commentFilePath);
	const isSamePath =
		process.platform === 'win32'
			? normalizedDocumentPath.toLowerCase() === normalizedCommentFilePath.toLowerCase()
			: normalizedDocumentPath === normalizedCommentFilePath;
	return isSamePath ? t(lang, 'docs.error.commentFileIsDocument') : undefined;
}

function removeImportedCommentFile(importedCommentFilePath: string | undefined): void {
	if (importedCommentFilePath) {
		unlinkSync(importedCommentFilePath);
	}
}

function renderEntries(entries: ReturnType<typeof listDocReviewEntries>, lang: CliLang): string {
	const lines = [t(lang, 'docs.review.title'), `${t(lang, 'label.documents')}: ${entries.length}`];

	if (entries.length === 0) {
		lines.push(t(lang, 'docs.review.empty'));
		return lines.join('\n');
	}

	for (const entry of entries) {
		const blocking = entry.release_blocking ? ' release-blocking' : '';
		lines.push(`- ${entry.path} [${entry.status} ${entry.review_priority}${blocking}] ${entry.reason}`);
		if (entry.review_comment) {
			const firstLine = entry.review_comment.split(/\r?\n/).find((line) => line.trim().length > 0);
			lines.push(`  ${t(lang, 'label.comment')}: ${firstLine ?? entry.review_comment}`);
		}
	}

	return lines.join('\n');
}

function renderEntryAction(action: string, path: string, lang: CliLang): string {
	return `${t(lang, 'docs.review.wrote')}: ${DOC_REVIEW_LEDGER_RELATIVE_PATH}\n${action}: ${path}`;
}

function getMarkedAction(status: Extract<DocReviewStatus, 'approved' | 'needs_human' | 'ignored'>, lang: CliLang): string {
	if (status === 'approved') {
		return t(lang, 'docs.review.marked.approved');
	}

	if (status === 'needs_human') {
		return t(lang, 'docs.review.marked.needs_human');
	}

	return t(lang, 'docs.review.marked.ignored');
}

function usageError(reporter: Reporter, message: string, lang: CliLang): number {
	printUsageError(reporter, message, 'mf docs --help', getDocsHelp(lang), lang);
	return 1;
}

function runReviewList(args: string[], reporter: Reporter, lang: CliLang): number {
	const parsed = parseOptions(args, LIST_VALUE_OPTIONS, LIST_FLAGS);

	if (parsed.error) {
		const message = parsed.error.missingValue
			? t(lang, 'cli.error.missingValue', { option: parsed.error.option })
			: t(lang, 'cli.error.unknownOption', { option: parsed.error.option });
		return usageError(reporter, message, lang);
	}

	if (parsed.positionals.length > 0) {
		return usageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: parsed.positionals[0] }), lang);
	}

	const status = parseStatus(parsed.values.get('--status'));
	if (parsed.values.has('--status') && !status) {
		return usageError(reporter, t(lang, 'docs.error.invalidStatus', { statuses: DOC_REVIEW_STATUSES.join(', ') }), lang);
	}

	const entries = listDocReviewEntries(resolveMustflowRoot(), {
		includeAll: parsed.flags.has('--all'),
		status,
	});

	if (parsed.flags.has('--json')) {
		reporter.stdout(
			JSON.stringify(
				{
					schema_version: '1',
					command: 'docs review list',
					ledger_path: DOC_REVIEW_LEDGER_RELATIVE_PATH,
					count: entries.length,
					documents: entries,
				},
				null,
				2,
			),
		);
		return 0;
	}

	reporter.stdout(renderEntries(entries, lang));
	return 0;
}

/**
 * mf:anchor cli.docs.review-add
 * purpose: Add LLM-modified or generated documentation to the review queue with optional comments.
 * search: docs review add, review ledger, actor kind, comment file, documentation queue
 * invariant: Imported comment files are removed only after the review entry is recorded.
 * risk: state, data_consistency
 */
function runReviewAdd(args: string[], reporter: Reporter, lang: CliLang): number {
	const parsed = parseOptions(args, ADD_VALUE_OPTIONS, new Set());

	if (parsed.error) {
		const message = parsed.error.missingValue
			? t(lang, 'cli.error.missingValue', { option: parsed.error.option })
			: t(lang, 'cli.error.unknownOption', { option: parsed.error.option });
		return usageError(reporter, message, lang);
	}

	const [documentPath, unexpected] = parsed.positionals;
	if (!documentPath) {
		return usageError(reporter, t(lang, 'docs.error.missingPath'), lang);
	}

	if (unexpected) {
		return usageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: unexpected }), lang);
	}

	const actorKind = parseReviewerKind(parsed.values.get('--actor-kind'));
	if (parsed.values.has('--actor-kind') && !actorKind) {
		return usageError(reporter, t(lang, 'docs.error.invalidReviewerKind', { kinds: REVIEWER_KINDS.join(', ') }), lang);
	}

	const projectRoot = resolveMustflowRoot();
	const commentResult = readReviewComment(projectRoot, parsed, lang);
	if (commentResult.error) {
		return usageError(reporter, commentResult.error, lang);
	}
	const commentFileError = ensureCommentFileIsNotDocument(projectRoot, documentPath, commentResult.importedCommentFilePath, lang);
	if (commentFileError) {
		return usageError(reporter, commentFileError, lang);
	}

	const entry = addDocReviewEntry(projectRoot, {
		path: documentPath,
		reason: parsed.values.get('--reason'),
		origin: parsed.values.get('--origin'),
		comment: commentResult.comment,
		actorKind,
		actorId: parsed.values.get('--actor-id'),
	});
	removeImportedCommentFile(commentResult.importedCommentFilePath);

	reporter.stdout(renderEntryAction(t(lang, 'docs.review.added'), entry.path, lang));
	return 0;
}

function runReviewComment(args: string[], reporter: Reporter, lang: CliLang): number {
	const parsed = parseOptions(args, COMMENT_VALUE_OPTIONS, new Set());

	if (parsed.error) {
		const message = parsed.error.missingValue
			? t(lang, 'cli.error.missingValue', { option: parsed.error.option })
			: t(lang, 'cli.error.unknownOption', { option: parsed.error.option });
		return usageError(reporter, message, lang);
	}

	const [documentPath, unexpected] = parsed.positionals;
	if (!documentPath) {
		return usageError(reporter, t(lang, 'docs.error.missingPath'), lang);
	}

	if (unexpected) {
		return usageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: unexpected }), lang);
	}

	const actorKind = parseReviewerKind(parsed.values.get('--actor-kind'));
	if (parsed.values.has('--actor-kind') && !actorKind) {
		return usageError(reporter, t(lang, 'docs.error.invalidReviewerKind', { kinds: REVIEWER_KINDS.join(', ') }), lang);
	}

	const projectRoot = resolveMustflowRoot();
	const commentResult = readReviewComment(projectRoot, parsed, lang);
	if (commentResult.error) {
		return usageError(reporter, commentResult.error, lang);
	}
	const commentFileError = ensureCommentFileIsNotDocument(projectRoot, documentPath, commentResult.importedCommentFilePath, lang);
	if (commentFileError) {
		return usageError(reporter, commentFileError, lang);
	}

	if (!commentResult.comment) {
		return usageError(reporter, t(lang, 'docs.error.missingComment'), lang);
	}

	try {
		const entry = commentDocReviewEntry(projectRoot, {
			path: documentPath,
			comment: commentResult.comment,
			actorKind,
			actorId: parsed.values.get('--actor-id'),
		});
		removeImportedCommentFile(commentResult.importedCommentFilePath);

		reporter.stdout(renderEntryAction(t(lang, 'docs.review.commented'), entry.path, lang));
		return 0;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		reporter.stderr(renderCliError(message, 'mf docs --help', lang));
		return 1;
	}
}

function runReviewMark(
	args: string[],
	status: Extract<DocReviewStatus, 'approved' | 'needs_human' | 'ignored'>,
	reporter: Reporter,
	lang: CliLang,
): number {
	const parsed = parseOptions(args, REVIEW_VALUE_OPTIONS, new Set());

	if (parsed.error) {
		const message = parsed.error.missingValue
			? t(lang, 'cli.error.missingValue', { option: parsed.error.option })
			: t(lang, 'cli.error.unknownOption', { option: parsed.error.option });
		return usageError(reporter, message, lang);
	}

	const [documentPath, unexpected] = parsed.positionals;
	if (!documentPath) {
		return usageError(reporter, t(lang, 'docs.error.missingPath'), lang);
	}

	if (unexpected) {
		return usageError(reporter, t(lang, 'cli.error.unexpectedArgument', { argument: unexpected }), lang);
	}

	const reviewerKind = parseReviewerKind(parsed.values.get('--reviewer-kind'));
	if (!reviewerKind) {
		const key = parsed.values.has('--reviewer-kind') ? 'docs.error.invalidReviewerKind' : 'docs.error.missingReviewerKind';
		return usageError(reporter, t(lang, key, { kinds: REVIEWER_KINDS.join(', ') }), lang);
	}

	const reviewerId = parsed.values.get('--reviewer-id');
	if (!reviewerId) {
		return usageError(reporter, t(lang, 'docs.error.missingReviewerId'), lang);
	}

	try {
		const entry = markDocReviewEntry(resolveMustflowRoot(), {
			path: documentPath,
			status,
			reviewerKind,
			reviewerId,
			reviewerLabel: parsed.values.get('--reviewer-label'),
			reviewerProvider: parsed.values.get('--reviewer-provider'),
			reviewerModel: parsed.values.get('--reviewer-model'),
			reviewerCommandIntent: parsed.values.get('--command-intent'),
			summary: parsed.values.get('--summary'),
		});

		reporter.stdout(renderEntryAction(getMarkedAction(status, lang), entry.path, lang));
		return 0;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		reporter.stderr(renderCliError(message, 'mf docs --help', lang));
		return 1;
	}
}

export function runDocs(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getDocsHelp(lang));
		return 0;
	}

	const [topic, action, ...rest] = args;

	if (topic !== 'review') {
		return usageError(reporter, topic ? t(lang, 'docs.error.unknownTopic', { topic }) : t(lang, 'docs.error.missingTopic'), lang);
	}

	if (!action || action === 'list') {
		return runReviewList(rest, reporter, lang);
	}

	if (action === 'add' || action === 'record') {
		return runReviewAdd(rest, reporter, lang);
	}

	if (action === 'comment') {
		return runReviewComment(rest, reporter, lang);
	}

	if (action === 'approve' || action === 'mark-approved') {
		return runReviewMark(rest, 'approved', reporter, lang);
	}

	if (action === 'needs-human' || action === 'mark-needs-human') {
		return runReviewMark(rest, 'needs_human', reporter, lang);
	}

	if (action === 'ignore' || action === 'mark-ignored') {
		return runReviewMark(rest, 'ignored', reporter, lang);
	}

	return usageError(reporter, t(lang, 'docs.error.unknownAction', { action }), lang);
}
