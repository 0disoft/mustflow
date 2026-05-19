import { existsSync, readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import path from 'node:path';

import { SECRET_LIKE_PATTERNS, textContainsSecretLike } from './secret-redaction.js';

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
export const SOURCE_ANCHOR_SECRET_LIKE_PATTERNS = SECRET_LIKE_PATTERNS;

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

export interface SourceAnchorFileOptions {
	readonly ignoredDirectoryNames?: ReadonlySet<string>;
	readonly include?: readonly string[];
	readonly exclude?: readonly string[];
	readonly excludeGeneratedOrVendor?: boolean;
	readonly maxFileBytes?: number | null;
	readonly allowedExtensions?: readonly string[] | ReadonlySet<string>;
	readonly followSymlinks?: boolean;
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

interface SourceAnchorFileDiscoveryOptions {
	readonly ignoredDirectoryNames: ReadonlySet<string>;
	readonly allowedExtensions: ReadonlySet<string>;
	readonly include: readonly RegExp[];
	readonly exclude: readonly RegExp[];
	readonly excludeGeneratedOrVendor: boolean;
	readonly maxFileBytes: number | null | undefined;
	readonly followSymlinks: boolean;
	readonly rootRealPath: string;
	readonly visitedRealDirectories: Set<string>;
}

function pathIsInsideRoot(rootRealPath: string, candidateRealPath: string): boolean {
	const relative = path.relative(rootRealPath, candidateRealPath);
	return relative.length === 0 || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function shouldIncludeSourceAnchorFile(relativePath: string, options: SourceAnchorFileDiscoveryOptions): boolean {
	if (!options.allowedExtensions.has(path.posix.extname(relativePath))) {
		return false;
	}

	if (options.excludeGeneratedOrVendor && sourceAnchorPathIsGeneratedOrVendor(relativePath)) {
		return false;
	}

	if (options.include.length > 0 && !matchesAnyGlob(relativePath, options.include)) {
		return false;
	}

	if (options.exclude.length > 0 && matchesAnyGlob(relativePath, options.exclude)) {
		return false;
	}

	return true;
}

function fileIsWithinSizeLimit(filePath: string, maxFileBytes: number | null | undefined): boolean {
	if (typeof maxFileBytes !== 'number' || !Number.isFinite(maxFileBytes) || maxFileBytes <= 0) {
		return true;
	}

	try {
		return statSync(filePath).size <= maxFileBytes;
	} catch {
		return false;
	}
}

function listFilesRecursive(root: string, options: SourceAnchorFileDiscoveryOptions, current = root): string[] {
	if (!existsSync(current)) {
		return [];
	}

	const currentRealPath = realpathSync(current);
	if (!pathIsInsideRoot(options.rootRealPath, currentRealPath) || options.visitedRealDirectories.has(currentRealPath)) {
		return [];
	}
	options.visitedRealDirectories.add(currentRealPath);

	const files: string[] = [];

	const entries = readdirSync(current, { withFileTypes: true }).sort((left, right) => left.name.localeCompare(right.name));

	for (const entry of entries) {
		const entryPath = path.join(current, entry.name);

		if (options.ignoredDirectoryNames.has(entry.name)) {
			continue;
		}

		if (entry.isDirectory()) {
			files.push(...listFilesRecursive(root, options, entryPath));
			continue;
		}

		if (entry.isSymbolicLink()) {
			if (!options.followSymlinks) {
				continue;
			}

			let realPath: string;
			try {
				realPath = realpathSync(entryPath);
			} catch {
				continue;
			}
			if (!pathIsInsideRoot(options.rootRealPath, realPath)) {
				continue;
			}

			let stat: ReturnType<typeof statSync>;
			try {
				stat = statSync(entryPath);
			} catch {
				continue;
			}
			if (stat.isDirectory()) {
				files.push(...listFilesRecursive(root, options, entryPath));
				continue;
			}

			if (stat.isFile()) {
				const relativePath = toPosixPath(path.relative(root, entryPath));
				if (shouldIncludeSourceAnchorFile(relativePath, options) && fileIsWithinSizeLimit(entryPath, options.maxFileBytes)) {
					files.push(relativePath);
				}
			}
			continue;
		}

		if (entry.isFile()) {
			const relativePath = toPosixPath(path.relative(root, entryPath));
			if (shouldIncludeSourceAnchorFile(relativePath, options) && fileIsWithinSizeLimit(entryPath, options.maxFileBytes)) {
				files.push(relativePath);
			}
		}
	}

	return files.sort((left, right) => left.localeCompare(right));
}

function escapeRegExp(value: string): string {
	return value.replace(/[\\^$.*+?()[\]{}|]/gu, '\\$&');
}

function globToRegExp(pattern: string): RegExp {
	const normalized = toPosixPath(pattern).replace(/^\/+/u, '');
	let source = '^';

	for (let index = 0; index < normalized.length; ) {
		const current = normalized[index];
		const next = normalized[index + 1];
		const afterNext = normalized[index + 2];

		if (current === '*' && next === '*') {
			if (afterNext === '/') {
				source += '(?:.*/)?';
				index += 3;
				continue;
			}

			source += '.*';
			index += 2;
			continue;
		}

		if (current === '*') {
			source += '[^/]*';
			index += 1;
			continue;
		}

		if (current === '?') {
			source += '[^/]';
			index += 1;
			continue;
		}

		source += escapeRegExp(current ?? '');
		index += 1;
	}

	return new RegExp(`${source}$`, 'u');
}

function matchesAnyGlob(relativePath: string, patterns: readonly RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(relativePath));
}

function normalizeSourceAnchorExtension(value: string): string | null {
	const normalized = value.trim().toLowerCase();

	if (normalized.length === 0) {
		return null;
	}

	return normalized.startsWith('.') ? normalized : `.${normalized}`;
}

function normalizeAllowedExtensions(allowedExtensions: SourceAnchorFileOptions['allowedExtensions']): ReadonlySet<string> {
	if (!allowedExtensions) {
		return SOURCE_ANCHOR_EXTENSIONS;
	}

	const normalized = [...allowedExtensions]
		.map((extension) => normalizeSourceAnchorExtension(extension))
		.filter((extension): extension is string => Boolean(extension));

	return normalized.length > 0 ? new Set(normalized) : SOURCE_ANCHOR_EXTENSIONS;
}

function mergeIgnoredDirectoryNames(ignoredDirectoryNames: ReadonlySet<string> | undefined): ReadonlySet<string> {
	return new Set([...(ignoredDirectoryNames ?? []), ...SOURCE_ANCHOR_DEFAULT_EXCLUDED_PATH_PARTS]);
}

export function listSourceAnchorFiles(root: string, options: SourceAnchorFileOptions = {}): string[] {
	if (!existsSync(root)) {
		return [];
	}

	const ignoredDirectoryNames = mergeIgnoredDirectoryNames(options.ignoredDirectoryNames);
	const allowedExtensions = normalizeAllowedExtensions(options.allowedExtensions);
	const include = (options.include ?? []).map((pattern) => globToRegExp(pattern));
	const exclude = (options.exclude ?? []).map((pattern) => globToRegExp(pattern));
	const rootRealPath = realpathSync(root);

	return listFilesRecursive(root, {
		ignoredDirectoryNames,
		allowedExtensions,
		include,
		exclude,
		excludeGeneratedOrVendor: options.excludeGeneratedOrVendor === true,
		maxFileBytes: options.maxFileBytes,
		followSymlinks: options.followSymlinks === true,
		rootRealPath,
		visitedRealDirectories: new Set<string>(),
	});
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

export function sourceAnchorTextContainsSecretLike(value: string): boolean {
	return textContainsSecretLike(value);
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
			if (!anchor.idValid || sourceAnchorTextContainsSecretLike(anchor.rawText)) {
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
