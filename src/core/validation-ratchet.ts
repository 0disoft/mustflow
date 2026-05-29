import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { ChangeClassification, ChangeClassificationReport } from './change-classification.js';
import { createCommandEnv } from './command-env.js';

const GIT_DIFF_TIMEOUT_MS = 10_000;
const GIT_DIFF_MAX_BUFFER_BYTES = 16 * 1024 * 1024;

export type ValidationRatchetRiskCode =
	| 'related_test_deleted'
	| 'skip_or_only_marker_present'
	| 'todo_or_pending_marker_added'
	| 'assertion_count_decreased'
	| 'assertion_matcher_weakened'
	| 'negative_assertion_removed'
	| 'exception_assertion_removed'
	| 'snapshot_mass_updated'
	| 'golden_output_replaced'
	| 'verification_intent_disabled'
	| 'verification_required_after_removed'
	| 'success_exit_codes_widened'
	| 'command_allows_no_tests'
	| 'command_forces_snapshot_update'
	| 'command_hides_failure'
	| 'coverage_threshold_lowered'
	| 'test_selection_narrowed';

export type ValidationRatchetRiskSeverity = 'medium' | 'high' | 'critical';

export interface ValidationRatchetRisk {
	readonly code: ValidationRatchetRiskCode;
	readonly severity: ValidationRatchetRiskSeverity;
	readonly detail: string;
	readonly path: string;
}

export interface ValidationRatchetVerdictEffects {
	readonly contradicted: number;
}

const TEST_CHANGE_KINDS = new Set(['test', 'test_fixture']);
const SKIP_OR_ONLY_MARKER = /\b(?:describe|it|test)\s*\.\s*(?:skip|only)\s*\(/u;
const TODO_OR_PENDING_MARKER = /\b(?:describe|it|test)\s*\.\s*(?:todo|pending)\s*\(/u;
const ASSERTION_CALL = /\b(?:assert(?:\.\w+)?|expect)\s*\(/u;
const STRONG_ASSERTION = /\b(?:assert\.(?:equal|deepEqual|strictEqual|throws|rejects)|to(?:Equal|StrictEqual|Be|Throw)|throws|rejects)\b/u;
const WEAK_ASSERTION = /\b(?:assert\.ok|toBeDefined|toBeTruthy|toBeFalsy)\b/u;
const NEGATIVE_ASSERTION = /\b(?:notEqual|notDeepEqual|doesNotMatch|doesNotThrow|\.not\.)\b/u;
const EXCEPTION_ASSERTION = /\b(?:assert\.(?:throws|rejects|doesNotThrow|doesNotReject)|toThrow|rejects|throws)\b/u;
const SNAPSHOT_PATH = /(?:^|\/)(?:__snapshots__\/|snapshots\/)|\.snap$/u;
const GOLDEN_PATH = /(?:^|\/)(?:golden|fixtures|expected)(?:\/|-)|(?:\.golden\.|\.expected\.)/u;
const JAVASCRIPT_TEST_PATH = /(?:^|\/)[^/]+\.(?:test|spec)\.[cm]?[jt]sx?$/u;
const COMMAND_CONTRACT_PATH = '.mustflow/config/commands.toml';
const TEST_SELECTION_PATTERN = /(?:--(?:grep|testNamePattern|testPathPattern|runTestsByPath|test-name-pattern)|\bgrep\s*=|\btestNamePattern\b|\btestPathPattern\b)/u;
const COMMAND_ALLOWS_NO_TESTS_PATTERN = /(?:passWithNoTests|--pass-with-no-tests|--passWithNoTests)/u;
const COMMAND_FORCES_SNAPSHOT_UPDATE_PATTERN = /(?:updateSnapshot|--update-snapshot|--updateSnapshot|\s-u(?:\s|"))/u;
const COMMAND_HIDES_FAILURE_PATTERN = /(?:\|\|\s*true|;\s*true\b|&&\s*true\b|\bexit\s+0\b)/u;
const CRITICAL_RATCHET_CODES = new Set<ValidationRatchetRiskCode>([
	'success_exit_codes_widened',
	'command_allows_no_tests',
	'command_hides_failure',
]);

interface DiffLines {
	readonly added: readonly string[];
	readonly removed: readonly string[];
}

function isTestClassification(classification: ChangeClassification): boolean {
	return classification.surface.category === 'test' || classification.changeKinds.some((kind) => TEST_CHANGE_KINDS.has(kind));
}

function isJavaScriptTestPath(relativePath: string): boolean {
	return JAVASCRIPT_TEST_PATH.test(relativePath);
}

function resolveInsideRoot(projectRoot: string, relativePath: string): string | null {
	const resolvedPath = path.resolve(projectRoot, relativePath);
	const relative = path.relative(projectRoot, resolvedPath);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return null;
	}

	return resolvedPath;
}

function fileTextIfReadable(projectRoot: string, relativePath: string): string | null {
	const resolvedPath = resolveInsideRoot(projectRoot, relativePath);

	if (resolvedPath === null || !existsSync(resolvedPath)) {
		return null;
	}

	try {
		return readFileSync(resolvedPath, 'utf8');
	} catch {
		return null;
	}
}

function normalizeGitDiffPath(value: string): string {
	return value
		.replace(/^"(.*)"$/u, '$1')
		.replace(/^(?:a|b)\//u, '')
		.replaceAll('\\', '/');
}

function parseGitDiffLines(stdout: string): ReadonlyMap<string, DiffLines> {
	const byPath = new Map<string, { added: string[]; removed: string[] }>();
	let oldPath: string | null = null;
	let currentPath: string | null = null;

	for (const line of stdout.split(/\r?\n/u)) {
		if (line.startsWith('--- ')) {
			const rawPath = line.slice(4).trim();
			oldPath = rawPath === '/dev/null' ? null : normalizeGitDiffPath(rawPath);
			continue;
		}

		if (line.startsWith('+++ ')) {
			const rawPath = line.slice(4).trim();
			currentPath = rawPath === '/dev/null' ? oldPath : normalizeGitDiffPath(rawPath);
			if (currentPath && !byPath.has(currentPath)) {
				byPath.set(currentPath, { added: [], removed: [] });
			}
			continue;
		}

		if (!currentPath || line.startsWith('@@')) {
			continue;
		}

		const diff = byPath.get(currentPath);
		if (!diff) {
			continue;
		}

		if (line.startsWith('+')) {
			diff.added.push(line.slice(1));
		} else if (line.startsWith('-')) {
			diff.removed.push(line.slice(1));
		}
	}

	return new Map(
		[...byPath.entries()].map(([filePath, diff]) => [
			filePath,
			{ added: diff.added, removed: diff.removed },
		]),
	);
}

function gitDiffLinesByPath(projectRoot: string, relativePaths: readonly string[]): ReadonlyMap<string, DiffLines> {
	const uniquePaths = [...new Set(relativePaths)].filter((relativePath) => resolveInsideRoot(projectRoot, relativePath) !== null);
	if (uniquePaths.length === 0) {
		return new Map();
	}

	const result = spawnSync('git', ['diff', '--no-ext-diff', '--unified=0', '--', ...uniquePaths], {
		cwd: projectRoot,
		encoding: 'utf8',
		env: createCommandEnv(projectRoot, { policy: 'minimal', allowlist: [] }),
		maxBuffer: GIT_DIFF_MAX_BUFFER_BYTES,
		timeout: GIT_DIFF_TIMEOUT_MS,
		windowsHide: true,
	});

	if (result.status !== 0 || typeof result.stdout !== 'string' || result.stdout.length === 0) {
		return new Map();
	}

	return parseGitDiffLines(result.stdout);
}

function countMatching(lines: readonly string[], pattern: RegExp): number {
	return lines.filter((line) => pattern.test(line)).length;
}

function hasAny(lines: readonly string[], pattern: RegExp): boolean {
	return lines.some((line) => pattern.test(line));
}

function extractCoverageNumbers(lines: readonly string[]): number[] {
	return lines
		.filter((line) => /\b(?:coverage|threshold|branches|functions|lines|statements)\b/iu.test(line))
		.flatMap((line) => [...line.matchAll(/\b\d+(?:\.\d+)?\b/gu)].map((match) => Number(match[0])))
		.filter((value) => Number.isFinite(value));
}

function isCommandContractPath(relativePath: string): boolean {
	return relativePath === COMMAND_CONTRACT_PATH;
}

function isValidationConfigPath(relativePath: string): boolean {
	return (
		isCommandContractPath(relativePath) ||
		/(?:^|\/)(?:package\.json|jest\.config\.[cm]?[jt]s|vitest\.config\.[cm]?[jt]s|nyc\.config\.[cm]?[jt]s)$/u.test(
			relativePath,
		) ||
		/\bcoverage\b/u.test(relativePath)
	);
}

function riskDetail(pathText: string, message: string): string {
	return `Changed validation path ${pathText} ${message}`;
}

export function countValidationRatchetVerdictEffects(
	risks: readonly ValidationRatchetRisk[],
): ValidationRatchetVerdictEffects {
	return {
		contradicted: risks.filter((risk) => risk.severity === 'critical' && CRITICAL_RATCHET_CODES.has(risk.code)).length,
	};
}

export function createValidationRatchetRisks(
	report: ChangeClassificationReport,
	projectRoot: string,
): readonly ValidationRatchetRisk[] {
	const risks: ValidationRatchetRisk[] = [];
	const seenRisks = new Set<string>();
	const changedDiffs = report.source === 'changed'
		? gitDiffLinesByPath(projectRoot, report.classifications.map((classification) => classification.path))
		: new Map<string, DiffLines>();

	function addRisk(code: ValidationRatchetRiskCode, severity: ValidationRatchetRiskSeverity, pathText: string, detail: string): void {
		const key = `${pathText}\0${code}`;
		if (seenRisks.has(key)) {
			return;
		}
		seenRisks.add(key);
		risks.push({ code, severity, path: pathText, detail });
	}

	for (const classification of report.classifications) {
		const resolvedPath = resolveInsideRoot(projectRoot, classification.path);
		const diff = report.source === 'changed'
			? changedDiffs.get(classification.path) ?? { added: [], removed: [] }
			: { added: [], removed: [] };
		const addedText = diff.added.join('\n');

		if (isTestClassification(classification)) {
			if (report.source === 'changed' && (resolvedPath === null || !existsSync(resolvedPath))) {
				addRisk(
					'related_test_deleted',
					'high',
					classification.path,
					`Changed test path ${classification.path} is absent; deleted related tests require review before marking the task verified.`,
				);
				continue;
			}

			if (isJavaScriptTestPath(classification.path)) {
				const fileText = fileTextIfReadable(projectRoot, classification.path);
				if (fileText !== null && SKIP_OR_ONLY_MARKER.test(fileText)) {
					addRisk(
						'skip_or_only_marker_present',
						'medium',
						classification.path,
						`Changed test path ${classification.path} contains a .skip or .only marker; review whether validation was weakened before marking the task verified.`,
					);
				}
				if ((fileText !== null && TODO_OR_PENDING_MARKER.test(fileText)) || TODO_OR_PENDING_MARKER.test(addedText)) {
					addRisk(
						'todo_or_pending_marker_added',
						'medium',
						classification.path,
						`Changed test path ${classification.path} contains a todo or pending marker; review whether validation was deferred before marking the task verified.`,
					);
				}

				const removedAssertionCount = countMatching(diff.removed, ASSERTION_CALL);
				const addedAssertionCount = countMatching(diff.added, ASSERTION_CALL);
				if (removedAssertionCount > addedAssertionCount) {
					addRisk(
						'assertion_count_decreased',
						'high',
						classification.path,
						riskDetail(
							classification.path,
							`removes ${removedAssertionCount} assertion line(s) and adds ${addedAssertionCount}; review whether validation strength decreased.`,
						),
					);
				}
				if (hasAny(diff.removed, STRONG_ASSERTION) && hasAny(diff.added, WEAK_ASSERTION)) {
					addRisk(
						'assertion_matcher_weakened',
						'high',
						classification.path,
						riskDetail(classification.path, 'replaces a stronger assertion with a weaker presence or truthiness assertion.'),
					);
				}
				if (hasAny(diff.removed, NEGATIVE_ASSERTION)) {
					addRisk(
						'negative_assertion_removed',
						'high',
						classification.path,
						riskDetail(classification.path, 'removes a negative assertion; confirm the denied behavior is still covered.'),
					);
				}
				if (hasAny(diff.removed, EXCEPTION_ASSERTION)) {
					addRisk(
						'exception_assertion_removed',
						'high',
						classification.path,
						riskDetail(classification.path, 'removes an exception assertion; confirm failure behavior is still covered.'),
					);
				}
			}
			if (SNAPSHOT_PATH.test(classification.path) && diff.added.length + diff.removed.length >= 20) {
				addRisk(
					'snapshot_mass_updated',
					'medium',
					classification.path,
					riskDetail(classification.path, 'changes a large snapshot region; review that the update does not hide a regression.'),
				);
			}
			if (GOLDEN_PATH.test(classification.path) && diff.added.length + diff.removed.length >= 20) {
				addRisk(
					'golden_output_replaced',
					'medium',
					classification.path,
					riskDetail(classification.path, 'replaces a broad golden or expected-output region; review the behavioral reason.'),
				);
			}
		}

		if (isCommandContractPath(classification.path)) {
			if (hasAny(diff.added, /\bstatus\s*=\s*"(?:manual_only|disabled|unknown)"/u)) {
				addRisk(
					'verification_intent_disabled',
					'high',
					classification.path,
					riskDetail(classification.path, 'adds a non-runnable verification intent status.'),
				);
			}
			if (hasAny(diff.removed, /\brequired_after\s*=/u) && !hasAny(diff.added, /\brequired_after\s*=/u)) {
				addRisk(
					'verification_required_after_removed',
					'high',
					classification.path,
					riskDetail(classification.path, 'removes a required_after mapping from the command contract.'),
				);
			}
			if (hasAny(diff.added, /\bsuccess_exit_codes\s*=\s*\[[^\]]*(?:[1-9]\d*|true)[^\]]*\]/u)) {
				addRisk(
					'success_exit_codes_widened',
					'critical',
					classification.path,
					riskDetail(classification.path, 'widens success exit codes beyond the normal zero-exit contract.'),
				);
			}
			if (hasAny(diff.added, COMMAND_ALLOWS_NO_TESTS_PATTERN)) {
				addRisk(
					'command_allows_no_tests',
					'critical',
					classification.path,
					riskDetail(classification.path, 'allows a test command to pass when no tests run.'),
				);
			}
			if (hasAny(diff.added, COMMAND_FORCES_SNAPSHOT_UPDATE_PATTERN)) {
				addRisk(
					'command_forces_snapshot_update',
					'medium',
					classification.path,
					riskDetail(classification.path, 'adds snapshot update behavior to a verification command.'),
				);
			}
			if (hasAny(diff.added, COMMAND_HIDES_FAILURE_PATTERN)) {
				addRisk(
					'command_hides_failure',
					'critical',
					classification.path,
					riskDetail(classification.path, 'adds shell behavior that can hide command failure.'),
				);
			}
		}

		if (isValidationConfigPath(classification.path)) {
			const removedCoverageNumbers = extractCoverageNumbers(diff.removed);
			const addedCoverageNumbers = extractCoverageNumbers(diff.added);
			if (
				removedCoverageNumbers.length > 0 &&
				addedCoverageNumbers.length > 0 &&
				Math.min(...addedCoverageNumbers) < Math.max(...removedCoverageNumbers)
			) {
				addRisk(
					'coverage_threshold_lowered',
					'medium',
					classification.path,
					riskDetail(classification.path, 'lowers a coverage-related numeric threshold.'),
				);
			}
			if (hasAny(diff.added, COMMAND_ALLOWS_NO_TESTS_PATTERN)) {
				addRisk(
					'command_allows_no_tests',
					'critical',
					classification.path,
					riskDetail(classification.path, 'allows a validation script to pass when no tests run.'),
				);
			}
			if (hasAny(diff.added, COMMAND_FORCES_SNAPSHOT_UPDATE_PATTERN)) {
				addRisk(
					'command_forces_snapshot_update',
					'medium',
					classification.path,
					riskDetail(classification.path, 'adds snapshot update behavior to a validation script.'),
				);
			}
			if (hasAny(diff.added, COMMAND_HIDES_FAILURE_PATTERN)) {
				addRisk(
					'command_hides_failure',
					'critical',
					classification.path,
					riskDetail(classification.path, 'adds shell behavior that can hide validation failure.'),
				);
			}
			if (hasAny(diff.added, TEST_SELECTION_PATTERN)) {
				addRisk(
					'test_selection_narrowed',
					'medium',
					classification.path,
					riskDetail(classification.path, 'adds a test-selection filter; confirm coverage still matches the change.'),
				);
			}
		}
	}

	return risks;
}
