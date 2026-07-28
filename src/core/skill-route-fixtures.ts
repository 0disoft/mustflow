import { existsSync } from 'node:fs';
import path from 'node:path';

import { isRecord } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import { resolveSkillRoutes } from './skill-route-resolution.js';

export const SKILL_ROUTE_FIXTURES_PATH = '.mustflow/skills/route-fixtures.json';

const FIXTURE_MAX_BYTES = 256 * 1024;

interface SkillRouteFixtureCase {
	readonly id: string;
	readonly task: string | null;
	readonly paths: readonly string[];
	readonly reasons: readonly string[];
	readonly maxCandidates: number | undefined;
	readonly requiredMain: string | undefined;
	readonly requiredCandidates: readonly string[];
	readonly requiredAdjuncts: readonly string[];
	readonly forbiddenCandidates: readonly string[];
}

export interface SkillRouteFixtureValidationIssue {
	readonly kind: 'invalid' | 'mismatch';
	readonly message: string;
}

export interface SkillRouteEvaluationReport {
	readonly schema_version: '1';
	readonly kind: 'skill_route_evaluation';
	readonly case_count: number;
	readonly passed_case_count: number;
	readonly main_accuracy: { readonly matched: number; readonly expected: number; readonly rate: number };
	readonly candidate_recall: { readonly matched: number; readonly expected: number; readonly rate: number };
	readonly adjunct_recall: { readonly matched: number; readonly expected: number; readonly rate: number };
	readonly forbidden_violation_rate: { readonly violations: number; readonly expected: number; readonly rate: number };
	readonly issues: readonly SkillRouteFixtureValidationIssue[];
}

interface SkillRouteEvaluationCounts {
	mainMatched: number;
	mainExpected: number;
	candidateMatched: number;
	candidateExpected: number;
	adjunctMatched: number;
	adjunctExpected: number;
	forbiddenViolations: number;
	forbiddenExpected: number;
}

function readStringArray(value: unknown, options: { allowEmpty?: boolean } = {}): string[] | null {
	if (
		!Array.isArray(value) ||
		(!options.allowEmpty && value.length === 0) ||
		!value.every((entry) => typeof entry === 'string' && entry.trim().length > 0)
	) {
		return null;
	}

	return value.map((entry) => entry.trim());
}

function readOptionalStringArray(
	value: unknown,
	pointer: string,
	issues: SkillRouteFixtureValidationIssue[],
): string[] | null {
	if (value === undefined) {
		return [];
	}

	const entries = readStringArray(value);
	if (!entries) {
		issues.push({ kind: 'invalid', message: `${pointer} must be a non-empty string array when present` });
		return null;
	}

	return entries;
}

function readOptionalString(value: unknown): string | undefined {
	return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function readOptionalMaxCandidates(value: unknown): number | undefined {
	return Number.isInteger(value) && Number(value) > 0 && Number(value) <= 10 ? Number(value) : undefined;
}

function parseFixtureCase(value: unknown, index: number, issues: SkillRouteFixtureValidationIssue[]): SkillRouteFixtureCase | null {
	const pointer = `${SKILL_ROUTE_FIXTURES_PATH} cases[${index}]`;
	if (!isRecord(value)) {
		issues.push({ kind: 'invalid', message: `${pointer} must be an object` });
		return null;
	}

	const id = readOptionalString(value.id);
	if (!id) {
		issues.push({ kind: 'invalid', message: `${pointer}.id must be a non-empty string` });
		return null;
	}

	const paths = readStringArray(value.paths);
	if (!paths) {
		issues.push({ kind: 'invalid', message: `${pointer}.paths must be a non-empty string array` });
		return null;
	}

	const reasons = readStringArray(value.reasons);
	if (!reasons) {
		issues.push({ kind: 'invalid', message: `${pointer}.reasons must be a non-empty string array` });
		return null;
	}

	let task: string | null;
	if (value.task === undefined || value.task === null) {
		task = null;
	} else {
		const taskValue = readOptionalString(value.task);
		if (!taskValue) {
			issues.push({ kind: 'invalid', message: `${pointer}.task must be a non-empty string, null, or omitted` });
			return null;
		}
		task = taskValue;
	}

	const maxCandidates = value.max_candidates === undefined ? undefined : readOptionalMaxCandidates(value.max_candidates);
	if (value.max_candidates !== undefined && maxCandidates === undefined) {
		issues.push({ kind: 'invalid', message: `${pointer}.max_candidates must be an integer from 1 through 10` });
		return null;
	}

	const requiredCandidates = readOptionalStringArray(value.required_candidates, `${pointer}.required_candidates`, issues);
	const requiredAdjuncts = readOptionalStringArray(value.required_adjuncts, `${pointer}.required_adjuncts`, issues);
	const forbiddenCandidates = readOptionalStringArray(value.forbidden_candidates, `${pointer}.forbidden_candidates`, issues);
	if (!requiredCandidates || !requiredAdjuncts || !forbiddenCandidates) {
		return null;
	}

	const fixture = {
		id,
		task,
		paths,
		reasons,
		maxCandidates,
		requiredMain: readOptionalString(value.required_main),
		requiredCandidates,
		requiredAdjuncts,
		forbiddenCandidates,
	} satisfies SkillRouteFixtureCase;

	if (
		!fixture.requiredMain &&
		fixture.requiredCandidates.length === 0 &&
		fixture.requiredAdjuncts.length === 0 &&
		fixture.forbiddenCandidates.length === 0
	) {
		issues.push({
			kind: 'invalid',
			message: `${pointer} must declare required_main, required_candidates, required_adjuncts, or forbidden_candidates`,
		});
		return null;
	}

	return fixture;
}

function formatSkill(value: string | null | undefined): string {
	return value ?? 'none';
}

function evaluateFixtureCase(
	projectRoot: string,
	fixture: SkillRouteFixtureCase,
): { readonly issues: SkillRouteFixtureValidationIssue[]; readonly counts: SkillRouteEvaluationCounts } {
	const report = resolveSkillRoutes(projectRoot, {
		taskText: fixture.task,
		paths: fixture.paths,
		reasons: fixture.reasons,
		maxCandidates: fixture.maxCandidates,
	});
	const issues: SkillRouteFixtureValidationIssue[] = [];
	const counts: SkillRouteEvaluationCounts = {
		mainMatched: 0,
		mainExpected: fixture.requiredMain ? 1 : 0,
		candidateMatched: 0,
		candidateExpected: fixture.requiredCandidates.length,
		adjunctMatched: 0,
		adjunctExpected: fixture.requiredAdjuncts.length,
		forbiddenViolations: 0,
		forbiddenExpected: fixture.forbiddenCandidates.length,
	};
	const candidateSkills = new Set(report.candidates.map((candidate) => candidate.skill));
	const adjunctSkills = new Set(report.selected.adjuncts.map((candidate) => candidate.skill));

	if (fixture.requiredMain && report.selected.main?.skill !== fixture.requiredMain) {
		issues.push({
			kind: 'mismatch',
			message: `Skill route fixture "${fixture.id}" expected selected main "${fixture.requiredMain}" but got "${formatSkill(report.selected.main?.skill)}"`,
		});
	} else if (fixture.requiredMain) {
		counts.mainMatched += 1;
	}

	for (const skill of fixture.requiredCandidates) {
		if (!candidateSkills.has(skill)) {
			issues.push({
				kind: 'mismatch',
				message: `Skill route fixture "${fixture.id}" expected candidate "${skill}" within top ${report.input.max_candidates}`,
			});
		} else {
			counts.candidateMatched += 1;
		}
	}

	for (const skill of fixture.requiredAdjuncts) {
		if (!adjunctSkills.has(skill)) {
			issues.push({
				kind: 'mismatch',
				message: `Skill route fixture "${fixture.id}" expected selected adjunct "${skill}"`,
			});
		} else {
			counts.adjunctMatched += 1;
		}
	}

	for (const skill of fixture.forbiddenCandidates) {
		if (candidateSkills.has(skill) || adjunctSkills.has(skill) || report.selected.main?.skill === skill) {
			counts.forbiddenViolations += 1;
			issues.push({
				kind: 'mismatch',
				message: `Skill route fixture "${fixture.id}" forbids selected or candidate skill "${skill}"`,
			});
		}
	}

	return { issues, counts };
}

export function evaluateSkillRouteFixtures(projectRoot: string): SkillRouteEvaluationReport {
	const fixturePath = path.join(projectRoot, ...SKILL_ROUTE_FIXTURES_PATH.split('/'));
	if (!existsSync(fixturePath)) {
		return createEvaluationReport(0, 0, [], emptyEvaluationCounts());
	}

	const issues: SkillRouteFixtureValidationIssue[] = [];
	let parsed: unknown;

	try {
		parsed = JSON.parse(readUtf8FileInsideWithoutSymlinks(projectRoot, fixturePath, { maxBytes: FIXTURE_MAX_BYTES }));
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const issues = [{ kind: 'invalid', message: `${SKILL_ROUTE_FIXTURES_PATH} is not valid JSON: ${message}` }] as const;
		return createEvaluationReport(0, 0, issues, emptyEvaluationCounts());
	}

	if (!isRecord(parsed) || parsed.schema_version !== '1' || !Array.isArray(parsed.cases)) {
		const invalidIssue = {
			kind: 'invalid',
			message: `${SKILL_ROUTE_FIXTURES_PATH} must contain schema_version "1" and a cases array`,
		} as const;
		return createEvaluationReport(0, 0, [invalidIssue], emptyEvaluationCounts());
	}

	const counts = emptyEvaluationCounts();
	let validCaseCount = 0;
	let passedCaseCount = 0;
	for (const [index, entry] of parsed.cases.entries()) {
		const fixture = parseFixtureCase(entry, index, issues);
		if (!fixture) {
			continue;
		}
		validCaseCount += 1;
		const evaluation = evaluateFixtureCase(projectRoot, fixture);
		if (evaluation.issues.length === 0) {
			passedCaseCount += 1;
		}
		issues.push(...evaluation.issues);
		addEvaluationCounts(counts, evaluation.counts);
	}

	return createEvaluationReport(validCaseCount, passedCaseCount, issues, counts);
}

export function validateSkillRouteFixtures(projectRoot: string): SkillRouteFixtureValidationIssue[] {
	return [...evaluateSkillRouteFixtures(projectRoot).issues];
}

function emptyEvaluationCounts(): SkillRouteEvaluationCounts {
	return {
		mainMatched: 0,
		mainExpected: 0,
		candidateMatched: 0,
		candidateExpected: 0,
		adjunctMatched: 0,
		adjunctExpected: 0,
		forbiddenViolations: 0,
		forbiddenExpected: 0,
	};
}

function addEvaluationCounts(target: SkillRouteEvaluationCounts, source: SkillRouteEvaluationCounts): void {
	target.mainMatched += source.mainMatched;
	target.mainExpected += source.mainExpected;
	target.candidateMatched += source.candidateMatched;
	target.candidateExpected += source.candidateExpected;
	target.adjunctMatched += source.adjunctMatched;
	target.adjunctExpected += source.adjunctExpected;
	target.forbiddenViolations += source.forbiddenViolations;
	target.forbiddenExpected += source.forbiddenExpected;
}

function rate(numerator: number, denominator: number): number {
	return denominator === 0 ? 1 : Number((numerator / denominator).toFixed(6));
}

function createEvaluationReport(
	caseCount: number,
	passedCaseCount: number,
	issues: readonly SkillRouteFixtureValidationIssue[],
	counts: SkillRouteEvaluationCounts,
): SkillRouteEvaluationReport {
	return {
		schema_version: '1',
		kind: 'skill_route_evaluation',
		case_count: caseCount,
		passed_case_count: passedCaseCount,
		main_accuracy: {
			matched: counts.mainMatched,
			expected: counts.mainExpected,
			rate: rate(counts.mainMatched, counts.mainExpected),
		},
		candidate_recall: {
			matched: counts.candidateMatched,
			expected: counts.candidateExpected,
			rate: rate(counts.candidateMatched, counts.candidateExpected),
		},
		adjunct_recall: {
			matched: counts.adjunctMatched,
			expected: counts.adjunctExpected,
			rate: rate(counts.adjunctMatched, counts.adjunctExpected),
		},
		forbidden_violation_rate: {
			violations: counts.forbiddenViolations,
			expected: counts.forbiddenExpected,
			rate: counts.forbiddenExpected === 0
				? 0
				: Number((counts.forbiddenViolations / counts.forbiddenExpected).toFixed(6)),
		},
		issues,
	};
}
