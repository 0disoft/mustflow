import { readFileSync } from 'node:fs';
import path from 'node:path';

import {
	SOURCE_ANCHOR_ALLOWED_RISKS,
	listSourceAnchorFiles,
	parseSourceAnchorsInContent,
	sourceAnchorPathIsGeneratedOrVendor,
	splitSourceAnchorList,
	type ParsedSourceAnchor,
} from './source-anchors.js';

export const SOURCE_ANCHOR_IGNORED_DIRECTORIES = new Set([
	'.git',
	'.mustflow',
	'coverage',
	'dist',
	'build',
	'node_modules',
	'tests',
	'.next',
	'.nuxt',
]);

const SOURCE_ANCHOR_PURPOSE_WARNING_MAX_CHARS = 180;
const SOURCE_ANCHOR_SEARCH_WARNING_MAX_TERMS = 12;
const SOURCE_ANCHOR_DENSITY_WARNING_MAX_PER_FILE = 5;
const SOURCE_ANCHOR_DENSITY_WARNING_MIN_LINES_PER_ANCHOR = 120;
const SOURCE_ANCHOR_HIGH_RISK_PURPOSE_REVIEW_MAX_CHARS = 120;
const SOURCE_ANCHOR_HIGH_RISK_SEARCH_REVIEW_MAX_TERMS = 8;
const SOURCE_ANCHOR_HIGH_RISK_TAGS = new Set([
	'authz',
	'authorization',
	'data_loss',
	'migration',
	'payment',
	'pii',
	'privacy',
	'secrets',
	'security',
]);
const SOURCE_ANCHOR_FORBIDDEN_INSTRUCTION_PATTERNS = [
	/\b(?:agent|agents|llm|model|assistant)\s+(?:must|should|may|can)\s+(?:not\s+)?(?:run|execute|skip|ignore|bypass|override)\b/iu,
	/\b(?:do\s+not|don't|never|skip)\s+(?:run|execute)\s+(?:tests?|checks?|validation|mf\s+run)\b/iu,
	/\b(?:ignore|bypass|override)\s+(?:AGENTS\.md|mustflow|command\s+contract|commands\.toml|workflow\s+rules?)\b/iu,
	/\b(?:run|execute)\s+(?:this\s+)?(?:shell\s+)?command\b/iu,
	/\bmf\s+run\s+[a-z0-9_.-]+\b/iu,
	/\bthis\s+anchor\s+(?:authorizes|grants|allows)\b.*\b(?:agents?|commands?|validation|verification)\b/iu,
	/\b(?:command_intents?|required_after|run_policy|argv|cmd|permissions?|allowed_edits|skip_validation|agent_action)\s*[:=]/iu,
];
const SOURCE_ANCHOR_SECRET_LIKE_PATTERNS = [
	/\b(?:api[_-]?key|api[_-]?token|access[_-]?token|auth[_-]?token|secret|password|passwd|private[_-]?key)\b\s*[:=]\s*["']?[A-Za-z0-9_./+=:-]{8,}/iu,
	/\b(?:sk-[A-Za-z0-9]{16,}|ghp_[A-Za-z0-9]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/u,
];

export interface SourceAnchorValidationIssue {
	readonly severity: 'error' | 'warning';
	readonly message: string;
}

function sourceAnchorIssue(message: string): SourceAnchorValidationIssue {
	return { severity: 'error', message };
}

function sourceAnchorWarning(message: string): SourceAnchorValidationIssue {
	return { severity: 'warning', message };
}

function sourceAnchorLabel(anchor: Pick<ParsedSourceAnchor, 'rawId' | 'path' | 'lineStart'>): string {
	return `${anchor.rawId} in ${anchor.path}:${anchor.lineStart}`;
}

function validateSourceAnchor(anchor: ParsedSourceAnchor): SourceAnchorValidationIssue[] {
	const issues: SourceAnchorValidationIssue[] = [];

	if (!anchor.idValid) {
		return [
			sourceAnchorIssue(
				`source anchor ${anchor.path}:${anchor.lineStart} has invalid format: anchor id must be lowercase letters, numbers, dots, or hyphens`,
			),
		];
	}

	const label = sourceAnchorLabel(anchor);

	if (sourceAnchorPathIsGeneratedOrVendor(anchor.path)) {
		issues.push(sourceAnchorIssue(`source anchor ${anchor.rawId} is in generated or vendor path ${anchor.path}`));
	}

	if (SOURCE_ANCHOR_FORBIDDEN_INSTRUCTION_PATTERNS.some((pattern) => pattern.test(anchor.rawText))) {
		issues.push(sourceAnchorIssue(`source anchor ${label} contains agent command or policy instructions`));
	}

	if (SOURCE_ANCHOR_SECRET_LIKE_PATTERNS.some((pattern) => pattern.test(anchor.rawText))) {
		issues.push(sourceAnchorIssue(`source anchor ${label} contains secret-like text`));
	}

	for (const field of anchor.unsupportedFields) {
		issues.push(sourceAnchorIssue(`source anchor ${anchor.rawId} in ${anchor.path}:${anchor.lineStart} has invalid format: unsupported field "${field}"`));
	}

	const riskTags = splitSourceAnchorList(anchor.fields.get('risk'));

	for (const risk of riskTags) {
		if (!SOURCE_ANCHOR_ALLOWED_RISKS.has(risk)) {
			issues.push(sourceAnchorIssue(`source anchor ${label} uses unknown risk tag "${risk}"`));
		}
	}

	const purpose = anchor.fields.get('purpose');
	if (purpose && purpose.length > SOURCE_ANCHOR_PURPOSE_WARNING_MAX_CHARS) {
		issues.push(
			sourceAnchorWarning(
				`source anchor ${label} purpose is long (${purpose.length} characters > ${SOURCE_ANCHOR_PURPOSE_WARNING_MAX_CHARS})`,
			),
		);
	}

	const searchTerms = splitSourceAnchorList(anchor.fields.get('search'));
	if (searchTerms.length > SOURCE_ANCHOR_SEARCH_WARNING_MAX_TERMS) {
		issues.push(
			sourceAnchorWarning(
				`source anchor ${label} has too many search terms (${searchTerms.length} > ${SOURCE_ANCHOR_SEARCH_WARNING_MAX_TERMS})`,
			),
		);
	}

	const highRiskTags = riskTags.filter((risk) => SOURCE_ANCHOR_HIGH_RISK_TAGS.has(risk));
	if (highRiskTags.length === 0) {
		return issues;
	}

	const reviewReasons: string[] = [];
	if (!anchor.fields.has('invariant')) {
		reviewReasons.push('missing invariant');
	}

	if (purpose && purpose.length > SOURCE_ANCHOR_HIGH_RISK_PURPOSE_REVIEW_MAX_CHARS) {
		reviewReasons.push(`purpose ${purpose.length} characters > ${SOURCE_ANCHOR_HIGH_RISK_PURPOSE_REVIEW_MAX_CHARS}`);
	}

	if (searchTerms.length > SOURCE_ANCHOR_HIGH_RISK_SEARCH_REVIEW_MAX_TERMS) {
		reviewReasons.push(`search terms ${searchTerms.length} > ${SOURCE_ANCHOR_HIGH_RISK_SEARCH_REVIEW_MAX_TERMS}`);
	}

	if (reviewReasons.length > 0) {
		issues.push(
			sourceAnchorWarning(
				`source anchor ${label} uses high-risk tags and needs review: ${highRiskTags.join(', ')}; ${reviewReasons.join('; ')}`,
			),
		);
	}

	return issues;
}

function countNonEmptyLines(content: string): number {
	return content.split(/\r?\n/u).filter((line) => line.trim().length > 0).length;
}

function validateSourceAnchorDensity(
	relativePath: string,
	content: string,
	anchors: readonly ParsedSourceAnchor[],
): SourceAnchorValidationIssue[] {
	if (anchors.length <= SOURCE_ANCHOR_DENSITY_WARNING_MAX_PER_FILE) {
		return [];
	}

	const nonEmptyLines = countNonEmptyLines(content);
	const linesPerAnchor = nonEmptyLines / anchors.length;

	if (linesPerAnchor >= SOURCE_ANCHOR_DENSITY_WARNING_MIN_LINES_PER_ANCHOR) {
		return [];
	}

	return [
		sourceAnchorWarning(
			`${relativePath} has high source anchor density (${anchors.length} anchors across ${nonEmptyLines} non-empty lines)`,
		),
	];
}

/**
 * mf:anchor core.source-anchor-validation
 * purpose: Validate source anchors as navigation-only metadata without command, verification, or policy authority.
 * search: source anchor validation, forbidden instruction, duplicate id, high risk review
 * invariant: Source anchor validation reports issues but never grants command permission or verification authority.
 * risk: config, security
 */
export function validateSourceAnchorsInProject(projectRoot: string): SourceAnchorValidationIssue[] {
	const sourceFiles = listSourceAnchorFiles(projectRoot, {
		ignoredDirectoryNames: SOURCE_ANCHOR_IGNORED_DIRECTORIES,
	});
	const issues: SourceAnchorValidationIssue[] = [];
	const anchorsById = new Map<string, ParsedSourceAnchor[]>();

	for (const relativePath of sourceFiles) {
		const absolutePath = path.join(projectRoot, ...relativePath.split('/'));
		const content = readFileSync(absolutePath, 'utf8');
		const anchors = parseSourceAnchorsInContent(relativePath, content);
		issues.push(...validateSourceAnchorDensity(relativePath, content, anchors));

		for (const anchor of anchors) {
			issues.push(...validateSourceAnchor(anchor));

			if (!anchor.idValid) {
				continue;
			}

			const anchorsForId = anchorsById.get(anchor.rawId) ?? [];
			anchorsForId.push(anchor);
			anchorsById.set(anchor.rawId, anchorsForId);
		}
	}

	for (const [id, anchors] of anchorsById) {
		if (anchors.length <= 1) {
			continue;
		}

		issues.push(
			sourceAnchorIssue(
				`source anchor id "${id}" is duplicated: ${anchors.map((anchor) => `${anchor.path}:${anchor.lineStart}`).join(', ')}`,
			),
		);
	}

	return issues;
}
