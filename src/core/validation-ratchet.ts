import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import type { ChangeClassification, ChangeClassificationReport } from './change-classification.js';

export type ValidationRatchetRiskCode = 'related_test_deleted' | 'skip_or_only_marker_present';

export type ValidationRatchetRiskSeverity = 'medium' | 'high';

export interface ValidationRatchetRisk {
	readonly code: ValidationRatchetRiskCode;
	readonly severity: ValidationRatchetRiskSeverity;
	readonly detail: string;
	readonly path: string;
}

const TEST_CHANGE_KINDS = new Set(['test', 'test_fixture']);
const SKIP_OR_ONLY_MARKER = /\b(?:describe|it|test)\s*\.\s*(?:skip|only)\s*\(/u;

function isTestClassification(classification: ChangeClassification): boolean {
	return classification.surface.category === 'test' || classification.changeKinds.some((kind) => TEST_CHANGE_KINDS.has(kind));
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

export function createValidationRatchetRisks(
	report: ChangeClassificationReport,
	projectRoot: string,
): readonly ValidationRatchetRisk[] {
	const risks: ValidationRatchetRisk[] = [];

	for (const classification of report.classifications.filter(isTestClassification)) {
		const resolvedPath = resolveInsideRoot(projectRoot, classification.path);

		if (report.source === 'changed' && (resolvedPath === null || !existsSync(resolvedPath))) {
			risks.push({
				code: 'related_test_deleted',
				severity: 'high',
				path: classification.path,
				detail: `Changed test path ${classification.path} is absent; deleted related tests require review before marking the task verified.`,
			});
			continue;
		}

		const fileText = fileTextIfReadable(projectRoot, classification.path);
		if (fileText !== null && SKIP_OR_ONLY_MARKER.test(fileText)) {
			risks.push({
				code: 'skip_or_only_marker_present',
				severity: 'medium',
				path: classification.path,
				detail: `Changed test path ${classification.path} contains a .skip or .only marker; review whether validation was weakened before marking the task verified.`,
			});
		}
	}

	return risks;
}
