import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export const SOURCE_ANCHOR_EXTENSIONS = new Set(['.cjs', '.go', '.js', '.jsx', '.mjs', '.py', '.rs', '.ts', '.tsx']);
export const SOURCE_ANCHOR_DEFAULT_EXCLUDED_PATH_PARTS = new Set([
	'.git',
	'.mustflow',
	'build',
	'coverage',
	'dist',
	'node_modules',
	'third_party',
	'vendor',
]);
export const SOURCE_ANCHOR_GENERATED_PATH_PARTS = new Set([
	'__generated__',
	'build',
	'dist',
	'generated',
	'third_party',
	'vendor',
]);
export const SOURCE_ANCHOR_ALLOWED_FIELDS = new Set(['purpose', 'search', 'invariant', 'risk']);
export const SOURCE_ANCHOR_ALLOWED_RISKS = new Set([
	'authn',
	'authz',
	'authorization',
	'cache',
	'config',
	'data_consistency',
	'data_loss',
	'dependency',
	'external_request',
	'file_upload',
	'injection',
	'migration',
	'payment',
	'pii',
	'privacy',
	'retention',
	'secrets',
	'security',
	'ssrf',
	'state',
	'xss',
]);
export const SOURCE_ANCHOR_ID_PATTERN = /^[a-z0-9][a-z0-9.-]{0,95}$/u;

export interface SourceAnchorSummary {
	readonly id: string;
	readonly path: string;
	readonly lineStart: number;
	readonly purpose: string | null;
	readonly search: readonly string[];
	readonly invariant: string | null;
	readonly risk: readonly string[];
	readonly navigationOnly: true;
	readonly canInstructAgent: false;
}

export interface ParsedSourceAnchor {
	readonly id: string;
	readonly rawId: string;
	readonly idValid: boolean;
	readonly path: string;
	readonly lineStart: number;
	readonly fields: ReadonlyMap<string, string>;
	readonly unsupportedFields: readonly string[];
	readonly rawText: string;
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function listFilesRecursive(root: string, ignoredDirectoryNames: ReadonlySet<string>, current = root): string[] {
	if (!existsSync(current)) {
		return [];
	}

	const files: string[] = [];

	for (const entry of readdirSync(current)) {
		const entryPath = path.join(current, entry);
		const stat = statSync(entryPath);

		if (stat.isDirectory()) {
			if (ignoredDirectoryNames.has(entry)) {
				continue;
			}

			files.push(...listFilesRecursive(root, ignoredDirectoryNames, entryPath));
			continue;
		}

		if (stat.isFile()) {
			files.push(path.relative(root, entryPath));
		}
	}

	return files.sort((left, right) => left.localeCompare(right));
}

export function listSourceAnchorFiles(
	root: string,
	options: { readonly ignoredDirectoryNames?: ReadonlySet<string> } = {},
): string[] {
	const ignoredDirectoryNames = options.ignoredDirectoryNames ?? SOURCE_ANCHOR_DEFAULT_EXCLUDED_PATH_PARTS;

	return listFilesRecursive(root, ignoredDirectoryNames)
		.map((relativePath) => toPosixPath(relativePath))
		.filter((relativePath) => SOURCE_ANCHOR_EXTENSIONS.has(path.posix.extname(relativePath)));
}

export function stripSourceAnchorCommentPrefix(line: string): string {
	return line
		.trim()
		.replace(/^\/\*\*?/u, '')
		.replace(/\*\/$/u, '')
		.replace(/^\/\//u, '')
		.replace(/^#/u, '')
		.replace(/^\*/u, '')
		.trim();
}

function readSourceAnchorField(line: string): { readonly key: string; readonly value: string } | null {
	const separator = line.indexOf(':');

	if (separator === -1) {
		return null;
	}

	const key = line.slice(0, separator).trim().toLowerCase();
	const value = line.slice(separator + 1).trim();

	if (key.length === 0 || value.length === 0) {
		return null;
	}

	return { key, value };
}

export function splitSourceAnchorList(value: string | null | undefined): readonly string[] {
	if (!value) {
		return [];
	}

	return value
		.split(/[,;]/u)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

export function sourceAnchorPathIsGeneratedOrVendor(relativePath: string): boolean {
	const normalized = toPosixPath(relativePath);
	const parts = normalized.split('/');

	if (normalized.endsWith('.min.js') || normalized.endsWith('.min.css')) {
		return true;
	}

	return parts.some((part) => SOURCE_ANCHOR_GENERATED_PATH_PARTS.has(part));
}

export function parseSourceAnchorsInContent(relativePath: string, content: string): ParsedSourceAnchor[] {
	const lines = content.split(/\r?\n/);
	const anchors: ParsedSourceAnchor[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const normalized = stripSourceAnchorCommentPrefix(lines[index] ?? '');

		if (!normalized.startsWith('mf:anchor')) {
			continue;
		}

		const anchorMatch = normalized.match(/^mf:anchor(?:\s+(.+))?$/u);
		const rawId = anchorMatch?.[1]?.trim() ?? '';
		const fields = new Map<string, string>();
		const unsupportedFields: string[] = [];
		const rawLines = [normalized];

		for (let fieldIndex = index + 1; fieldIndex < lines.length; fieldIndex += 1) {
			const fieldLine = stripSourceAnchorCommentPrefix(lines[fieldIndex] ?? '');

			if (fieldLine.length === 0) {
				continue;
			}

			if (fieldLine.startsWith('@') || /^[A-Za-z_$][\w$]*\s/u.test(fieldLine)) {
				break;
			}

			const field = readSourceAnchorField(fieldLine);

			if (!field) {
				break;
			}

			rawLines.push(fieldLine);

			if (!SOURCE_ANCHOR_ALLOWED_FIELDS.has(field.key)) {
				unsupportedFields.push(field.key);
				continue;
			}

			fields.set(field.key, field.value);
		}

		anchors.push({
			id: SOURCE_ANCHOR_ID_PATTERN.test(rawId) ? rawId : '',
			rawId,
			idValid: SOURCE_ANCHOR_ID_PATTERN.test(rawId),
			path: relativePath,
			lineStart: index + 1,
			fields,
			unsupportedFields,
			rawText: rawLines.join('\n'),
		});
	}

	return anchors;
}

/**
 * mf:anchor core.source-anchors.collect
 * purpose: Collect structured inline source anchors without treating source text as workflow authority.
 * search: source anchor parser, navigation metadata, purpose search invariant risk
 * invariant: Collected anchors always report navigationOnly true and canInstructAgent false.
 * risk: config, security
 */
export function collectSourceAnchorSummaries(projectRoot: string): SourceAnchorSummary[] {
	const anchors: SourceAnchorSummary[] = [];

	for (const relativePath of listSourceAnchorFiles(projectRoot)) {
		const filePath = path.join(projectRoot, ...relativePath.split('/'));

		if (!existsSync(filePath) || !statSync(filePath).isFile()) {
			continue;
		}

		const content = readFileSync(filePath, 'utf8');

		for (const anchor of parseSourceAnchorsInContent(relativePath, content)) {
			if (!anchor.idValid) {
				continue;
			}

			anchors.push({
				id: anchor.rawId,
				path: relativePath,
				lineStart: anchor.lineStart,
				purpose: anchor.fields.get('purpose') ?? null,
				search: splitSourceAnchorList(anchor.fields.get('search')),
				invariant: anchor.fields.get('invariant') ?? null,
				risk: splitSourceAnchorList(anchor.fields.get('risk')),
				navigationOnly: true,
				canInstructAgent: false,
			});
		}
	}

	return anchors.sort((left, right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path));
}
