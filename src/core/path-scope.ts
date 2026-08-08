export type PathScopeKind = 'literal' | 'subtree';

export type PathScopeParseErrorCode =
	| 'path_scope_empty'
	| 'path_scope_absolute'
	| 'path_scope_traversal'
	| 'path_scope_unsupported_pattern';

export interface PathScope {
	readonly kind: PathScopeKind;
	readonly root: string;
	readonly expression: string;
}

export interface PathScopeComparisonOptions {
	readonly caseSensitive?: boolean;
}

export class PathScopeParseError extends Error {
	readonly code: PathScopeParseErrorCode;
	readonly input: string;

	constructor(code: PathScopeParseErrorCode, input: string) {
		super(`${code}:${input}`);
		this.name = 'PathScopeParseError';
		this.code = code;
		this.input = input;
	}
}

function defaultCaseSensitive(): boolean {
	return process.platform !== 'win32';
}

function comparisonKey(value: string, options: PathScopeComparisonOptions): string {
	return (options.caseSensitive ?? defaultCaseSensitive()) ? value : value.toLowerCase();
}

function rejectAbsolutePath(input: string, normalized: string): void {
	if (normalized.startsWith('/') || /^[A-Za-z]:/u.test(normalized) || normalized.startsWith('//')) {
		throw new PathScopeParseError('path_scope_absolute', input);
	}
}

function normalizeScopeExpression(input: string): string {
	if (input.length === 0 || input.includes('\0')) {
		throw new PathScopeParseError('path_scope_empty', input);
	}

	const slashNormalized = input.replaceAll('\\', '/');
	rejectAbsolutePath(input, slashNormalized);
	const withoutLeadingDot = slashNormalized.replace(/^(?:\.\/)+/u, '');
	const withoutTrailingSlash = withoutLeadingDot.replace(/\/+$/u, '');
	if (withoutTrailingSlash.length === 0 || withoutTrailingSlash === '.') {
		throw new PathScopeParseError('path_scope_empty', input);
	}

	const segments = withoutTrailingSlash.split('/');
	if (segments.some((segment) => segment === '..')) {
		throw new PathScopeParseError('path_scope_traversal', input);
	}
	if (segments.some((segment) => segment.length === 0 || segment === '.')) {
		throw new PathScopeParseError('path_scope_unsupported_pattern', input);
	}

	return withoutTrailingSlash;
}

export function parsePathScope(input: string): PathScope {
	const expression = normalizeScopeExpression(input);
	const subtree = expression.endsWith('/**');
	const root = subtree ? expression.slice(0, -3) : expression;
	if (root.length === 0) {
		throw new PathScopeParseError('path_scope_empty', input);
	}
	if (/[*?\[\]{}]/u.test(root) || (!subtree && expression.includes('*'))) {
		throw new PathScopeParseError('path_scope_unsupported_pattern', input);
	}

	return {
		kind: subtree ? 'subtree' : 'literal',
		root,
		expression: subtree ? `${root}/**` : root,
	};
}

function sameOrDescendant(candidate: string, root: string, options: PathScopeComparisonOptions): boolean {
	const candidateKey = comparisonKey(candidate, options);
	const rootKey = comparisonKey(root, options);
	return candidateKey === rootKey || candidateKey.startsWith(`${rootKey}/`);
}

export function pathScopeContainsPath(
	scope: PathScope,
	candidatePath: string,
	options: PathScopeComparisonOptions = {},
): boolean {
	const candidate = parsePathScope(candidatePath);
	if (candidate.kind !== 'literal') {
		throw new PathScopeParseError('path_scope_unsupported_pattern', candidatePath);
	}

	return scope.kind === 'literal'
		? comparisonKey(scope.root, options) === comparisonKey(candidate.root, options)
		: sameOrDescendant(candidate.root, scope.root, options);
}

export function pathScopesIntersect(
	left: PathScope,
	right: PathScope,
	options: PathScopeComparisonOptions = {},
): boolean {
	if (left.kind === 'literal' && right.kind === 'literal') {
		return comparisonKey(left.root, options) === comparisonKey(right.root, options);
	}
	if (left.kind === 'subtree' && right.kind === 'literal') {
		return sameOrDescendant(right.root, left.root, options);
	}
	if (left.kind === 'literal' && right.kind === 'subtree') {
		return sameOrDescendant(left.root, right.root, options);
	}

	return sameOrDescendant(left.root, right.root, options) || sameOrDescendant(right.root, left.root, options);
}
