import { existsSync } from 'node:fs';

import {
	isRecord,
	readMustflowOwnedTomlFile,
	readStringArray,
	resolveMustflowConfigPath,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';
import type { ChangeClassification, ChangeClassificationReport } from './change-classification.js';
import {
	classifyVerificationCandidate,
	type VerificationCandidate,
	type VerificationSkipReason,
} from './verification-plan.js';
import { normalizeSafeTestTargetPath } from './test-target-paths.js';

export const TEST_SELECTION_CONFIG_RELATIVE_PATH = '.mustflow/config/test-selection.toml';
const STALE_OR_MISSING_RULES_NOTE =
	'Project-declared test selection rules did not cover the current changed files; review .mustflow/config/test-selection.toml for stale or missing rules.';

export type TestSelectionStatus = 'missing' | 'matched' | 'unmatched' | 'invalid';
export type TestSelectionCandidateRole = 'primary' | 'fallback';

export interface TestSelectionRuleMatch {
	readonly ruleId: string;
	readonly risk: string;
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly intent: string;
	readonly fallbackIntent: string;
	readonly testTargets: readonly string[];
}

export interface TestSelectionCandidate {
	readonly ruleId: string;
	readonly reason: string;
	readonly intent: string;
	readonly role: TestSelectionCandidateRole;
	readonly status: VerificationCandidate['status'];
	readonly skipReason: VerificationSkipReason | null;
	readonly detail: string | null;
	readonly testTargets: readonly string[];
	readonly appliedTestTargets: readonly string[];
	readonly testTargetsApplied: boolean;
}

export interface TestSelectionReport {
	readonly source: 'test-selection.toml';
	readonly status: TestSelectionStatus;
	readonly configPath: typeof TEST_SELECTION_CONFIG_RELATIVE_PATH;
	readonly authority: typeof TEST_SELECTION_CONFIG_RELATIVE_PATH;
	readonly commandAuthority: '.mustflow/config/commands.toml';
	readonly grantsCommandAuthority: false;
	readonly matches: readonly TestSelectionRuleMatch[];
	readonly selected: readonly TestSelectionCandidate[];
	readonly notes: readonly string[];
}

export interface TestSelectionVerificationCandidate {
	readonly reason: string;
	readonly candidate: VerificationCandidate;
	readonly testTargets: readonly string[];
}

export interface TestSelectionPlan {
	readonly report: TestSelectionReport;
	readonly candidates: readonly TestSelectionVerificationCandidate[];
	readonly selectedCandidates: readonly TestSelectionVerificationCandidate[];
}

interface TestSelectionRule {
	readonly id: string;
	readonly risk: string;
	readonly reason: string;
	readonly paths: readonly string[];
	readonly surfaces: readonly string[];
	readonly intent: string;
	readonly fallbackIntent: string;
	readonly testTargets: readonly string[];
}

function uniqueSorted(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function toPosixPath(value: string): string {
	return value.replace(/\\/g, '/');
}

function escapeRegExp(value: string): string {
	return value.replace(/[\\^$+?.()|[\]{}]/g, '\\$&');
}

function globToRegExp(pattern: string): RegExp {
	const normalized = toPosixPath(pattern).replace(/^\/+/u, '');
	let source = '^';

	for (let index = 0; index < normalized.length; ) {
		if (normalized.startsWith('**', index)) {
			source += '.*';
			index += 2;
			continue;
		}

		const char = normalized[index];
		if (char === '*') {
			source += '[^/]*';
			index += 1;
			continue;
		}

		source += escapeRegExp(char ?? '');
		index += 1;
	}

	return new RegExp(`${source}$`, 'u');
}

function readStringField(table: TomlTable, key: string): string | null {
	const value = table[key];
	return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function readRule(value: unknown): TestSelectionRule | null {
	if (!isRecord(value) || !isRecord(value.match) || !isRecord(value.select)) {
		return null;
	}

	const id = readStringField(value, 'id');
	const risk = readStringField(value, 'risk');
	const reason = readStringField(value, 'reason');
	const paths = readStringArray(value.match, 'paths');
	const surfaces = readStringArray(value.match, 'surfaces');
	const intent = readStringField(value.select, 'intent');
	const fallbackIntent = readStringField(value.select, 'fallback_intent');
	const rawTestTargets = readStringArray(value.select, 'test_targets') ?? [];
	const testTargets = rawTestTargets.map((target) => normalizeSafeTestTargetPath(target));

	if (
		!id ||
		!risk ||
		!reason ||
		!paths ||
		paths.length === 0 ||
		!surfaces ||
		surfaces.length === 0 ||
		!intent ||
		!fallbackIntent ||
		!testTargets.every((target): target is string => target !== null)
	) {
		return null;
	}

	return {
		id,
		risk,
		reason,
		paths: uniqueSorted(paths),
		surfaces: uniqueSorted(surfaces),
		intent,
		fallbackIntent,
		testTargets: uniqueSorted(testTargets),
	};
}

function readRules(projectRoot: string): { readonly status: 'missing' | 'invalid'; readonly rules: readonly TestSelectionRule[]; readonly note: string } | { readonly status: 'loaded'; readonly rules: readonly TestSelectionRule[] } {
	const configPath = resolveMustflowConfigPath(projectRoot, TEST_SELECTION_CONFIG_RELATIVE_PATH);

	if (!existsSync(configPath)) {
		return {
			status: 'missing',
			rules: [],
			note: 'No project-declared test selection manifest exists; mustflow will not infer a user-project test subset.',
		};
	}

	try {
		const parsed = readMustflowOwnedTomlFile(projectRoot, TEST_SELECTION_CONFIG_RELATIVE_PATH);
		if (!isRecord(parsed) || parsed.schema_version !== '1' || !Array.isArray(parsed.rules)) {
			return {
				status: 'invalid',
				rules: [],
				note: 'Project-declared test selection manifest is invalid; run mf check --strict before relying on it.',
			};
		}

		const rules = parsed.rules.map(readRule);
		if (!rules.every((rule): rule is TestSelectionRule => rule !== null)) {
			return {
				status: 'invalid',
				rules: [],
				note: 'Project-declared test selection manifest has invalid rule shapes; run mf check --strict before relying on it.',
			};
		}

		return { status: 'loaded', rules };
	} catch {
		return {
			status: 'invalid',
			rules: [],
			note: 'Project-declared test selection manifest cannot be read; run mf check --strict before relying on it.',
		};
	}
}

function ruleMatchesClassification(rule: TestSelectionRule, classification: ChangeClassification): boolean {
	const pathMatches = rule.paths.some((pattern) => globToRegExp(pattern).test(toPosixPath(classification.path)));
	const surfaceMatches = rule.surfaces.includes(classification.surface.kind);
	return pathMatches && surfaceMatches;
}

function matchingClassifications(rule: TestSelectionRule, report: ChangeClassificationReport): ChangeClassification[] {
	return report.classifications.filter((classification) => ruleMatchesClassification(rule, classification));
}

function selectReason(classifications: readonly ChangeClassification[]): string {
	return (
		classifications.flatMap((classification) => classification.surface.validationReasons)[0] ??
		'unknown_change'
	);
}

function withDetail(candidate: VerificationCandidate, detail: string): VerificationCandidate {
	return {
		...candidate,
		detail: candidate.detail ?? detail,
	};
}

function commandAcceptsTestTargets(commandContract: CommandContract, intent: string): boolean {
	const rawIntent = commandContract.intents[intent];

	return isRecord(rawIntent) && isRecord(rawIntent.selection) && rawIntent.selection.accepts_test_targets === true;
}

function appliedTestTargetsForCandidate(
	rule: TestSelectionRule,
	commandContract: CommandContract,
	candidate: VerificationCandidate,
): readonly string[] {
	return candidate.status === 'runnable' && commandAcceptsTestTargets(commandContract, candidate.intent)
		? rule.testTargets
		: [];
}

function toReportCandidate(
	rule: TestSelectionRule,
	reason: string,
	role: TestSelectionCandidateRole,
	candidate: VerificationCandidate,
	appliedTestTargets: readonly string[],
): TestSelectionCandidate {
	return {
		ruleId: rule.id,
		reason,
		intent: candidate.intent,
		role,
		status: candidate.status,
		skipReason: candidate.reason,
		detail: candidate.detail,
		testTargets: rule.testTargets,
		appliedTestTargets,
		testTargetsApplied: appliedTestTargets.length > 0,
	};
}

export function createProjectTestSelectionPlan(
	projectRoot: string,
	classificationReport: ChangeClassificationReport,
	commandContract: CommandContract,
): TestSelectionPlan {
	const loaded = readRules(projectRoot);

	if (loaded.status !== 'loaded') {
		const status = loaded.status;
		return {
			report: {
				source: 'test-selection.toml',
				status,
				configPath: TEST_SELECTION_CONFIG_RELATIVE_PATH,
				authority: TEST_SELECTION_CONFIG_RELATIVE_PATH,
				commandAuthority: '.mustflow/config/commands.toml',
				grantsCommandAuthority: false,
				matches: [],
				selected: [],
				notes: [loaded.note],
			},
			candidates: [],
			selectedCandidates: [],
		};
	}

	const matches: TestSelectionRuleMatch[] = [];
	const candidates: TestSelectionVerificationCandidate[] = [];
	const selectedCandidates: TestSelectionVerificationCandidate[] = [];
	const selectedReportCandidates: TestSelectionCandidate[] = [];

	for (const rule of loaded.rules) {
		const classifications = matchingClassifications(rule, classificationReport);
		if (classifications.length === 0) {
			continue;
		}

		const reason = selectReason(classifications);
		matches.push({
			ruleId: rule.id,
			risk: rule.risk,
			reason: rule.reason,
			files: uniqueSorted(classifications.map((classification) => classification.path)),
			surfaces: uniqueSorted(classifications.map((classification) => classification.surface.kind)),
			intent: rule.intent,
			fallbackIntent: rule.fallbackIntent,
			testTargets: rule.testTargets,
		});

		const primary = withDetail(
			classifyVerificationCandidate(rule.intent, commandContract.intents[rule.intent]),
			`Project-declared test selection rule "${rule.id}".`,
		);
		const primaryTestTargets = appliedTestTargetsForCandidate(rule, commandContract, primary);
		const primaryCandidate = { reason, candidate: primary, testTargets: primaryTestTargets };
		candidates.push(primaryCandidate);

		if (primary.status === 'runnable') {
			selectedCandidates.push(primaryCandidate);
			selectedReportCandidates.push(toReportCandidate(rule, reason, 'primary', primary, primaryTestTargets));
			continue;
		}

		selectedReportCandidates.push(toReportCandidate(rule, reason, 'primary', primary, primaryTestTargets));

		const fallback = withDetail(
			classifyVerificationCandidate(rule.fallbackIntent, commandContract.intents[rule.fallbackIntent]),
			`Fallback for project-declared test selection rule "${rule.id}".`,
		);
		const fallbackTestTargets = appliedTestTargetsForCandidate(rule, commandContract, fallback);
		const fallbackCandidate = { reason, candidate: fallback, testTargets: fallbackTestTargets };
		candidates.push(fallbackCandidate);

		if (fallback.status === 'runnable') {
			selectedCandidates.push(fallbackCandidate);
			selectedReportCandidates.push(toReportCandidate(rule, reason, 'fallback', fallback, fallbackTestTargets));
		}
	}

	const status: TestSelectionStatus = matches.length > 0 ? 'matched' : 'unmatched';
	const notes = [
		matches.length > 0
			? 'Matched project-declared test selection rules are treated as a minimum selected set.'
			: 'No project-declared test selection rules matched the current changed files.',
		...(matches.length > 0 ? [] : [STALE_OR_MISSING_RULES_NOTE]),
		'Local index data and performance history may add suggestions later, but must not remove manifest-selected tests.',
		'Absence of historical failures is not evidence that a test can be omitted.',
		'Test targets are passed only when the selected command intent declares selection.accepts_test_targets = true.',
	];

	return {
		report: {
			source: 'test-selection.toml',
			status,
			configPath: TEST_SELECTION_CONFIG_RELATIVE_PATH,
			authority: TEST_SELECTION_CONFIG_RELATIVE_PATH,
			commandAuthority: '.mustflow/config/commands.toml',
			grantsCommandAuthority: false,
			matches,
			selected: selectedReportCandidates,
			notes,
		},
		candidates,
		selectedCandidates,
	};
}
