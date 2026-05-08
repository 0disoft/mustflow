export interface ManagedMarkdownExpectation {
	readonly docId: string;
	readonly authority: string;
	readonly lifecycle: string;
}

export type AuthorityDecisionKind = 'overview' | 'recognized' | 'unrecognized';

export interface AuthorityDecision {
	readonly kind: AuthorityDecisionKind;
	readonly inputPath: string | null;
	readonly decision: string;
	readonly reason: string;
	readonly effectiveAction: string;
	readonly countsAsMustflowVerification: boolean;
	readonly sourceFiles: readonly string[];
	readonly expectation: ManagedMarkdownExpectation | null;
}

const STATIC_MANAGED_MARKDOWN_EXPECTATIONS: Record<string, ManagedMarkdownExpectation> = {
	'AGENTS.md': {
		docId: 'agents.root',
		authority: 'binding',
		lifecycle: 'user-editable',
	},
	'.mustflow/skills/INDEX.md': {
		docId: 'skills.index',
		authority: 'router',
		lifecycle: 'mustflow-owned',
	},
};

function toPosixPath(value: string): string {
	return value.split('\\').join('/');
}

export function getManagedMarkdownExpectation(relativePath: string): ManagedMarkdownExpectation | undefined {
	const normalizedPath = toPosixPath(relativePath);
	const staticExpectation = STATIC_MANAGED_MARKDOWN_EXPECTATIONS[normalizedPath];

	if (staticExpectation) {
		return staticExpectation;
	}

	const docsMatch = /^\.mustflow\/docs\/([^/]+)\.md$/u.exec(normalizedPath);
	if (docsMatch) {
		return {
			docId: `docs.${docsMatch[1]}`,
			authority: 'workflow-policy',
			lifecycle: 'mustflow-owned',
		};
	}

	const contextMatch = /^\.mustflow\/context\/([^/]+)\.md$/u.exec(normalizedPath);
	if (contextMatch) {
		const contextName = contextMatch[1].toLowerCase();

		if (contextName === 'index') {
			return {
				docId: 'context.index',
				authority: 'router',
				lifecycle: 'mustflow-owned',
			};
		}

		return {
			docId: `context.${contextName}`,
			authority: 'contextual',
			lifecycle: 'user-editable',
		};
	}

	const skillMatch = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(normalizedPath);
	if (skillMatch) {
		return {
			docId: `skill.${skillMatch[1]}`,
			authority: 'procedure',
			lifecycle: 'mustflow-owned',
		};
	}

	return undefined;
}

export function formatManagedMarkdownLabel(relativePath: string, expectation: ManagedMarkdownExpectation): string {
	return `${expectation.docId} (${toPosixPath(relativePath)})`;
}

export function explainManagedMarkdownAuthority(relativePath?: string): AuthorityDecision {
	const sourceFiles = [
		'AGENTS.md',
		'.mustflow/docs/agent-workflow.md',
		'.mustflow/config/mustflow.toml',
		'.mustflow/skills/INDEX.md',
	];

	if (!relativePath) {
		return {
			kind: 'overview',
			inputPath: null,
			decision: 'managed Markdown authority is resolved from document path and expected frontmatter',
			reason: 'mustflow keeps repository binding rules, workflow policy, context, and procedures in separate authority lanes.',
			effectiveAction: 'Use the nearest managed document role before deciding whether a file can define rules, context, or procedure steps.',
			countsAsMustflowVerification: false,
			sourceFiles,
			expectation: null,
		};
	}

	const normalizedPath = toPosixPath(relativePath);
	const expectation = getManagedMarkdownExpectation(normalizedPath);

	if (!expectation) {
		return {
			kind: 'unrecognized',
			inputPath: normalizedPath,
			decision: 'no managed Markdown authority expectation applies to this path',
			reason: 'only AGENTS.md and Markdown documents under .mustflow/docs, .mustflow/context, and .mustflow/skills are classified by this authority resolver.',
			effectiveAction: 'Treat the file according to the nearest AGENTS.md and repository command contract instead of granting it mustflow document authority.',
			countsAsMustflowVerification: false,
			sourceFiles,
			expectation: null,
		};
	}

	return {
		kind: 'recognized',
		inputPath: normalizedPath,
		decision: `expected ${expectation.docId} with ${expectation.authority} authority`,
		reason: 'the path matches a managed mustflow document role with a stable identity, authority, and lifecycle.',
		effectiveAction: `Validate frontmatter mustflow_doc="${expectation.docId}", authority="${expectation.authority}", and lifecycle="${expectation.lifecycle}".`,
		countsAsMustflowVerification: false,
		sourceFiles,
		expectation,
	};
}
