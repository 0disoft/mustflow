import { existsSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import {
	isRecord,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';
import { evaluateCommandIntentEligibility } from './command-intent-eligibility.js';

export const COMMAND_PRECONDITION_KINDS = new Set(['path_exists', 'artifact_freshness']);

export type CommandPreconditionKind = 'path_exists' | 'artifact_freshness';
export type CommandPreconditionStatus = 'satisfied' | 'missing' | 'stale' | 'unknown' | 'invalid';

export interface CommandPreconditionSatisfyIntent {
	readonly intent: string;
	readonly declared: boolean;
	readonly runnable: boolean;
	readonly status: string | null;
	readonly lifecycle: string | null;
	readonly runPolicy: string | null;
	readonly detail: string | null;
}

export interface CommandPreconditionPlan {
	readonly kind: string;
	readonly label: string | null;
	readonly status: CommandPreconditionStatus;
	readonly detail: string;
	readonly path: string | null;
	readonly artifact: string | null;
	readonly sources: readonly string[];
	readonly newestSource: string | null;
	readonly satisfyIntent: CommandPreconditionSatisfyIntent | null;
}

interface CommandPreconditionDeclaration {
	readonly kind: string;
	readonly label: string | null;
	readonly path: string | null;
	readonly artifact: string | null;
	readonly sources: readonly string[];
	readonly satisfyIntent: string | null;
}

interface CommandPreconditionEvaluationContext {
	projectFiles: readonly string[] | null;
}

const IGNORED_WALK_DIRECTORIES = new Set([
	'.git',
	'node_modules',
	'dist',
	'coverage',
	'.next',
	'.turbo',
	'.mustflow/state',
	'.mustflow/cache',
]);

function normalizeRelativePath(value: string): string {
	return value.trim().replace(/\\/gu, '/').replace(/^\.\/+/u, '').replace(/\/+$/u, '') || '.';
}

function relativePathIsUnsafe(value: string): boolean {
	const normalized = normalizeRelativePath(value);
	const segments = normalized.split('/').filter((segment) => segment.length > 0);

	return (
		normalized.length === 0 ||
		normalized.includes('\0') ||
		normalized.startsWith('/') ||
		path.win32.isAbsolute(value) ||
		path.posix.isAbsolute(value) ||
		segments.some((segment) => segment === '.' || segment === '..')
	);
}

function resolveProjectPath(projectRoot: string, relativePath: string): string | null {
	if (relativePathIsUnsafe(relativePath)) {
		return null;
	}

	const resolved = path.resolve(projectRoot, ...normalizeRelativePath(relativePath).split('/'));
	const relative = path.relative(path.resolve(projectRoot), resolved);

	return relative.startsWith('..') || path.isAbsolute(relative) ? null : resolved;
}

function readPreconditionDeclarations(intent: TomlTable): readonly CommandPreconditionDeclaration[] {
	if (!Array.isArray(intent.preconditions)) {
		return [];
	}

	return intent.preconditions.filter(isRecord).map((precondition) => ({
		kind: readString(precondition, 'kind') ?? '',
		label: readString(precondition, 'label') ?? null,
		path: readString(precondition, 'path') ? normalizeRelativePath(readString(precondition, 'path') as string) : null,
		artifact: readString(precondition, 'artifact') ? normalizeRelativePath(readString(precondition, 'artifact') as string) : null,
		sources: readStringArray(precondition, 'sources')?.map(normalizeRelativePath) ?? [],
		satisfyIntent: readString(precondition, 'satisfy_intent') ?? null,
	}));
}

function createSatisfyIntentSummary(
	contract: CommandContract,
	intentName: string | null,
): CommandPreconditionSatisfyIntent | null {
	if (!intentName) {
		return null;
	}

	const rawIntent = contract.intents[intentName];
	const eligibility = evaluateCommandIntentEligibility(intentName, rawIntent);

	return {
		intent: intentName,
		declared: isRecord(rawIntent),
		runnable: eligibility.ok,
		status: isRecord(rawIntent) ? readString(rawIntent, 'status') ?? null : null,
		lifecycle: isRecord(rawIntent) ? readString(rawIntent, 'lifecycle') ?? null : null,
		runPolicy: isRecord(rawIntent) ? readString(rawIntent, 'run_policy') ?? null : null,
		detail: eligibility.detail,
	};
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
}

function globToRegExp(pattern: string): RegExp {
	let expression = '^';

	for (let index = 0; index < pattern.length; index += 1) {
		const character = pattern[index];
		const next = pattern[index + 1];

		if (character === '*' && next === '*') {
			expression += '.*';
			index += 1;
			continue;
		}

		if (character === '*') {
			expression += '[^/]*';
			continue;
		}

		expression += escapeRegExp(character);
	}

	return new RegExp(`${expression}$`, 'u');
}

function shouldSkipDirectory(relativePath: string): boolean {
	const normalized = normalizeRelativePath(relativePath);

	return IGNORED_WALK_DIRECTORIES.has(normalized) || normalized.startsWith('.mustflow/state/') || normalized.startsWith('.mustflow/cache/');
}

function listProjectFiles(projectRoot: string): readonly string[] {
	const files: string[] = [];

	function walk(directory: string): void {
		for (const entry of readdirSync(directory, { withFileTypes: true })) {
			const absolute = path.join(directory, entry.name);
			const relative = normalizeRelativePath(path.relative(projectRoot, absolute));

			if (entry.isDirectory()) {
				if (!shouldSkipDirectory(relative)) {
					walk(absolute);
				}
				continue;
			}

			if (entry.isFile()) {
				files.push(relative);
			}
		}
	}

	walk(projectRoot);
	return files.sort((left, right) => left.localeCompare(right));
}

function matchingSourceFiles(
	projectRoot: string,
	patterns: readonly string[],
	context: CommandPreconditionEvaluationContext,
): readonly string[] {
	const safePatterns = patterns.filter((pattern) => !relativePathIsUnsafe(pattern));
	const matchers = safePatterns.map(globToRegExp);

	if (matchers.length === 0) {
		return [];
	}

	context.projectFiles ??= listProjectFiles(projectRoot);
	return context.projectFiles.filter((filePath) => matchers.some((matcher) => matcher.test(filePath)));
}

function evaluatePathExists(
	projectRoot: string,
	declaration: CommandPreconditionDeclaration,
	satisfyIntent: CommandPreconditionSatisfyIntent | null,
): CommandPreconditionPlan {
	const pathValue = declaration.path;

	if (!pathValue) {
		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'invalid',
			detail: 'path_exists precondition requires path.',
			path: null,
			artifact: null,
			sources: [],
			newestSource: null,
			satisfyIntent,
		};
	}

	const resolvedPath = resolveProjectPath(projectRoot, pathValue);
	if (!resolvedPath) {
		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'invalid',
			detail: `path "${pathValue}" must stay inside the project root.`,
			path: pathValue,
			artifact: null,
			sources: [],
			newestSource: null,
			satisfyIntent,
		};
	}

	const exists = existsSync(resolvedPath);
	return {
		kind: declaration.kind,
		label: declaration.label,
		status: exists ? 'satisfied' : 'missing',
		detail: exists ? `path "${pathValue}" exists.` : `path "${pathValue}" is missing.`,
		path: pathValue,
		artifact: null,
		sources: [],
		newestSource: null,
		satisfyIntent,
	};
}

function evaluateArtifactFreshness(
	projectRoot: string,
	declaration: CommandPreconditionDeclaration,
	satisfyIntent: CommandPreconditionSatisfyIntent | null,
	context: CommandPreconditionEvaluationContext,
): CommandPreconditionPlan {
	const artifact = declaration.artifact;

	if (!artifact || declaration.sources.length === 0) {
		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'invalid',
			detail: 'artifact_freshness precondition requires artifact and sources.',
			path: null,
			artifact,
			sources: declaration.sources,
			newestSource: null,
			satisfyIntent,
		};
	}

	const artifactPath = resolveProjectPath(projectRoot, artifact);
	if (!artifactPath) {
		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'invalid',
			detail: `artifact "${artifact}" must stay inside the project root.`,
			path: null,
			artifact,
			sources: declaration.sources,
			newestSource: null,
			satisfyIntent,
		};
	}

	if (!existsSync(artifactPath)) {
		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'missing',
			detail: `artifact "${artifact}" is missing.`,
			path: null,
			artifact,
			sources: declaration.sources,
			newestSource: null,
			satisfyIntent,
		};
	}

	const sourceFiles = matchingSourceFiles(projectRoot, declaration.sources, context);
	if (sourceFiles.length === 0) {
		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'unknown',
			detail: 'no source files matched the freshness precondition.',
			path: null,
			artifact,
			sources: declaration.sources,
			newestSource: null,
			satisfyIntent,
		};
	}

	const artifactMtime = statSync(artifactPath).mtimeMs;
	let newest: { source: string; mtime: number } | null = null;

	for (const source of sourceFiles) {
		const mtime = statSync(path.join(projectRoot, ...source.split('/'))).mtimeMs;
		if (!newest || mtime > newest.mtime) {
			newest = { source, mtime };
		}
	}

	if (!newest) {
		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'unknown',
			detail: 'no readable source files matched the freshness precondition.',
			path: null,
			artifact,
			sources: declaration.sources,
			newestSource: null,
			satisfyIntent,
		};
	}

	const stale = newest.mtime > artifactMtime;

	return {
		kind: declaration.kind,
		label: declaration.label,
		status: stale ? 'stale' : 'satisfied',
		detail: stale
			? `artifact "${artifact}" is older than source "${newest.source}".`
			: `artifact "${artifact}" is at least as new as ${sourceFiles.length} matched source file(s).`,
		path: null,
		artifact,
		sources: declaration.sources,
		newestSource: newest.source,
		satisfyIntent,
	};
}

export function evaluateCommandPreconditions(
	projectRoot: string,
	contract: CommandContract,
	intentName: string,
): readonly CommandPreconditionPlan[] {
	const intent = contract.intents[intentName];
	if (!isRecord(intent)) {
		return [];
	}

	const context: CommandPreconditionEvaluationContext = { projectFiles: null };

	return readPreconditionDeclarations(intent).map((declaration) => {
		const satisfyIntent = createSatisfyIntentSummary(contract, declaration.satisfyIntent);

		if (declaration.kind === 'path_exists') {
			return evaluatePathExists(projectRoot, declaration, satisfyIntent);
		}

		if (declaration.kind === 'artifact_freshness') {
			return evaluateArtifactFreshness(projectRoot, declaration, satisfyIntent, context);
		}

		return {
			kind: declaration.kind,
			label: declaration.label,
			status: 'invalid',
			detail: `unknown precondition kind "${declaration.kind}".`,
			path: declaration.path,
			artifact: declaration.artifact,
			sources: declaration.sources,
			newestSource: null,
			satisfyIntent,
		};
	});
}
