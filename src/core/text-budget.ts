import { createHash } from 'node:crypto';
import path from 'node:path';

import {
	type ScriptCheckArtifact,
	type ScriptCheckFinding,
	type ScriptCheckFindingSeverity,
	type ScriptCheckMetric,
	type ScriptCheckStatus,
} from './script-check-result.js';
import { ensureInside, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export type TextBudgetUnit = 'grapheme' | 'code-point' | 'utf16' | 'utf8-byte' | 'word' | 'line';
export const TEXT_BUDGET_PACK_ID = 'core';
export const TEXT_BUDGET_SCRIPT_ID = 'text-budget';
export const TEXT_BUDGET_SCRIPT_REF = `${TEXT_BUDGET_PACK_ID}/${TEXT_BUDGET_SCRIPT_ID}`;

export type TextBudgetFindingCode =
	| 'text_budget_above_max'
	| 'text_budget_below_min'
	| 'text_budget_not_exact'
	| 'text_budget_unreadable'
	| 'text_budget_json_parse_failed'
	| 'text_budget_json_pointer_invalid'
	| 'text_budget_json_pointer_missing'
	| 'text_budget_json_pointer_not_string';

export interface TextBudgetPolicy {
	readonly min: number | null;
	readonly max: number | null;
	readonly exact: number | null;
	readonly unit: TextBudgetUnit;
	readonly json_pointer: string | null;
	readonly max_file_bytes: number;
}

export interface TextBudgetMetric extends ScriptCheckMetric {
	readonly name: 'text_length';
	readonly path: string;
	readonly json_pointer: string | null;
	readonly content_sha256: string;
}

export interface TextBudgetFinding extends ScriptCheckFinding {
	readonly code: TextBudgetFindingCode;
	readonly path: string;
	readonly json_pointer: string | null;
	readonly metric: 'text_length' | null;
	readonly actual: number | null;
	readonly expected: number | null;
}

export interface TextBudgetArtifact extends ScriptCheckArtifact {
	readonly kind: 'input';
	readonly sha256: string;
	readonly size_bytes: number;
}

export interface TextBudgetReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof TEXT_BUDGET_PACK_ID;
	readonly script_id: typeof TEXT_BUDGET_SCRIPT_ID;
	readonly script_ref: typeof TEXT_BUDGET_SCRIPT_REF;
	readonly action: 'check';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: TextBudgetPolicy;
	readonly input_hash: string;
	readonly metrics: readonly TextBudgetMetric[];
	readonly findings: readonly TextBudgetFinding[];
	readonly artifacts: readonly TextBudgetArtifact[];
	readonly issues: readonly string[];
}

export interface InspectTextBudgetOptions {
	readonly paths: readonly string[];
	readonly min?: number | null;
	readonly max?: number | null;
	readonly exact?: number | null;
	readonly unit?: TextBudgetUnit;
	readonly jsonPointer?: string | null;
	readonly maxFileBytes?: number;
}

type SegmentLike = {
	readonly segment: string;
	readonly isWordLike?: boolean;
};

type SegmenterLike = {
	segment(input: string): Iterable<SegmentLike>;
};

type SegmenterConstructor = new (
	locales?: string | readonly string[],
	options?: { readonly granularity?: 'grapheme' | 'word' | 'sentence' },
) => SegmenterLike;

type IntlWithSegmenter = typeof Intl & {
	readonly Segmenter?: SegmenterConstructor;
};

interface JsonPointerResolution {
	readonly ok: boolean;
	readonly value?: unknown;
	readonly error?: 'invalid' | 'missing';
}

const DEFAULT_TEXT_BUDGET_UNIT: TextBudgetUnit = 'grapheme';
const DEFAULT_MAX_FILE_BYTES = 1024 * 1024;
const ERROR_FINDING_CODES = new Set<TextBudgetFindingCode>([
	'text_budget_unreadable',
	'text_budget_json_parse_failed',
	'text_budget_json_pointer_invalid',
	'text_budget_json_pointer_missing',
	'text_budget_json_pointer_not_string',
]);

export const TEXT_BUDGET_UNITS: readonly TextBudgetUnit[] = [
	'grapheme',
	'code-point',
	'utf16',
	'utf8-byte',
	'word',
	'line',
];

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function sha256Hex(buffer: Buffer | string): string {
	return createHash('sha256').update(buffer).digest('hex');
}

function sha256Tagged(buffer: Buffer | string): string {
	return `sha256:${sha256Hex(buffer)}`;
}

function createSegmenter(granularity: 'grapheme' | 'word'): SegmenterLike | null {
	const Segmenter = (Intl as IntlWithSegmenter).Segmenter;
	return Segmenter ? new Segmenter(undefined, { granularity }) : null;
}

function countGraphemes(text: string): number {
	const segmenter = createSegmenter('grapheme');
	return segmenter ? [...segmenter.segment(text)].length : [...text].length;
}

function countWords(text: string): number {
	const segmenter = createSegmenter('word');
	if (segmenter) {
		return [...segmenter.segment(text)].filter((segment) => segment.isWordLike === true).length;
	}

	return text.trim().length === 0 ? 0 : (text.trim().match(/\S+/gu) ?? []).length;
}

function countLines(text: string): number {
	return text.length === 0 ? 0 : text.split(/\r\n|\r|\n/u).length;
}

export function countTextBudgetUnits(text: string, unit: TextBudgetUnit): number {
	switch (unit) {
		case 'grapheme':
			return countGraphemes(text);
		case 'code-point':
			return [...text].length;
		case 'utf16':
			return text.length;
		case 'utf8-byte':
			return Buffer.byteLength(text, 'utf8');
		case 'word':
			return countWords(text);
		case 'line':
			return countLines(text);
	}
}

function decodeJsonPointerSegment(segment: string): string {
	return segment.replace(/~1/gu, '/').replace(/~0/gu, '~');
}

function resolveJsonPointer(value: unknown, pointer: string): JsonPointerResolution {
	if (pointer === '') {
		return { ok: true, value };
	}

	if (!pointer.startsWith('/')) {
		return { ok: false, error: 'invalid' };
	}

	let current = value;
	for (const rawSegment of pointer.slice(1).split('/')) {
		if (/~(?![01])/u.test(rawSegment)) {
			return { ok: false, error: 'invalid' };
		}

		const segment = decodeJsonPointerSegment(rawSegment);
		if (Array.isArray(current)) {
			if (!/^(?:0|[1-9]\d*)$/u.test(segment)) {
				return { ok: false, error: 'missing' };
			}

			const index = Number(segment);
			if (index >= current.length) {
				return { ok: false, error: 'missing' };
			}

			current = current[index];
			continue;
		}

		if (!current || typeof current !== 'object' || !Object.hasOwn(current, segment)) {
			return { ok: false, error: 'missing' };
		}

		current = (current as Record<string, unknown>)[segment];
	}

	return { ok: true, value: current };
}

function makeFinding(
	code: TextBudgetFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	jsonPointer: string | null,
	message: string,
	actual: number | null = null,
	expected: number | null = null,
	metric: 'text_length' | null = 'text_length',
): TextBudgetFinding {
	return {
		code,
		severity,
		message,
		path: pathValue,
		json_pointer: jsonPointer,
		metric,
		actual,
		expected,
	};
}

function compareAgainstPolicy(
	relativePath: string,
	pointer: string | null,
	value: number,
	policy: TextBudgetPolicy,
): readonly TextBudgetFinding[] {
	const findings: TextBudgetFinding[] = [];

	if (policy.exact !== null && value !== policy.exact) {
		findings.push(
			makeFinding(
				'text_budget_not_exact',
				'medium',
				relativePath,
				pointer,
				`${relativePath} has ${value} ${policy.unit}; expected exactly ${policy.exact}.`,
				value,
				policy.exact,
			),
		);
	}

	if (policy.min !== null && value < policy.min) {
		findings.push(
			makeFinding(
				'text_budget_below_min',
				'medium',
				relativePath,
				pointer,
				`${relativePath} has ${value} ${policy.unit}; expected at least ${policy.min}.`,
				value,
				policy.min,
			),
		);
	}

	if (policy.max !== null && value > policy.max) {
		findings.push(
			makeFinding(
				'text_budget_above_max',
				'medium',
				relativePath,
				pointer,
				`${relativePath} has ${value} ${policy.unit}; expected at most ${policy.max}.`,
				value,
				policy.max,
			),
		);
	}

	return findings;
}

function createInputHash(policy: TextBudgetPolicy, artifacts: readonly TextBudgetArtifact[], findings: readonly TextBudgetFinding[]): string {
	const inputState = {
		policy,
		artifacts: artifacts.map((artifact) => ({
			path: artifact.path,
			sha256: artifact.sha256,
			size_bytes: artifact.size_bytes,
		})),
		input_errors: findings
			.filter((finding) => ERROR_FINDING_CODES.has(finding.code))
			.map((finding) => ({
				code: finding.code,
				path: finding.path,
				json_pointer: finding.json_pointer,
			})),
	};

	return sha256Tagged(JSON.stringify(inputState));
}

function normalizeTargetPath(projectRoot: string, targetPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), targetPath);
	ensureInside(projectRoot, absolutePath);
	const relativePath = toPosixPath(path.relative(projectRoot, absolutePath));

	return {
		absolutePath,
		relativePath: relativePath.length === 0 ? '.' : relativePath,
	};
}

export function inspectTextBudget(projectRoot: string, options: InspectTextBudgetOptions): TextBudgetReport {
	const root = path.resolve(projectRoot);
	const policy: TextBudgetPolicy = {
		min: options.min ?? null,
		max: options.max ?? null,
		exact: options.exact ?? null,
		unit: options.unit ?? DEFAULT_TEXT_BUDGET_UNIT,
		json_pointer: options.jsonPointer ?? null,
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
	};
	const metrics: TextBudgetMetric[] = [];
	const findings: TextBudgetFinding[] = [];
	const artifacts: TextBudgetArtifact[] = [];
	const issues: string[] = [];

	for (const targetPath of options.paths) {
		let relativePath = targetPath;
		let absolutePath: string;

		try {
			const normalized = normalizeTargetPath(root, targetPath);
			absolutePath = normalized.absolutePath;
			relativePath = normalized.relativePath;
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(message);
			findings.push(
				makeFinding('text_budget_unreadable', 'high', targetPath, policy.json_pointer, message, null, null, null),
			);
			continue;
		}

		let buffer: Buffer;
		try {
			buffer = readFileInsideWithoutSymlinks(root, absolutePath, { maxBytes: policy.max_file_bytes });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			issues.push(message);
			findings.push(
				makeFinding('text_budget_unreadable', 'high', relativePath, policy.json_pointer, message, null, null, null),
			);
			continue;
		}

		const contentSha256 = sha256Tagged(buffer);
		artifacts.push({
			kind: 'input',
			path: relativePath,
			sha256: contentSha256,
			size_bytes: buffer.byteLength,
		});

		const rawText = buffer.toString('utf8');
		let selectedText = rawText;

		if (policy.json_pointer !== null) {
			let parsed: unknown;
			try {
				parsed = JSON.parse(rawText);
			} catch (error) {
				const message = error instanceof Error ? error.message : String(error);
				issues.push(`${relativePath}: ${message}`);
				findings.push(
					makeFinding(
						'text_budget_json_parse_failed',
						'high',
						relativePath,
						policy.json_pointer,
						`${relativePath} could not be parsed as JSON: ${message}`,
						null,
						null,
						null,
					),
				);
				continue;
			}

			const resolution = resolveJsonPointer(parsed, policy.json_pointer);
			if (!resolution.ok) {
				const code =
					resolution.error === 'invalid' ? 'text_budget_json_pointer_invalid' : 'text_budget_json_pointer_missing';
				const message =
					resolution.error === 'invalid'
						? `Invalid JSON pointer: ${policy.json_pointer}`
						: `JSON pointer not found: ${policy.json_pointer}`;
				issues.push(`${relativePath}: ${message}`);
				findings.push(makeFinding(code, 'high', relativePath, policy.json_pointer, message, null, null, null));
				continue;
			}

			if (typeof resolution.value !== 'string') {
				const message = `JSON pointer ${policy.json_pointer} does not resolve to a string.`;
				issues.push(`${relativePath}: ${message}`);
				findings.push(
					makeFinding(
						'text_budget_json_pointer_not_string',
						'high',
						relativePath,
						policy.json_pointer,
						message,
						null,
						null,
						null,
					),
				);
				continue;
			}

			selectedText = resolution.value;
		}

		const value = countTextBudgetUnits(selectedText, policy.unit);
		metrics.push({
			name: 'text_length',
			value,
			unit: policy.unit,
			path: relativePath,
			json_pointer: policy.json_pointer,
			content_sha256: contentSha256,
		});
		findings.push(...compareAgainstPolicy(relativePath, policy.json_pointer, value, policy));
	}

	const status: ScriptCheckStatus = findings.some((finding) => ERROR_FINDING_CODES.has(finding.code))
		? 'error'
		: findings.length > 0
			? 'failed'
			: 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: TEXT_BUDGET_PACK_ID,
		script_id: TEXT_BUDGET_SCRIPT_ID,
		script_ref: TEXT_BUDGET_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, artifacts, findings),
		metrics,
		findings,
		artifacts,
		issues,
	};
}
