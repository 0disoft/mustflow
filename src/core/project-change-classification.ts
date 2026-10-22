import { isRecord, readMustflowConfigIfExists } from './config-loading.js';
import type { ChangeClassification, PublicSurfaceContract } from './change-classification.js';
import type { VerificationRiskLevel } from './risk-priced-evidence.js';

export const CHANGE_RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const;

interface ProjectRule {
	readonly id: string;
	readonly paths: readonly RegExp[];
	readonly reasons: readonly string[];
	readonly risk: VerificationRiskLevel;
}

function globPattern(pattern: string): RegExp {
	if (pattern.length === 0 || pattern.startsWith('/') || pattern.includes('\\') || pattern.includes(':') || pattern.split('/').includes('..')) throw new Error('invalid_classification_rule');
	let source = '^';
	for (let index = 0; index < pattern.length; index += 1) {
		const char = pattern[index];
		if (char === '*' && pattern[index + 1] === '*') {
			index += 1;
			if (pattern[index + 1] === '/') { source += '(?:.*/)?'; index += 1; }
			else source += '.*';
		} else if (char === '*') source += '[^/]*';
		else if (char === '?') source += '[^/]';
		else source += char.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
	}
	return new RegExp(`${source}$`, 'u');
}

export function readProjectClassificationRules(projectRoot: string): readonly ProjectRule[] {
	const config = readMustflowConfigIfExists(projectRoot);
	if (config?.classification === undefined) return [];
	if (!isRecord(config.classification) || !Array.isArray(config.classification.rules)) throw new Error('invalid_classification_rule');
	return config.classification.rules.map((raw) => {
		if (!isRecord(raw) || typeof raw.id !== 'string' || raw.id.trim().length === 0 ||
			!Array.isArray(raw.paths) || raw.paths.length === 0 || !raw.paths.every((value) => typeof value === 'string') ||
			!Array.isArray(raw.reasons) || raw.reasons.length === 0 || !raw.reasons.every((value) => typeof value === 'string' && value.trim().length > 0) ||
			!CHANGE_RISK_LEVELS.includes(raw.risk as VerificationRiskLevel)) throw new Error('invalid_classification_rule');
		return { id: raw.id, paths: (raw.paths as string[]).map(globPattern), reasons: raw.reasons as string[], risk: raw.risk as VerificationRiskLevel };
	});
}

export function applyProjectClassificationRules(classification: ChangeClassification, rules: readonly ProjectRule[]): ChangeClassification {
	const matching = rules.filter((rule) => rule.paths.some((pattern) => pattern.test(classification.path)));
	if (matching.length === 0) return classification;
	const original = classification.surface;
	const risks = [...matching.map((rule) => rule.risk), ...(original.riskLevel ? [original.riskLevel] : [])];
	const risk = risks.reduce((left, right) => CHANGE_RISK_LEVELS.indexOf(right) > CHANGE_RISK_LEVELS.indexOf(left) ? right : left);
	const surface: PublicSurfaceContract = {
		...original,
		kind: `project_rule:${matching.map((rule) => rule.id).join(',')}`,
		riskLevel: risk,
		validationReasons: [...new Set([...(original.kind === 'unclassified_path' ? [] : original.validationReasons), ...matching.flatMap((rule) => rule.reasons)])].sort(),
		driftChecks: [...original.driftChecks, ...matching.map((rule) => `project classification rule: ${rule.id}`)],
	};
	return { ...classification, surface };
}
