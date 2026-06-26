import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const LINK_INTEGRITY_PACK_ID = 'docs';
export const LINK_INTEGRITY_SCRIPT_ID = 'link-integrity';
export const LINK_INTEGRITY_SCRIPT_REF = `${LINK_INTEGRITY_PACK_ID}/${LINK_INTEGRITY_SCRIPT_ID}`;

export type LinkIntegrityAction = 'check';
export type LinkIntegrityLinkKind = 'local_file' | 'local_anchor' | 'external_url' | 'email' | 'site_path';
export type LinkIntegrityLinkStatus = 'ok' | 'missing' | 'skipped' | 'unknown';

export type LinkIntegrityFindingCode =
	| 'link_integrity_path_outside_root'
	| 'link_integrity_unreadable_path'
	| 'link_integrity_file_too_large'
	| 'link_integrity_max_files_exceeded'
	| 'link_integrity_missing_file'
	| 'link_integrity_missing_anchor';

export interface LinkIntegrityPolicy {
	readonly max_files: number;
	readonly max_file_bytes: number;
	readonly default_paths: readonly string[];
	readonly path_filters: readonly string[];
	readonly ignored_directories: readonly string[];
	readonly checked_link_kinds: readonly LinkIntegrityLinkKind[];
}

export interface LinkIntegrityFile {
	readonly kind: 'document';
	readonly path: string;
	readonly sha256: string | null;
	readonly size_bytes: number | null;
	readonly line_count: number | null;
	readonly link_count: number;
}

export interface LinkIntegrityLink {
	readonly kind: LinkIntegrityLinkKind;
	readonly path: string;
	readonly line: number;
	readonly text: string;
	readonly target: string;
	readonly resolved_path: string | null;
	readonly anchor: string | null;
	readonly status: LinkIntegrityLinkStatus;
	readonly message: string;
}

export interface LinkIntegritySummary {
	readonly files_checked: number;
	readonly links_checked: number;
	readonly ok: number;
	readonly missing: number;
	readonly skipped: number;
	readonly unknown: number;
}

export interface LinkIntegrityFinding extends ScriptCheckFinding {
	readonly code: LinkIntegrityFindingCode;
	readonly path: string;
	readonly line?: number;
}

export interface LinkIntegrityReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof LINK_INTEGRITY_PACK_ID;
	readonly script_id: typeof LINK_INTEGRITY_SCRIPT_ID;
	readonly script_ref: typeof LINK_INTEGRITY_SCRIPT_REF;
	readonly action: LinkIntegrityAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: LinkIntegrityPolicy;
	readonly input_hash: string;
	readonly files: readonly LinkIntegrityFile[];
	readonly links: readonly LinkIntegrityLink[];
	readonly summary: LinkIntegritySummary;
	readonly findings: readonly LinkIntegrityFinding[];
	readonly issues: readonly string[];
}

export interface CheckLinkIntegrityOptions {
	readonly paths: readonly string[];
	readonly maxFiles?: number;
	readonly maxFileBytes?: number;
}

interface DocumentCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
}

interface RawLink {
	readonly path: string;
	readonly line: number;
	readonly text: string;
	readonly target: string;
}

const DEFAULT_MAX_FILES = 200;
const DEFAULT_MAX_FILE_BYTES = 512 * 1024;
const MAX_ISSUES = 50;
const DEFAULT_PATHS = ['README.md', 'schemas/README.md', 'docs-site/src/content/docs'] as const;
const PATH_FILTERS = ['*.md', '*.mdx'] as const;
const CHECKED_LINK_KINDS: readonly LinkIntegrityLinkKind[] = ['local_file', 'local_anchor'];
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const ERROR_CODES = new Set<LinkIntegrityFindingCode>([
	'link_integrity_path_outside_root',
	'link_integrity_unreadable_path',
	'link_integrity_file_too_large',
	'link_integrity_max_files_exceeded',
]);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(buffer: Buffer | string): string {
	return `sha256:${createHash('sha256').update(buffer).digest('hex')}`;
}

function makeFinding(
	code: LinkIntegrityFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	line?: number,
): LinkIntegrityFinding {
	return line === undefined ? { code, severity, path: pathValue, message } : { code, severity, path: pathValue, line, message };
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function isDocumentPath(relativePath: string): boolean {
	return /\.(?:md|mdx)$/u.test(relativePath);
}

function normalizeInputPath(projectRoot: string, inputPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), inputPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function addCandidate(
	candidates: Map<string, DocumentCandidate>,
	findings: LinkIntegrityFinding[],
	issues: string[],
	policy: LinkIntegrityPolicy,
	candidate: DocumentCandidate,
): void {
	if (candidates.has(candidate.relativePath)) {
		return;
	}
	if (candidates.size >= policy.max_files) {
		if (!findings.some((finding) => finding.code === 'link_integrity_max_files_exceeded')) {
			const message = `Link-integrity matched more than ${policy.max_files} document files; remaining files were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('link_integrity_max_files_exceeded', 'medium', candidate.relativePath, message));
		}
		return;
	}
	candidates.set(candidate.relativePath, candidate);
}

function collectDocumentsFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: Map<string, DocumentCandidate>,
	findings: LinkIntegrityFinding[],
	issues: string[],
	policy: LinkIntegrityPolicy,
): void {
	const relativeDirectory = normalizeRelativePath(path.relative(projectRoot, absoluteDirectory));
	if (isIgnoredDirectoryPath(relativeDirectory, IGNORED_DIRECTORIES)) {
		return;
	}

	let entries;
	try {
		ensureInsideWithoutSymlinks(projectRoot, absoluteDirectory);
		entries = readdirSync(absoluteDirectory, { withFileTypes: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${relativeDirectory}: ${message}`);
		findings.push(makeFinding('link_integrity_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));
		if (entry.isDirectory()) {
			collectDocumentsFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy);
			continue;
		}
		if (entry.isFile() && isDocumentPath(relativeEntry)) {
			addCandidate(candidates, findings, issues, policy, { absolutePath: absoluteEntry, relativePath: relativeEntry });
		}
	}
}

function collectDocumentCandidates(
	projectRoot: string,
	inputPaths: readonly string[],
	policy: LinkIntegrityPolicy,
	findings: LinkIntegrityFinding[],
	issues: string[],
): readonly DocumentCandidate[] {
	const candidates = new Map<string, DocumentCandidate>();
	const pathsToCheck = inputPaths.length > 0 ? inputPaths : policy.default_paths;

	for (const inputPath of pathsToCheck) {
		let absolutePath: string;
		let relativePath: string;
		try {
			const normalized = normalizeInputPath(projectRoot, inputPath);
			absolutePath = normalized.absolutePath;
			relativePath = normalized.relativePath;
			ensureInsideWithoutSymlinks(projectRoot, absolutePath, {
				allowMissingDescendant: true,
				allowMissingLeaf: true,
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, message);
			findings.push(makeFinding('link_integrity_path_outside_root', 'high', inputPath, message));
			continue;
		}

		if (!existsSync(absolutePath)) {
			continue;
		}

		let stats;
		try {
			stats = lstatSync(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			findings.push(makeFinding('link_integrity_unreadable_path', 'high', relativePath, message));
			continue;
		}

		if (stats.isDirectory()) {
			collectDocumentsFromDirectory(projectRoot, absolutePath, candidates, findings, issues, policy);
			continue;
		}
		if (stats.isFile() && isDocumentPath(relativePath)) {
			addCandidate(candidates, findings, issues, policy, { absolutePath, relativePath });
		}
	}

	return [...candidates.values()].sort((left, right) => left.relativePath.localeCompare(right.relativePath));
}

function stripOptionalLinkTitle(target: string): string {
	return target.trim().replace(/\s+["'][^"']*["']\s*$/u, '').trim();
}

function normalizeInlineTarget(target: string): string {
	const stripped = stripOptionalLinkTitle(target);
	if (stripped.startsWith('<') && stripped.endsWith('>')) {
		return stripped.slice(1, -1).trim();
	}
	return stripped;
}

function extractRawLinks(relativePath: string, text: string): readonly RawLink[] {
	const links: RawLink[] = [];
	const lines = text.split(/\r?\n/u);

	for (const [index, line] of lines.entries()) {
		const lineNumber = index + 1;
		for (const match of line.matchAll(/!?\[([^\]\n]*)\]\(([^)\n]+)\)/gu)) {
			const target = normalizeInlineTarget(match[2] ?? '');
			if (target.length === 0) {
				continue;
			}
			links.push({
				path: relativePath,
				line: lineNumber,
				text: match[1] ?? '',
				target,
			});
		}
	}

	return links;
}

function decodeUriComponentSafe(value: string): string {
	try {
		return decodeURIComponent(value);
	} catch {
		return value;
	}
}

function splitTarget(target: string): { readonly pathPart: string; readonly anchor: string | null } {
	const [pathAndQuery = '', rawAnchor] = target.split('#', 2);
	const pathPart = pathAndQuery.split('?', 1)[0] ?? '';
	const anchor = rawAnchor === undefined ? null : decodeUriComponentSafe(rawAnchor);
	return { pathPart, anchor };
}

function stripHtmlTagText(value: string): string {
	let result = '';
	let tagDepth = 0;

	for (const char of value) {
		if (char === '<') {
			tagDepth += 1;
			continue;
		}
		if (char === '>') {
			tagDepth = Math.max(0, tagDepth - 1);
			continue;
		}
		if (tagDepth === 0) {
			result += char;
		}
	}

	return result;
}

function slugHeading(value: string): string {
	return stripHtmlTagText(value)
		.replace(/[`*_~]/gu, '')
		.replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
		.toLocaleLowerCase()
		.replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
		.trim()
		.replace(/\s+/gu, '-');
}

function collectAnchors(text: string): ReadonlySet<string> {
	const anchors = new Set<string>();
	const counts = new Map<string, number>();

	for (const line of text.split(/\r?\n/u)) {
		const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/u.exec(line);
		if (!match) {
			continue;
		}

		const base = slugHeading(match[2] ?? '');
		if (base.length === 0) {
			continue;
		}
		const count = counts.get(base) ?? 0;
		counts.set(base, count + 1);
		anchors.add(count === 0 ? base : `${base}-${count}`);
	}

	return anchors;
}

function normalizeAnchorTarget(anchor: string): string {
	return slugHeading(anchor.replace(/^#+/u, ''));
}

function readDocumentText(projectRoot: string, absolutePath: string, maxBytes: number): string {
	return readFileInsideWithoutSymlinks(projectRoot, absolutePath, { maxBytes }).toString('utf8');
}

function validateLink(projectRoot: string, source: DocumentCandidate, link: RawLink, maxBytes: number): LinkIntegrityLink {
	if (/^https?:\/\//iu.test(link.target)) {
		return {
			...link,
			kind: 'external_url',
			resolved_path: null,
			anchor: null,
			status: 'skipped',
			message: 'External URL is not fetched by this read-only offline check.',
		};
	}

	if (/^mailto:/iu.test(link.target)) {
		return {
			...link,
			kind: 'email',
			resolved_path: null,
			anchor: null,
			status: 'skipped',
			message: 'Email link is outside local file and anchor validation.',
		};
	}

	if (/^[a-z][a-z0-9+.-]*:/iu.test(link.target)) {
		return {
			...link,
			kind: 'external_url',
			resolved_path: null,
			anchor: null,
			status: 'skipped',
			message: 'Non-file URI scheme is outside local file and anchor validation.',
		};
	}

	if (link.target.startsWith('/')) {
		return {
			...link,
			kind: 'site_path',
			resolved_path: null,
			anchor: null,
			status: 'skipped',
			message: 'Site-root path is not resolved against repository files.',
		};
	}

	const { pathPart, anchor } = splitTarget(link.target);
	const targetAbsolutePath = pathPart.length === 0
		? source.absolutePath
		: path.resolve(path.dirname(source.absolutePath), decodeUriComponentSafe(pathPart));

	try {
		ensureInside(projectRoot, targetAbsolutePath);
	} catch {
		return {
			...link,
			kind: anchor === null ? 'local_file' : 'local_anchor',
			resolved_path: null,
			anchor,
			status: 'missing',
			message: `Linked path escapes the mustflow root: ${link.target}`,
		};
	}

	const resolvedPath = normalizeRelativePath(path.relative(projectRoot, targetAbsolutePath));
	if (!existsSync(targetAbsolutePath)) {
		return {
			...link,
			kind: anchor === null ? 'local_file' : 'local_anchor',
			resolved_path: resolvedPath,
			anchor,
			status: 'missing',
			message: `Linked file is missing: ${resolvedPath}`,
		};
	}

	if (anchor === null || anchor.length === 0) {
		return {
			...link,
			kind: 'local_file',
			resolved_path: resolvedPath,
			anchor: null,
			status: 'ok',
			message: `Linked file exists: ${resolvedPath}`,
		};
	}

	if (!isDocumentPath(resolvedPath)) {
		return {
			...link,
			kind: 'local_anchor',
			resolved_path: resolvedPath,
			anchor,
			status: 'unknown',
			message: `Anchor target is not a Markdown document: ${resolvedPath}`,
		};
	}

	const targetText = readDocumentText(projectRoot, targetAbsolutePath, maxBytes);
	const normalizedAnchor = normalizeAnchorTarget(anchor);
	const anchors = collectAnchors(targetText);
	return anchors.has(normalizedAnchor)
		? {
				...link,
				kind: 'local_anchor',
				resolved_path: resolvedPath,
				anchor,
				status: 'ok',
				message: `Linked anchor exists: ${resolvedPath}#${normalizedAnchor}`,
			}
		: {
				...link,
				kind: 'local_anchor',
				resolved_path: resolvedPath,
				anchor,
				status: 'missing',
				message: `Linked anchor is missing: ${resolvedPath}#${normalizedAnchor}`,
			};
}

function findingForLink(link: LinkIntegrityLink): LinkIntegrityFinding | null {
	if (link.status !== 'missing') {
		return null;
	}
	if (link.kind === 'local_anchor' && link.anchor !== null && link.message.includes('Linked anchor is missing')) {
		return makeFinding('link_integrity_missing_anchor', 'medium', link.path, link.message, link.line);
	}
	return makeFinding('link_integrity_missing_file', 'medium', link.path, link.message, link.line);
}

function linkIntegrityStatus(findings: readonly LinkIntegrityFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	if (findings.some((finding) => ['medium', 'high', 'critical'].includes(finding.severity))) {
		return 'failed';
	}
	return 'passed';
}

function summarizeLinks(files: readonly LinkIntegrityFile[], links: readonly LinkIntegrityLink[]): LinkIntegritySummary {
	const count = (status: LinkIntegrityLinkStatus): number => links.filter((link) => link.status === status).length;
	return {
		files_checked: files.length,
		links_checked: links.length,
		ok: count('ok'),
		missing: count('missing'),
		skipped: count('skipped'),
		unknown: count('unknown'),
	};
}

function createInputHash(
	policy: LinkIntegrityPolicy,
	files: readonly LinkIntegrityFile[],
	links: readonly LinkIntegrityLink[],
	findings: readonly LinkIntegrityFinding[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			files: files.map((file) => ({ path: file.path, sha256: file.sha256, link_count: file.link_count })),
			links: links.map((link) => ({
				kind: link.kind,
				path: link.path,
				line: link.line,
				target: link.target,
				resolved_path: link.resolved_path,
				anchor: link.anchor,
				status: link.status,
			})),
			findings: findings.map((finding) => ({ code: finding.code, path: finding.path, line: finding.line })),
		}),
	);
}

export function checkLinkIntegrity(projectRoot: string, options: CheckLinkIntegrityOptions): LinkIntegrityReport {
	const root = path.resolve(projectRoot);
	const policy: LinkIntegrityPolicy = {
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		default_paths: [...DEFAULT_PATHS],
		path_filters: [...PATH_FILTERS],
		ignored_directories: [...IGNORED_DIRECTORIES],
		checked_link_kinds: [...CHECKED_LINK_KINDS],
	};
	const findings: LinkIntegrityFinding[] = [];
	const issues: string[] = [];
	const fileEntries: LinkIntegrityFile[] = [];
	const links: LinkIntegrityLink[] = [];
	const candidates = collectDocumentCandidates(root, options.paths, policy, findings, issues);

	for (const candidate of candidates) {
		let buffer: Buffer | null = null;
		try {
			buffer = readFileInsideWithoutSymlinks(root, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const code = message.includes('exceeds maximum size')
				? 'link_integrity_file_too_large'
				: 'link_integrity_unreadable_path';
			pushIssue(issues, `${candidate.relativePath}: ${message}`);
			findings.push(makeFinding(code, 'high', candidate.relativePath, message));
		}

		const text = buffer?.toString('utf8') ?? '';
		const rawLinks = buffer ? extractRawLinks(candidate.relativePath, text) : [];
		for (const rawLink of rawLinks) {
			try {
				const validatedLink = validateLink(root, candidate, rawLink, policy.max_file_bytes);
				links.push(validatedLink);
				const finding = findingForLink(validatedLink);
				if (finding) {
					findings.push(finding);
				}
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				pushIssue(issues, `${candidate.relativePath}:${rawLink.line}: ${message}`);
				findings.push(makeFinding('link_integrity_unreadable_path', 'high', candidate.relativePath, message, rawLink.line));
			}
		}

		fileEntries.push({
			kind: 'document',
			path: candidate.relativePath,
			sha256: buffer ? sha256Tagged(buffer) : null,
			size_bytes: buffer?.byteLength ?? null,
			line_count: buffer ? text.split(/\r?\n/u).length : null,
			link_count: rawLinks.length,
		});
	}

	const sortedFiles = fileEntries.sort((left, right) => left.path.localeCompare(right.path));
	const sortedLinks = links.sort((left, right) =>
		left.path.localeCompare(right.path) ||
		left.line - right.line ||
		left.kind.localeCompare(right.kind) ||
		left.target.localeCompare(right.target),
	);
	const status = linkIntegrityStatus(findings);
	const summary = summarizeLinks(sortedFiles, sortedLinks);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: LINK_INTEGRITY_PACK_ID,
		script_id: LINK_INTEGRITY_SCRIPT_ID,
		script_ref: LINK_INTEGRITY_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, sortedFiles, sortedLinks, findings),
		files: sortedFiles,
		links: sortedLinks,
		summary,
		findings,
		issues,
	};
}
