import path from 'node:path';

import { createClassifyOutput, type ClassifyOutput } from '../classify.js';
import {
	type ChangeClassification,
	type ChangeClassificationReport,
	type ChangeClassificationSummary,
	type ChangeSource,
	type PublicSurfaceUpdatePolicy,
} from '../../../core/change-classification.js';
import { createCorrelationId, isCorrelationId } from '../../../core/correlation-id.js';
import { readUtf8FileInsideWithoutSymlinks, writeJsonFileInsideWithoutSymlinks } from '../../../core/safe-filesystem.js';
import type { MessageKey } from '../../lib/i18n.js';

export interface VerifyInput {
	readonly correlationId: string;
	readonly reasons: readonly string[];
	readonly classificationReport: ChangeClassificationReport;
}

export interface ChangedVerifyInput {
	readonly input: VerifyInput;
	readonly plan: ClassifyOutput;
}

function uniqueStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))];
}

function isStringArray(value: unknown): value is readonly string[] {
	return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isUpdatePolicy(value: unknown): value is PublicSurfaceUpdatePolicy {
	return value === 'update' || value === 'update_or_mark_stale' || value === 'not_applicable';
}

function isUpdatePolicyArray(value: unknown): value is readonly PublicSurfaceUpdatePolicy[] {
	return Array.isArray(value) && value.every((item): item is PublicSurfaceUpdatePolicy => isUpdatePolicy(item));
}

function readPlanRoot(value: unknown): string | null {
	if (!isPlainRecord(value)) {
		return null;
	}

	const root = value.mustflow_root;
	return typeof root === 'string' && root.length > 0 ? root : null;
}

function readPlanCorrelationId(value: unknown): string | null {
	if (!isPlainRecord(value)) {
		return null;
	}

	return isCorrelationId(value.correlation_id) ? value.correlation_id : null;
}

function readStrictClassificationSummary(value: unknown): ChangeClassificationSummary | null {
	if (!isPlainRecord(value)) {
		return null;
	}

	if (
		!Number.isInteger(value.fileCount) ||
		Number(value.fileCount) < 0 ||
		!Number.isInteger(value.publicSurfaceCount) ||
		Number(value.publicSurfaceCount) < 0 ||
		!isStringArray(value.changeKinds) ||
		!isStringArray(value.validationReasons) ||
		!isUpdatePolicyArray(value.updatePolicies) ||
		!isStringArray(value.driftChecks) ||
		!isStringArray(value.affectedContracts)
	) {
		return null;
	}

	return {
		fileCount: Number(value.fileCount),
		publicSurfaceCount: Number(value.publicSurfaceCount),
		changeKinds: [...value.changeKinds],
		validationReasons: uniqueStrings(value.validationReasons),
		updatePolicies: [...value.updatePolicies],
		driftChecks: [...value.driftChecks],
		affectedContracts: [...value.affectedContracts],
	};
}

function readStrictClassification(value: unknown): ChangeClassification | null {
	if (!isPlainRecord(value) || typeof value.path !== 'string' || !isStringArray(value.changeKinds)) {
		return null;
	}

	const surface = value.surface;
	if (!isPlainRecord(surface)) {
		return null;
	}

	if (
		typeof surface.kind !== 'string' ||
		typeof surface.category !== 'string' ||
		typeof surface.isPublicSurface !== 'boolean' ||
		!isStringArray(surface.validationReasons) ||
		!isStringArray(surface.affectedContracts) ||
		!isUpdatePolicy(surface.updatePolicy) ||
		!isStringArray(surface.driftChecks)
	) {
		return null;
	}

	return {
		path: value.path,
		changeKinds: [...value.changeKinds],
		surface: {
			kind: surface.kind,
			category: surface.category,
			isPublicSurface: surface.isPublicSurface,
			validationReasons: [...surface.validationReasons],
			affectedContracts: [...surface.affectedContracts],
			updatePolicy: surface.updatePolicy,
			driftChecks: [...surface.driftChecks],
		},
	};
}

function readStrictClassifications(value: unknown): ChangeClassification[] | null {
	if (!Array.isArray(value)) {
		return null;
	}

	const classifications = value.map(readStrictClassification);
	return classifications.every((classification): classification is ChangeClassification => classification !== null)
		? classifications
		: null;
}

function readStrictClassifyPlan(projectRoot: string, plan: unknown): ChangeClassificationReport {
	if (!isPlainRecord(plan)) {
		throw new Error('unsupported_plan_source');
	}

	if (plan.schema_version !== '1' || plan.command !== 'classify') {
		throw new Error('unsupported_plan_source');
	}

	if (readPlanRoot(plan) !== projectRoot) {
		throw new Error('plan_root_mismatch');
	}

	const source = plan.source;
	const files = plan.files;
	const classifications = readStrictClassifications(plan.classifications);
	const summary = readStrictClassificationSummary(plan.summary);

	if ((source !== 'changed' && source !== 'paths') || !isStringArray(files) || !classifications || !summary) {
		throw new Error('invalid_plan_file');
	}

	if (summary.validationReasons.length === 0) {
		throw new Error('missing_plan_reasons');
	}

	return {
		source,
		files: [...files],
		classifications,
		summary,
	};
}

function emptyClassificationSummary(validationReasons: readonly string[]): ChangeClassificationSummary {
	return {
		fileCount: 0,
		publicSurfaceCount: 0,
		changeKinds: [],
		validationReasons,
		updatePolicies: [],
		driftChecks: [],
		affectedContracts: [],
	};
}

export function createSyntheticClassificationReport(
	reasons: readonly string[],
	source: ChangeSource = 'paths',
	files: readonly string[] = [],
): ChangeClassificationReport {
	return {
		source,
		files,
		classifications: [],
		summary: emptyClassificationSummary(reasons),
	};
}

export function resolveVerifyInputPath(projectRoot: string, inputPath: string): string {
	const resolved = path.resolve(projectRoot, inputPath);
	const relative = path.relative(projectRoot, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		throw new Error('plan_path_outside_root');
	}

	return resolved;
}

export function readVerifyJsonInputFile(projectRoot: string, inputPath: string, invalidCode: string): unknown {
	const inputFilePath = resolveVerifyInputPath(projectRoot, inputPath);
	let content: string;

	try {
		content = readUtf8FileInsideWithoutSymlinks(projectRoot, inputFilePath);
	} catch (error) {
		if (error instanceof Error && error.message.startsWith('Path must not contain symlinks:')) {
			throw new Error('input_path_contains_symlink');
		}

		throw new Error(invalidCode);
	}

	try {
		return JSON.parse(content);
	} catch {
		throw new Error(invalidCode);
	}
}

export function readInputFromClassificationReport(projectRoot: string, inputPath: string): VerifyInput {
	const parsed = readVerifyJsonInputFile(projectRoot, inputPath, 'invalid_plan_file');
	const classificationReport = readStrictClassifyPlan(projectRoot, parsed);

	return {
		correlationId: readPlanCorrelationId(parsed) ?? createCorrelationId('verify'),
		reasons: classificationReport.summary.validationReasons,
		classificationReport,
	};
}

export function createInputFromChanged(projectRoot: string): ChangedVerifyInput {
	const plan = createClassifyOutput(projectRoot, 'changed', []);
	return {
		plan,
		input: {
			correlationId: plan.correlation_id,
			reasons: plan.summary.validationReasons,
			classificationReport: plan,
		},
	};
}

export function writeChangedPlan(projectRoot: string, inputPath: string, plan: ClassifyOutput): void {
	const planPath = resolveVerifyInputPath(projectRoot, inputPath);
	writeJsonFileInsideWithoutSymlinks(projectRoot, planPath, plan);
}

export function planErrorMessageKey(code: string): MessageKey {
	switch (code) {
		case 'plan_path_outside_root':
			return 'verify.error.plan_path_outside_root';
		case 'input_path_contains_symlink':
			return 'verify.error.input_path_contains_symlink';
		case 'missing_plan_reasons':
			return 'verify.error.missing_plan_reasons';
		case 'unsupported_plan_source':
			return 'verify.error.unsupported_plan_source';
		case 'plan_root_mismatch':
			return 'verify.error.plan_root_mismatch';
		case 'git_changed_files_unavailable':
			return 'verify.error.changed_files_unavailable';
		default:
			return 'verify.error.invalid_plan_file';
	}
}
