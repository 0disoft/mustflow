import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { ensureFileTargetInsideWithoutSymlinks, readUtf8FileInsideWithoutSymlinks } from './filesystem.js';
import type { TemplateFileSource } from './templates.js';

const DIFF_PREVIEW_MAX_LINES = 120;
const DIFF_PREVIEW_MAX_LINE_BYTES = 240;
const DIFF_PREVIEW_CONTEXT_LINES = 3;
const DIFF_PREVIEW_TRUNCATION_MARKER = '[... diff preview truncated ...]';
const DIFF_PREVIEW_LINE_TRUNCATION_MARKER = ' [... line truncated]';

export interface UpdateDiffPreview {
	readonly format: 'unified';
	readonly available: boolean;
	readonly from: 'current_target' | 'missing_target' | 'unavailable';
	readonly to: 'bundled_template';
	readonly bounded: true;
	readonly truncated: boolean;
	readonly max_lines: number;
	readonly max_line_bytes: number;
	readonly lines: readonly string[];
	readonly reason?: string;
}

export interface UpdateDiffPreviewInput {
	readonly relativePath: string;
	readonly source: TemplateFileSource;
}

export function shouldPreviewUpdateDiff(action: string): boolean {
	return action === 'create' || action === 'update' || action === 'blocked-local-change' || action === 'manual-review';
}

function templateFileContent(source: TemplateFileSource): string {
	return source.content === undefined ? readFileSync(source.sourcePath, 'utf8') : source.content;
}

function shouldOmitDiffPreview(relativePath: string): boolean {
	const normalizedPath = relativePath.replaceAll('\\', '/');
	const lowerPath = normalizedPath.toLowerCase();

	return (
		normalizedPath.startsWith('.mustflow/state/') ||
		normalizedPath.startsWith('.mustflow/cache/') ||
		normalizedPath.startsWith('.mustflow/backups/') ||
		lowerPath === '.env' ||
		lowerPath.startsWith('.env.') ||
		lowerPath.endsWith('.pem') ||
		lowerPath.endsWith('.key')
	);
}

function unavailableDiffPreview(reason: string): UpdateDiffPreview {
	return {
		format: 'unified',
		available: false,
		from: 'unavailable',
		to: 'bundled_template',
		bounded: true,
		truncated: false,
		max_lines: DIFF_PREVIEW_MAX_LINES,
		max_line_bytes: DIFF_PREVIEW_MAX_LINE_BYTES,
		lines: [],
		reason,
	};
}

function splitDiffLines(content: string): string[] {
	const normalized = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

	if (normalized.length === 0) {
		return [];
	}

	return normalized.endsWith('\n') ? normalized.slice(0, -1).split('\n') : normalized.split('\n');
}

function unifiedRange(startIndex: number, count: number): string {
	if (count === 0) {
		return `${startIndex},0`;
	}

	return `${startIndex + 1},${count}`;
}

function truncateDiffLine(line: string): { readonly line: string; readonly truncated: boolean } {
	if (Buffer.byteLength(line, 'utf8') <= DIFF_PREVIEW_MAX_LINE_BYTES) {
		return { line, truncated: false };
	}

	let result = '';

	for (const character of line) {
		const candidate = `${result}${character}${DIFF_PREVIEW_LINE_TRUNCATION_MARKER}`;

		if (Buffer.byteLength(candidate, 'utf8') > DIFF_PREVIEW_MAX_LINE_BYTES) {
			break;
		}

		result += character;
	}

	return {
		line: `${result}${DIFF_PREVIEW_LINE_TRUNCATION_MARKER}`,
		truncated: true,
	};
}

function boundDiffLines(lines: readonly string[]): { readonly lines: readonly string[]; readonly truncated: boolean } {
	const bounded: string[] = [];
	let truncated = false;

	for (const line of lines) {
		if (bounded.length >= DIFF_PREVIEW_MAX_LINES) {
			truncated = true;
			break;
		}

		const boundedLine = truncateDiffLine(line);
		truncated = truncated || boundedLine.truncated;
		bounded.push(boundedLine.line);
	}

	if (truncated) {
		if (bounded.length >= DIFF_PREVIEW_MAX_LINES) {
			bounded[bounded.length - 1] = DIFF_PREVIEW_TRUNCATION_MARKER;
		} else {
			bounded.push(DIFF_PREVIEW_TRUNCATION_MARKER);
		}
	}

	return { lines: bounded, truncated };
}

function createUnifiedDiffLines(relativePath: string, currentContent: string, templateContent: string, targetExists: boolean): readonly string[] {
	const currentLines = splitDiffLines(currentContent);
	const templateLines = splitDiffLines(templateContent);
	let prefixLength = 0;

	while (
		prefixLength < currentLines.length &&
		prefixLength < templateLines.length &&
		currentLines[prefixLength] === templateLines[prefixLength]
	) {
		prefixLength += 1;
	}

	let suffixLength = 0;

	while (
		suffixLength < currentLines.length - prefixLength &&
		suffixLength < templateLines.length - prefixLength &&
		currentLines[currentLines.length - 1 - suffixLength] === templateLines[templateLines.length - 1 - suffixLength]
	) {
		suffixLength += 1;
	}

	const currentChangeEnd = currentLines.length - suffixLength;
	const templateChangeEnd = templateLines.length - suffixLength;
	const currentStart = Math.max(0, prefixLength - DIFF_PREVIEW_CONTEXT_LINES);
	const templateStart = Math.max(0, prefixLength - DIFF_PREVIEW_CONTEXT_LINES);
	const currentEnd = Math.min(currentLines.length, currentChangeEnd + DIFF_PREVIEW_CONTEXT_LINES);
	const templateEnd = Math.min(templateLines.length, templateChangeEnd + DIFF_PREVIEW_CONTEXT_LINES);
	const lines: string[] = [
		targetExists ? `--- ${relativePath} (current)` : '--- /dev/null',
		`+++ ${relativePath} (template)`,
		`@@ -${unifiedRange(currentStart, currentEnd - currentStart)} +${unifiedRange(templateStart, templateEnd - templateStart)} @@`,
	];

	for (let index = currentStart; index < prefixLength; index += 1) {
		lines.push(` ${currentLines[index]}`);
	}

	for (let index = prefixLength; index < currentChangeEnd; index += 1) {
		lines.push(`-${currentLines[index]}`);
	}

	for (let index = prefixLength; index < templateChangeEnd; index += 1) {
		lines.push(`+${templateLines[index]}`);
	}

	for (let index = currentChangeEnd; index < currentEnd; index += 1) {
		lines.push(` ${currentLines[index]}`);
	}

	return lines;
}

export function createUpdateDiffPreview(projectRoot: string, input: UpdateDiffPreviewInput): UpdateDiffPreview {
	if (shouldOmitDiffPreview(input.relativePath)) {
		return unavailableDiffPreview('diff preview omitted for generated state, cache, backup, or sensitive-looking path');
	}

	const targetPath = path.join(projectRoot, input.relativePath);
	const targetExists = existsSync(targetPath);

	try {
		if (targetExists) {
			ensureFileTargetInsideWithoutSymlinks(projectRoot, targetPath);
		} else {
			ensureFileTargetInsideWithoutSymlinks(projectRoot, targetPath, { allowMissingLeaf: true });
		}

		const currentContent = targetExists ? readUtf8FileInsideWithoutSymlinks(projectRoot, targetPath) : '';
		const templateContent = templateFileContent(input.source);
		const boundedLines = boundDiffLines(
			createUnifiedDiffLines(input.relativePath, currentContent, templateContent, targetExists),
		);

		return {
			format: 'unified',
			available: true,
			from: targetExists ? 'current_target' : 'missing_target',
			to: 'bundled_template',
			bounded: true,
			truncated: boundedLines.truncated,
			max_lines: DIFF_PREVIEW_MAX_LINES,
			max_line_bytes: DIFF_PREVIEW_MAX_LINE_BYTES,
			lines: boundedLines.lines,
		};
	} catch (error) {
		return unavailableDiffPreview(error instanceof Error ? error.message : String(error));
	}
}
