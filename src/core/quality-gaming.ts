import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';

import { createCommandEnv } from './command-env.js';
import { readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export type QualityGamingScope = 'changed' | 'tracked';

export type QualityGamingRiskCode =
	| 'line_stuffing_added'
	| 'multiple_statements_per_line_added'
	| 'suppression_added'
	| 'type_escape_added'
	| 'test_bypass_marker_added'
	| 'placeholder_added'
	| 'empty_catch_swallow_added'
	| 'generated_or_vendor_logic_added'
	| 'large_helper_container_added';

export type QualityGamingRiskSeverity = 'medium' | 'high' | 'critical';

export interface QualityGamingMetric {
	readonly name: string;
	readonly value: number;
	readonly threshold: number;
}

export interface QualityGamingRisk {
	readonly code: QualityGamingRiskCode;
	readonly severity: QualityGamingRiskSeverity;
	readonly path: string;
	readonly line: number | null;
	readonly detail: string;
	readonly metric: QualityGamingMetric | null;
}

export interface QualityGamingFileReport {
	readonly path: string;
	readonly checked_lines: number;
	readonly risk_count: number;
	readonly risks: readonly QualityGamingRisk[];
}

export interface QualityGamingReport {
	readonly schema_version: '1';
	readonly command: 'quality';
	readonly mode: 'check';
	readonly scope: QualityGamingScope;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly git_tracked: boolean;
	readonly checked_files: number;
	readonly risk_count: number;
	readonly risky_files: readonly QualityGamingFileReport[];
	readonly issues: readonly string[];
}

export interface QualityGamingOptions {
	readonly scope?: QualityGamingScope;
}

interface LineCandidate {
	readonly line: number;
	readonly text: string;
}

const LONG_LINE_THRESHOLD = 160;
const MULTI_STATEMENT_SEMICOLON_THRESHOLD = 1;
const LARGE_HELPER_LINE_THRESHOLD = 120;

const TEXT_FILE_PATTERN =
	/\.(?:cjs|cts|css|go|h|hpp|html|java|js|jsx|json|kt|md|mjs|mts|php|ps1|py|rb|rs|scss|sh|sql|svelte|swift|toml|ts|tsx|txt|vue|xml|yaml|yml)$/iu;
const CODE_FILE_PATTERN =
	/\.(?:cjs|cts|go|java|js|jsx|kt|mjs|mts|php|ps1|py|rb|rs|svelte|swift|ts|tsx|vue)$/iu;
const GENERATED_OR_VENDOR_PATTERN = /(?:^|\/)(?:generated|vendor|third_party)(?:\/|$)/iu;
const HELPER_CONTAINER_PATTERN = /(?:^|\/)[^/]*(?:helper|helpers|util|utils|manager|common|misc)[^/]*\.(?:cjs|cts|go|java|js|jsx|kt|mjs|mts|php|ps1|py|rb|rs|svelte|swift|ts|tsx|vue)$/iu;
const SUPPRESSION_PATTERN =
	/(?:eslint-disable|ts-ignore|ts-expect-error|biome-ignore|rome-ignore|noqa|type:\s*ignore|pragma:\s*no cover|istanbul\s+ignore|c8\s+ignore)/iu;
const TYPE_ESCAPE_PATTERN = /\b(?:as\s+any|as\s+unknown\s+as|as\s+never|:\s*any\b|!\.|!\)|!\]|!\s*[,;]|\bObject\s+as\s+unknown)\b/u;
const TEST_BYPASS_PATTERN = /(?:\.skip\b|\.only\b|@Disabled\b|@Ignore\b|\bxfail\b|pytest\.mark\.skip|it\.todo\b|test\.todo\b)/u;
const PLACEHOLDER_PATTERN =
	/(?:TODO|FIXME|HACK|not\s+implemented|unimplemented|throw\s+new\s+Error\(["'`](?:not implemented|todo|unsupported)|\bpass\s*$)/iu;
const THROW_PLACEHOLDER_MESSAGE_PATTERN = /(?:not\s+implemented|unimplemented|todo|unsupported)/iu;
const EMPTY_CATCH_PATTERN = /\bcatch\s*(?:\([^)]*\))?\s*\{\s*\}/u;

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function normalizeGitPath(value: string): string {
	return value.replace(/\\/gu, '/');
}

function gitList(projectRoot: string, args: readonly string[]): readonly string[] | null {
	const result = spawnSync('git', [...args, '-z'], {
		cwd: projectRoot,
		encoding: 'buffer',
		env: createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: 30_000,
		windowsHide: true,
	});

	if (result.status !== 0) {
		return null;
	}

	return result.stdout
		.toString('utf8')
		.split('\0')
		.map((entry) => normalizeGitPath(entry.trim()))
		.filter((entry) => entry.length > 0)
		.sort((left, right) => left.localeCompare(right));
}

function gitText(projectRoot: string, args: readonly string[]): string | null {
	const result = spawnSync('git', args, {
		cwd: projectRoot,
		encoding: 'utf8',
		env: createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: 30_000,
		windowsHide: true,
	});

	return result.status === 0 ? result.stdout : null;
}

function listGitTrackedFiles(projectRoot: string): readonly string[] | null {
	return gitList(projectRoot, ['ls-files']);
}

function listGitChangedFiles(projectRoot: string): readonly string[] | null {
	const changedLists = [
		gitList(projectRoot, ['diff', '--name-only', '--diff-filter=ACMR']),
		gitList(projectRoot, ['diff', '--cached', '--name-only', '--diff-filter=ACMR']),
		gitList(projectRoot, ['ls-files', '--others', '--exclude-standard']),
	];

	if (changedLists.some((list) => list === null)) {
		return null;
	}

	return [...new Set(changedLists.flatMap((list) => list ?? []))].sort((left, right) => left.localeCompare(right));
}

function isTextCandidate(relativePath: string): boolean {
	return TEXT_FILE_PATTERN.test(relativePath) && !relativePath.startsWith('.mustflow/state/');
}

function isCodeCandidate(relativePath: string): boolean {
	return CODE_FILE_PATTERN.test(relativePath);
}

function isMeaningfulCodeLine(text: string): boolean {
	const trimmed = text.trim();
	return trimmed.length > 0 && !trimmed.startsWith('//') && !trimmed.startsWith('#') && !trimmed.startsWith('*');
}

function stripQuotedText(text: string): string {
	let stripped = '';
	let quote: '"' | "'" | '`' | null = null;
	let escaped = false;

	for (const char of text) {
		if (quote) {
			stripped += ' ';

			if (escaped) {
				escaped = false;
				continue;
			}

			if (char === '\\') {
				escaped = true;
				continue;
			}

			if (char === quote) {
				quote = null;
			}

			continue;
		}

		if (char === '"' || char === "'" || char === '`') {
			quote = char;
			stripped += ' ';
			continue;
		}

		stripped += char;
	}

	return stripped;
}

function stripRegexLiterals(text: string): string {
	const patternDeclaration = /^(\s*(?:const\s+[A-Z0-9_]+\s*=\s*)?)\/.*\/[a-z]*;?\s*$/u;

	if (patternDeclaration.test(text)) {
		return text.replace(/\/.*\/[a-z]*;?/u, 'REGEX;');
	}

	return text.replace(/([=(:,\[]\s*)\/.*\/[a-z]*/giu, '$1 REGEX');
}

function codeSurfaceForLine(text: string): string {
	const literalStripped = stripQuotedText(stripRegexLiterals(text));
	return literalStripped.split('//', 1)[0] ?? literalStripped;
}

function isCommentOnlyLine(text: string): boolean {
	const trimmed = text.trim();
	return trimmed.startsWith('//') || trimmed.startsWith('#') || trimmed.startsWith('*');
}

function countSemicolonsOutsideComment(text: string): number {
	return [...codeSurfaceForLine(text)].filter((char) => char === ';').length;
}

function readTextLines(projectRoot: string, relativePath: string, issues: string[]): readonly LineCandidate[] {
	const absolutePath = path.join(projectRoot, ...relativePath.split('/'));

	if (!existsSync(absolutePath)) {
		return [];
	}

	try {
		const buffer = readFileInsideWithoutSymlinks(projectRoot, absolutePath);

		if (buffer.includes(0)) {
			return [];
		}

		return buffer
			.toString('utf8')
			.split(/\r?\n/u)
			.map((text, index) => ({ line: index + 1, text }));
	} catch (error) {
		issues.push(error instanceof Error ? error.message : String(error));
		return [];
	}
}

function isGitTracked(projectRoot: string, relativePath: string): boolean {
	const result = spawnSync('git', ['ls-files', '--error-unmatch', '--', relativePath], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
		stdio: ['ignore', 'pipe', 'pipe'],
		timeout: 30_000,
		windowsHide: true,
	});

	return result.status === 0;
}

function parseAddedLinesFromDiff(diffText: string): readonly LineCandidate[] {
	const addedLines: LineCandidate[] = [];
	let nextLine = 0;

	for (const rawLine of diffText.split(/\r?\n/u)) {
		const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/u.exec(rawLine);

		if (hunk) {
			nextLine = Number.parseInt(hunk[1], 10);
			continue;
		}

		if (nextLine === 0) {
			continue;
		}

		if (rawLine.startsWith('+++')) {
			continue;
		}

		if (rawLine.startsWith('+')) {
			addedLines.push({ line: nextLine, text: rawLine.slice(1) });
			nextLine += 1;
			continue;
		}

		if (rawLine.startsWith('-')) {
			continue;
		}

		nextLine += 1;
	}

	return addedLines;
}

function readChangedLineCandidates(projectRoot: string, relativePath: string, issues: string[]): readonly LineCandidate[] {
	if (!isGitTracked(projectRoot, relativePath)) {
		return readTextLines(projectRoot, relativePath, issues);
	}

	const diffText = gitText(projectRoot, ['diff', 'HEAD', '--no-ext-diff', '--unified=0', '--', relativePath]);

	if (diffText === null) {
		return readTextLines(projectRoot, relativePath, issues);
	}

	return parseAddedLinesFromDiff(diffText);
}

function addRisk(
	risks: QualityGamingRisk[],
	code: QualityGamingRiskCode,
	severity: QualityGamingRiskSeverity,
	relativePath: string,
	line: number | null,
	detail: string,
	metric: QualityGamingMetric | null,
): void {
	risks.push({
		code,
		severity,
		path: toPosixPath(relativePath),
		line,
		detail,
		metric,
	});
}

function inspectLine(relativePath: string, candidate: LineCandidate, risks: QualityGamingRisk[]): void {
	const text = candidate.text;
	const trimmed = text.trim();
	const isCode = isCodeCandidate(relativePath);
	const codeSurface = codeSurfaceForLine(text);
	const markerSurface = isCommentOnlyLine(text) ? trimmed : codeSurface;

	if (isCode && codeSurface.length > LONG_LINE_THRESHOLD) {
		addRisk(risks, 'line_stuffing_added', 'high', relativePath, candidate.line, 'Added line exceeds the anti-stuffing length threshold.', {
			name: 'line_length',
			value: codeSurface.length,
			threshold: LONG_LINE_THRESHOLD,
		});
	}

	if (
		isCode &&
		isMeaningfulCodeLine(text) &&
		countSemicolonsOutsideComment(text) > MULTI_STATEMENT_SEMICOLON_THRESHOLD
	) {
		addRisk(
			risks,
			'multiple_statements_per_line_added',
			'high',
			relativePath,
			candidate.line,
			'Added code line appears to contain multiple statements.',
			{
				name: 'semicolons',
				value: countSemicolonsOutsideComment(text),
				threshold: MULTI_STATEMENT_SEMICOLON_THRESHOLD,
			},
		);
	}

	if (isCode && SUPPRESSION_PATTERN.test(markerSurface)) {
		addRisk(risks, 'suppression_added', 'critical', relativePath, candidate.line, 'Added line contains a validation suppression marker.', null);
	}

	if (isCode && TYPE_ESCAPE_PATTERN.test(codeSurface)) {
		addRisk(risks, 'type_escape_added', 'high', relativePath, candidate.line, 'Added line contains a broad type escape or non-null assertion pattern.', null);
	}

	if (isCode && TEST_BYPASS_PATTERN.test(codeSurface)) {
		addRisk(risks, 'test_bypass_marker_added', 'critical', relativePath, candidate.line, 'Added line contains a test bypass marker.', null);
	}

	if (
		isCode &&
		(PLACEHOLDER_PATTERN.test(markerSurface) ||
			(/\bthrow\s+new\s+Error\s*\(/u.test(codeSurface) && THROW_PLACEHOLDER_MESSAGE_PATTERN.test(text)))
	) {
		addRisk(risks, 'placeholder_added', 'medium', relativePath, candidate.line, 'Added line looks like a placeholder or unfinished implementation.', null);
	}

	if (isCode && EMPTY_CATCH_PATTERN.test(codeSurface)) {
		addRisk(risks, 'empty_catch_swallow_added', 'high', relativePath, candidate.line, 'Added line contains an empty catch block that swallows failures.', null);
	}

	if (GENERATED_OR_VENDOR_PATTERN.test(relativePath) && isCode && isMeaningfulCodeLine(text)) {
		addRisk(
			risks,
			'generated_or_vendor_logic_added',
			'high',
			relativePath,
			candidate.line,
			'Added executable-looking logic under generated, vendor, or third_party paths.',
			null,
		);
	}
}

function inspectFile(projectRoot: string, relativePath: string, scope: QualityGamingScope, issues: string[]): QualityGamingFileReport | null {
	const candidates = scope === 'tracked'
		? readTextLines(projectRoot, relativePath, issues)
		: readChangedLineCandidates(projectRoot, relativePath, issues);
	const risks: QualityGamingRisk[] = [];

	for (const candidate of candidates) {
		inspectLine(relativePath, candidate, risks);
	}

	if (scope === 'tracked' && HELPER_CONTAINER_PATTERN.test(relativePath) && candidates.length > LARGE_HELPER_LINE_THRESHOLD) {
		addRisk(
			risks,
			'large_helper_container_added',
			'medium',
			relativePath,
			null,
			'Helper, util, manager, common, or misc container exceeds the size threshold.',
			{
				name: 'file_lines',
				value: candidates.length,
				threshold: LARGE_HELPER_LINE_THRESHOLD,
			},
		);
	}

	if (risks.length === 0) {
		return null;
	}

	return {
		path: toPosixPath(relativePath),
		checked_lines: candidates.length,
		risk_count: risks.length,
		risks,
	};
}

export function inspectQualityGaming(projectRoot: string, options: QualityGamingOptions = {}): QualityGamingReport {
	const root = path.resolve(projectRoot);
	const scope = options.scope ?? 'changed';
	const candidateFiles = scope === 'tracked' ? listGitTrackedFiles(root) : listGitChangedFiles(root);
	const issues: string[] = [];
	const riskyFiles: QualityGamingFileReport[] = [];

	if (!candidateFiles) {
		issues.push('Git files could not be listed. Run this command inside a Git working tree.');
	}

	for (const relativePath of candidateFiles ?? []) {
		if (!isTextCandidate(relativePath)) {
			continue;
		}

		const fileReport = inspectFile(root, relativePath, scope, issues);

		if (fileReport) {
			riskyFiles.push(fileReport);
		}
	}

	const riskCount = riskyFiles.reduce((sum, file) => sum + file.risk_count, 0);

	return {
		schema_version: '1',
		command: 'quality',
		mode: 'check',
		scope,
		ok: issues.length === 0 && riskCount === 0,
		mustflow_root: root,
		git_tracked: candidateFiles !== null,
		checked_files: candidateFiles?.filter(isTextCandidate).length ?? 0,
		risk_count: riskCount,
		risky_files: riskyFiles,
		issues,
	};
}
