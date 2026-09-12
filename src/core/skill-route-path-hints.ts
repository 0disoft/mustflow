export interface SkillRoutePathHints {
	readonly extensions?: readonly string[];
	readonly basenames?: readonly string[];
	readonly documentation?: boolean;
}

// Compatibility for installed catalogs and route files predating path_hints.
// Current templates declare the same rules explicitly and can override them.
export const LEGACY_SKILL_ROUTE_PATH_HINTS: Readonly<Record<string, SkillRoutePathHints>> = {
	'typescript-code-change': { extensions: ['cts', 'mts', 'ts', 'tsx'], basenames: ['tsconfig.json'] },
	'javascript-code-change': { extensions: ['cjs', 'mjs', 'js', 'jsx'] },
	'python-code-change': { extensions: ['py'], basenames: ['pyproject.toml', 'requirements.txt', 'poetry.lock'] },
	'go-code-change': { extensions: ['go'], basenames: ['go.mod', 'go.sum'] },
	'rust-code-change': { extensions: ['rs'], basenames: ['cargo.toml', 'cargo.lock'] },
	'powershell-code-change': { extensions: ['ps1'] },
	'docs-update': { documentation: true },
};

const DOCUMENT_BASENAMES = new Set([
	'readme', 'changelog', 'contributing', 'security', 'support', 'governance', 'maintainers',
	'releasing', 'release', 'testing', 'deployment', 'operations', 'runbook', 'configuration',
	'troubleshooting', 'architecture', 'api',
]);
const DOCS_TREE = /(?:^|\/)(?:docs|docs-site|documentation|\.mustflow\/docs|\.mustflow\/context)\/.+\.(?:md|mdx)$/u;

export function isSkillRoutePathHints(value: unknown): value is SkillRoutePathHints {
	if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
	const hints = value as Record<string, unknown>;
	if (Object.keys(hints).some(key => !['extensions', 'basenames', 'documentation'].includes(key))) return false;
	for (const key of ['extensions', 'basenames']) {
		const values = hints[key];
		if (values === undefined) continue;
		if (!Array.isArray(values) || new Set(values).size !== values.length ||
			values.some(item => typeof item !== 'string' || !(key === 'extensions'
				? /^[a-z0-9]+$/u.test(item)
				: /^[a-z0-9][a-z0-9._-]*$/u.test(item)))) return false;
	}
	return hints.documentation === undefined || typeof hints.documentation === 'boolean';
}

export function matchesSkillRoutePathHints(hints: SkillRoutePathHints, paths: readonly string[]): boolean {
	return paths.some(value => {
		const normalized = value.replace(/\\/gu, '/').toLowerCase();
		const basename = normalized.split('/').pop() ?? '';
		const dot = basename.lastIndexOf('.');
		const extension = dot < 0 ? '' : basename.slice(dot + 1);
		return (hints.extensions ?? []).includes(extension) ||
			(hints.basenames ?? []).includes(basename) ||
			(hints.documentation === true && (
				DOCS_TREE.test(normalized) ||
				(basename.endsWith('.md') && DOCUMENT_BASENAMES.has(basename.slice(0, -3)))
			));
	});
}
