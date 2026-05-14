export type DocReviewPriority = 'P0' | 'P1' | 'P2';

export type DocReviewTriageReason =
	| 'release_contract'
	| 'authority_or_security_skill'
	| 'default_template_source'
	| 'english_command_doc'
	| 'user_visible_doc'
	| 'translation_review_debt'
	| 'test_fixture';

export interface DocReviewTriageInput {
	readonly path: string;
	readonly status: string;
	readonly origin?: string;
	readonly reason?: string;
}

export interface DocReviewTriage {
	readonly review_priority: DocReviewPriority;
	readonly release_blocking: boolean;
	readonly triage_reason: DocReviewTriageReason;
}

const P0_EXACT_PATHS = new Set([
	'README.md',
	'CHANGELOG.md',
	'AGENTS.md',
	'.mustflow/docs/agent-workflow.md',
	'.mustflow/skills/INDEX.md',
]);

const AUTHORITY_OR_SECURITY_SKILLS = new Set([
	'contract-sync-check',
	'external-prompt-injection-defense',
	'external-skill-intake',
	'instruction-conflict-scope-check',
	'migration-safety-check',
	'multi-agent-work-coordination',
	'requirement-regression-guard',
	'security-privacy-review',
	'security-regression-tests',
	'test-maintenance',
]);

function normalizePath(value: string): string {
	return value.replace(/\\/g, '/').replace(/^\.\//u, '');
}

function isDefaultTemplateEnglishSource(path: string): boolean {
	return path.startsWith('templates/default/locales/en/') || path.startsWith('templates/default/common/');
}

function isEnglishCommandDoc(path: string): boolean {
	return /^docs-site\/src\/content\/docs\/en\/commands\/[^/]+\.md$/u.test(path);
}

function isAuthorityOrSecuritySkill(path: string): boolean {
	const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(path);
	return Boolean(match && AUTHORITY_OR_SECURITY_SKILLS.has(match[1]));
}

function isTranslationReviewDebt(input: DocReviewTriageInput, path: string): boolean {
	if (
		/^docs-site\/src\/content\/docs\/(?!en\/)[^/]+\//u.test(path) ||
		/^templates\/default\/locales\/(?!en\/)[^/]+\//u.test(path)
	) {
		return true;
	}

	const text = `${input.origin ?? ''} ${input.reason ?? ''}`.toLowerCase();
	return text.includes('translation') || text.includes('stale') || text.includes('needs_review');
}

function isTestFixture(path: string): boolean {
	return path.startsWith('tests/fixtures/') || path.includes('/fixtures/') || path.includes('/__fixtures__/');
}

export function triageDocReview(input: DocReviewTriageInput): DocReviewTriage {
	const path = normalizePath(input.path);

	if (P0_EXACT_PATHS.has(path)) {
		return {
			review_priority: 'P0',
			release_blocking: input.status !== 'approved',
			triage_reason: 'release_contract',
		};
	}

	if (isAuthorityOrSecuritySkill(path)) {
		return {
			review_priority: 'P0',
			release_blocking: input.status !== 'approved',
			triage_reason: 'authority_or_security_skill',
		};
	}

	if (isDefaultTemplateEnglishSource(path)) {
		return {
			review_priority: 'P0',
			release_blocking: input.status !== 'approved',
			triage_reason: 'default_template_source',
		};
	}

	if (isEnglishCommandDoc(path)) {
		return {
			review_priority: 'P0',
			release_blocking: input.status !== 'approved',
			triage_reason: 'english_command_doc',
		};
	}

	if (isTestFixture(path)) {
		return {
			review_priority: 'P2',
			release_blocking: false,
			triage_reason: 'test_fixture',
		};
	}

	if (isTranslationReviewDebt(input, path)) {
		return {
			review_priority: 'P2',
			release_blocking: false,
			triage_reason: 'translation_review_debt',
		};
	}

	return {
		review_priority: 'P1',
		release_blocking: false,
		triage_reason: 'user_visible_doc',
	};
}
