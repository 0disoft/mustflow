import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

export type SourceAnchorDecisionKind = 'found' | 'missing';

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

export interface SourceAnchorDecision {
	readonly kind: SourceAnchorDecisionKind;
	readonly inputAnchor: string;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: false;
	readonly sourceFiles: readonly string[];
	readonly anchor: SourceAnchorSummary | null;
}

const SOURCE_FILES = [
	'ROADMAP.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/config/mustflow.toml',
	'.mustflow/config/commands.toml',
];
const SOURCE_EXTENSIONS = new Set(['.cjs', '.go', '.js', '.jsx', '.mjs', '.py', '.rs', '.ts', '.tsx']);
const EXCLUDED_PATH_PARTS = new Set([
	'.git',
	'.mustflow',
	'build',
	'coverage',
	'dist',
	'node_modules',
	'third_party',
	'vendor',
]);

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function listFilesRecursive(root: string, current = root): string[] {
	if (!existsSync(current)) {
		return [];
	}

	const files: string[] = [];

	for (const entry of readdirSync(current)) {
		const entryPath = path.join(current, entry);
		const stat = statSync(entryPath);

		if (stat.isDirectory()) {
			if (EXCLUDED_PATH_PARTS.has(entry)) {
				continue;
			}

			files.push(...listFilesRecursive(root, entryPath));
			continue;
		}

		if (stat.isFile()) {
			files.push(path.relative(root, entryPath));
		}
	}

	return files.sort((left, right) => left.localeCompare(right));
}

interface ParsedAnchor {
	readonly id: string;
	readonly lineStart: number;
	readonly fields: ReadonlyMap<string, string>;
}

function shouldInspectSource(relativePath: string): boolean {
	const parts = relativePath.split('/');

	if (parts.some((part) => EXCLUDED_PATH_PARTS.has(part))) {
		return false;
	}

	return SOURCE_EXTENSIONS.has(path.posix.extname(relativePath));
}

function stripCommentPrefix(line: string): string {
	return line
		.trim()
		.replace(/^\/\*\*?/u, '')
		.replace(/\*\/$/u, '')
		.replace(/^\/\//u, '')
		.replace(/^#/u, '')
		.replace(/^\*/u, '')
		.trim();
}

function readField(line: string): { readonly key: string; readonly value: string } | null {
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

function parseAnchorLines(content: string): ParsedAnchor[] {
	const lines = content.split(/\r?\n/);
	const anchors: ParsedAnchor[] = [];

	for (let index = 0; index < lines.length; index += 1) {
		const normalized = stripCommentPrefix(lines[index] ?? '');
		const anchorMatch = normalized.match(/^mf:anchor\s+([a-z0-9][a-z0-9.-]{0,95})$/u);

		if (!anchorMatch) {
			continue;
		}

		const fields = new Map<string, string>();

		for (let fieldIndex = index + 1; fieldIndex < lines.length; fieldIndex += 1) {
			const fieldLine = stripCommentPrefix(lines[fieldIndex] ?? '');

			if (fieldLine.length === 0) {
				continue;
			}

			if (fieldLine.startsWith('@') || /^[A-Za-z_$][\w$]*\s/u.test(fieldLine)) {
				break;
			}

			const field = readField(fieldLine);

			if (!field) {
				break;
			}

			fields.set(field.key, field.value);
		}

		anchors.push({
			id: anchorMatch[1],
			lineStart: index + 1,
			fields,
		});
	}

	return anchors;
}

function splitList(value: string | null | undefined): readonly string[] {
	if (!value) {
		return [];
	}

	return value
		.split(/[,;]/u)
		.map((item) => item.trim())
		.filter((item) => item.length > 0);
}

export function collectSourceAnchorSummaries(projectRoot: string): SourceAnchorSummary[] {
	const anchors: SourceAnchorSummary[] = [];

	for (const relativeFile of listFilesRecursive(projectRoot)) {
		const relativePath = toPosixPath(relativeFile);

		if (!shouldInspectSource(relativePath)) {
			continue;
		}

		const filePath = path.join(projectRoot, ...relativePath.split('/'));

		if (!existsSync(filePath) || !statSync(filePath).isFile()) {
			continue;
		}

		const content = readFileSync(filePath, 'utf8');

		for (const anchor of parseAnchorLines(content)) {
			anchors.push({
				id: anchor.id,
				path: relativePath,
				lineStart: anchor.lineStart,
				purpose: anchor.fields.get('purpose') ?? null,
				search: splitList(anchor.fields.get('search')),
				invariant: anchor.fields.get('invariant') ?? null,
				risk: splitList(anchor.fields.get('risk')),
				navigationOnly: true,
				canInstructAgent: false,
			});
		}
	}

	return anchors.sort((left, right) => left.id.localeCompare(right.id) || left.path.localeCompare(right.path));
}

export function explainSourceAnchor(projectRoot: string, anchorId: string): SourceAnchorDecision {
	const anchors = collectSourceAnchorSummaries(projectRoot);
	const anchor = anchors.find((candidate) => candidate.id === anchorId) ?? null;

	if (!anchor) {
		return {
			kind: 'missing',
			inputAnchor: anchorId,
			decision: `source anchor "${anchorId}" is not indexed by direct source inspection`,
			reason:
				'mustflow found no structured inline anchor with that id in inspectable source files. Source anchors are optional and disabled for automatic source modification.',
			effectiveAction:
				'Use normal code search or add a short structured source anchor only when a human-approved code change calls for one.',
			countsAsMustflowVerification: false,
			sourceFiles: SOURCE_FILES,
			anchor: null,
		};
	}

	return {
		kind: 'found',
		inputAnchor: anchorId,
		decision: `source anchor "${anchorId}" is a navigation-only code coordinate`,
		reason:
			'structured source anchors help agents find important code locations, but they cannot define workflow rules, command permission, or verification authority.',
		effectiveAction:
			'Use this anchor to navigate to the source location, then trust the current code, tests, AGENTS.md, and commands.toml over the anchor text.',
		countsAsMustflowVerification: false,
		sourceFiles: SOURCE_FILES,
		anchor,
	};
}
