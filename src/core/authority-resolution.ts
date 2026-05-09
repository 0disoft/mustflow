export interface ManagedMarkdownExpectation {
	readonly docId: string;
	readonly authority: string;
	readonly lifecycle: string;
}

export interface AuthorityBoundary {
	readonly role: string;
	readonly canDefine: readonly string[];
	readonly cannotDefine: readonly string[];
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
	readonly boundary: AuthorityBoundary;
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

function getAuthorityBoundary(authority: string): AuthorityBoundary {
	switch (authority) {
		case 'binding':
			return {
				role: 'binding repository instruction entry point',
				canDefine: ['repository-local work rules', 'read order', 'delegation to mustflow workflow files'],
				cannotDefine: ['host safety overrides', 'command execution permission outside commands.toml', 'facts that contradict current files'],
			};
		case 'workflow-policy':
			return {
				role: 'shared agent workflow policy',
				canDefine: ['agent operating loop', 'refresh checkpoints', 'verification and reporting policy'],
				cannotDefine: ['executable command permission', 'project product facts', 'host safety overrides'],
			};
		case 'router':
			return {
				role: 'routing index',
				canDefine: ['which context or skill document to read', 'compact routing metadata'],
				cannotDefine: ['procedure steps', 'command permission', 'project policy not owned by the router'],
			};
		case 'contextual':
			return {
				role: 'low-authority project context',
				canDefine: ['supported project facts', 'known unknowns', 'domain conventions'],
				cannotDefine: ['command policy', 'file edit prohibitions', 'facts that override code tests or user instructions'],
			};
		case 'procedure':
			return {
				role: 'repeatable task procedure',
				canDefine: ['task trigger', 'allowed edit scope', 'verification and reporting shape'],
				cannotDefine: ['command execution permission', 'repository-wide binding rules', 'facts outside the procedure scope'],
			};
		default:
			return getUnrecognizedBoundary();
	}
}

function getOverviewBoundary(): AuthorityBoundary {
	return {
		role: 'managed Markdown authority model',
		canDefine: ['document authority lanes', 'expected frontmatter identity', 'which source should answer which class of question'],
		cannotDefine: ['runtime command permission outside commands.toml', 'host safety overrides', 'project facts unsupported by current files'],
	};
}

function getUnrecognizedBoundary(): AuthorityBoundary {
	return {
		role: 'unclassified by mustflow managed Markdown authority',
		canDefine: [],
		cannotDefine: ['mustflow document authority', 'command execution permission', 'workflow policy by path alone'],
	};
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
			boundary: getOverviewBoundary(),
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
			boundary: getUnrecognizedBoundary(),
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
		boundary: getAuthorityBoundary(expectation.authority),
	};
}
