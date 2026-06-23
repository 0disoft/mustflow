import { spawnSync } from 'node:child_process';
import path from 'node:path';

export type ScriptPackSuggestionPhase = 'before_change' | 'during_change' | 'after_change' | 'review';
export type ScriptPackSuggestionRiskLevel = 'low' | 'medium' | 'high';
export type ScriptPackSuggestionCost = 'low' | 'medium' | 'high';

export type ScriptPackSurface =
	| 'config'
	| 'docs'
	| 'generated'
	| 'package'
	| 'schema'
	| 'skill'
	| 'source'
	| 'template'
	| 'test'
	| 'unknown';

export type ScriptPackSuggestionStatus = 'suggested' | 'empty' | 'partial';

const CODE_NAVIGATION_SCRIPT_REFS = new Set(['code/outline', 'code/symbol-read']);

export interface ScriptPackSuggestionScript {
	readonly ref: string;
	readonly usage: string;
	readonly phases: readonly ScriptPackSuggestionPhase[];
	readonly inputs: readonly string[];
	readonly outputs: readonly string[];
	readonly useWhen: readonly string[];
	readonly relatedSkills: readonly string[];
	readonly readOnly: boolean;
	readonly mutates: boolean;
	readonly network: boolean;
	readonly riskLevel: ScriptPackSuggestionRiskLevel;
	readonly cost: ScriptPackSuggestionCost;
	readonly reportSchemaFile: string | null;
}

export interface CreateScriptPackSuggestionReportOptions {
	readonly changed: boolean;
	readonly phases: readonly ScriptPackSuggestionPhase[];
	readonly skills: readonly string[];
	readonly paths: readonly string[];
	readonly scripts: readonly ScriptPackSuggestionScript[];
}

export interface ScriptPackSuggestionInput {
	readonly phases: readonly ScriptPackSuggestionPhase[];
	readonly skills: readonly string[];
	readonly paths: readonly string[];
	readonly changed: boolean;
}

export interface ScriptPackSuggestionPath {
	readonly path: string;
	readonly surfaces: readonly ScriptPackSurface[];
}

export interface ScriptPackSuggestion {
	readonly script_ref: string;
	readonly score: number;
	readonly confidence: 'low' | 'medium' | 'high';
	readonly usage: string;
	readonly phases: readonly ScriptPackSuggestionPhase[];
	readonly matched_phases: readonly ScriptPackSuggestionPhase[];
	readonly matched_skills: readonly string[];
	readonly matched_surfaces: readonly ScriptPackSurface[];
	readonly reasons: readonly string[];
	readonly read_only: boolean;
	readonly mutates: boolean;
	readonly network: boolean;
	readonly risk_level: ScriptPackSuggestionRiskLevel;
	readonly cost: ScriptPackSuggestionCost;
	readonly report_schema_file: string | null;
	readonly run_hint: string;
}

export interface ScriptPackSuggestionReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly action: 'suggest';
	readonly status: ScriptPackSuggestionStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: ScriptPackSuggestionInput;
	readonly analyzed_paths: readonly ScriptPackSuggestionPath[];
	readonly suggestions: readonly ScriptPackSuggestion[];
	readonly issues: readonly string[];
}

export function isScriptPackSuggestionPhase(value: string): value is ScriptPackSuggestionPhase {
	return ['before_change', 'during_change', 'after_change', 'review'].includes(value);
}

function uniqueSortedStrings(values: Iterable<string>): string[] {
	return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function uniqueSortedPhases(values: Iterable<ScriptPackSuggestionPhase>): ScriptPackSuggestionPhase[] {
	return uniqueSortedStrings(values) as ScriptPackSuggestionPhase[];
}

function uniqueSortedSurfaces(values: Iterable<ScriptPackSurface>): ScriptPackSurface[] {
	return uniqueSortedStrings(values) as ScriptPackSurface[];
}

function quoteCliArg(value: string): string {
	return /^[A-Za-z0-9_./:@=-]+$/u.test(value) ? value : JSON.stringify(value);
}

function normalizeReportPath(mustflowRoot: string, value: string): string {
	const absolute = path.resolve(mustflowRoot, value);
	const relative = path.relative(mustflowRoot, absolute);
	return relative.startsWith('..') || path.isAbsolute(relative)
		? value.replace(/\\/gu, '/')
		: (relative.replace(/\\/gu, '/') || '.');
}

export function classifyScriptPackPathSurface(relativePath: string): readonly ScriptPackSurface[] {
	const normalized = relativePath.replace(/\\/gu, '/').replace(/^\.\/+/u, '');
	const surfaces: ScriptPackSurface[] = [];

	if (
		normalized === 'REPO_MAP.md' ||
		normalized === '.mustflow/config/manifest.lock.toml' ||
		normalized.startsWith('dist/') ||
		normalized.startsWith('build/') ||
		normalized.startsWith('coverage/') ||
		normalized.startsWith('.mustflow/cache/') ||
		normalized.startsWith('.mustflow/state/')
	) {
		surfaces.push('generated');
	}

	if (normalized.startsWith('.mustflow/config/') || normalized.startsWith('config/')) {
		surfaces.push('config');
	}
	if (normalized.startsWith('.mustflow/skills/') || normalized.includes('/.mustflow/skills/')) {
		surfaces.push('skill');
	}
	if (normalized.startsWith('templates/')) {
		surfaces.push('template');
	}
	if (normalized.startsWith('schemas/') || normalized.endsWith('.schema.json')) {
		surfaces.push('schema');
	}
	if (
		normalized === 'README.md' ||
		normalized === 'CHANGELOG.md' ||
		normalized.endsWith('.md') ||
		normalized.startsWith('docs/') ||
		normalized.startsWith('docs-site/')
	) {
		surfaces.push('docs');
	}
	if (normalized.startsWith('tests/') || normalized.endsWith('.test.js') || normalized.endsWith('.test.ts')) {
		surfaces.push('test');
	}
	if (
		normalized === 'package.json' ||
		normalized === 'bun.lock' ||
		normalized === 'package-lock.json' ||
		normalized.startsWith('.github/workflows/')
	) {
		surfaces.push('package');
	}
	if (
		normalized.startsWith('src/') ||
		/\.(?:cjs|js|jsx|mjs|ts|tsx)$/u.test(normalized)
	) {
		surfaces.push('source');
	}

	return surfaces.length > 0 ? uniqueSortedSurfaces(surfaces) : ['unknown'];
}

function readChangedPaths(mustflowRoot: string, issues: string[]): readonly string[] {
	const result = spawnSync('git', ['status', '--short'], {
		cwd: mustflowRoot,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});

	if (result.status !== 0) {
		const detail = result.stderr.trim() || result.stdout.trim() || `git status exited with ${result.status}`;
		issues.push(`Could not read changed paths: ${detail}`);
		return [];
	}

	return result.stdout
		.split(/\r?\n/u)
		.map((line) => line.trimEnd())
		.filter((line) => line.length > 0)
		.map((line) => {
			const renamed = /\s->\s(?<target>.+)$/u.exec(line);
			return renamed?.groups?.target ?? line.slice(3).trim();
		})
		.filter((entry) => entry.length > 0);
}

function surfacesForScript(script: ScriptPackSuggestionScript): readonly ScriptPackSurface[] {
	const surfaces = new Set<ScriptPackSurface>();
	const searchable = [
		script.ref,
		script.usage,
		...script.useWhen,
		...script.inputs,
		...script.outputs,
		...script.relatedSkills,
	].join(' ');

	const addIf = (surface: ScriptPackSurface, pattern: RegExp): void => {
		if (pattern.test(searchable)) {
			surfaces.add(surface);
		}
	};

	addIf('docs', /docs|readme|release|copy|text|prompt/u);
	addIf('schema', /json|schema|contract/u);
	addIf('template', /template|install|manifest/u);
	addIf('skill', /skill|workflow/u);
	addIf('generated', /generated|protected|vendor|cache|boundary/u);
	addIf('config', /config|command/u);
	addIf('package', /package|release/u);
	addIf('source', /code|source|symbol/u);

	return uniqueSortedSurfaces(surfaces);
}

function confidenceForScore(score: number): 'low' | 'medium' | 'high' {
	if (score >= 7) {
		return 'high';
	}
	if (score >= 4) {
		return 'medium';
	}
	return 'low';
}

function pathsWithSurface(
	analyzedPaths: readonly ScriptPackSuggestionPath[],
	surface: ScriptPackSurface,
): readonly string[] {
	return analyzedPaths.filter((entry) => entry.surfaces.includes(surface)).map((entry) => entry.path);
}

function hasPathWithSurface(
	analyzedPaths: readonly ScriptPackSuggestionPath[],
	surface: ScriptPackSurface,
): boolean {
	return analyzedPaths.some((entry) => entry.surfaces.includes(surface));
}

function firstAvailablePath(
	analyzedPaths: readonly ScriptPackSuggestionPath[],
	preferredSurfaces: readonly ScriptPackSurface[],
): string | null {
	for (const surface of preferredSurfaces) {
		const [candidate] = pathsWithSurface(analyzedPaths, surface);
		if (candidate) {
			return candidate;
		}
	}
	return analyzedPaths[0]?.path ?? null;
}

function createConcretePathHint(commandPrefix: string, paths: readonly string[], fallbackUsage: string): string {
	if (paths.length === 0) {
		return fallbackUsage;
	}
	return `${commandPrefix} ${paths.map(quoteCliArg).join(' ')} --json`;
}

function createRunHint(
	script: ScriptPackSuggestionScript,
	analyzedPaths: readonly ScriptPackSuggestionPath[],
): string {
	if (script.ref === 'code/outline') {
		const sourcePaths = pathsWithSurface(analyzedPaths, 'source');
		return createConcretePathHint('mf script-pack run code/outline scan', sourcePaths, script.usage);
	}

	if (script.ref === 'code/symbol-read') {
		const sourcePath = firstAvailablePath(analyzedPaths, ['source']);
		if (sourcePath) {
			return `After code/outline returns a symbol line or anchor, run: mf script-pack run code/symbol-read read ${quoteCliArg(
				sourcePath,
			)} --start-line <line> --json`;
		}
		return 'After code/outline returns a source anchor, run: mf script-pack run code/symbol-read read --anchor <anchor-id> --json';
	}

	if (script.ref === 'core/text-budget') {
		const packageJson = analyzedPaths.find((entry) => entry.path === 'package.json');
		if (packageJson) {
			return 'mf script-pack run core/text-budget check package.json --json-pointer /description --max 80 --json';
		}

		const textPaths = analyzedPaths
			.filter((entry) =>
				entry.surfaces.some((surface) => surface === 'docs' || surface === 'package' || surface === 'schema'),
			)
			.map((entry) => entry.path);
		return createConcretePathHint('mf script-pack run core/text-budget check', textPaths, script.usage);
	}

	if (script.ref === 'repo/generated-boundary') {
		return createConcretePathHint('mf script-pack run repo/generated-boundary check', analyzedPaths.map((entry) => entry.path), script.usage);
	}

	return script.usage;
}

export function createScriptPackSuggestionReport(
	mustflowRoot: string,
	options: CreateScriptPackSuggestionReportOptions,
): ScriptPackSuggestionReport {
	const issues: string[] = [];
	const changedPaths = options.changed ? readChangedPaths(mustflowRoot, issues) : [];
	const inputPaths = uniqueSortedStrings([...options.paths, ...changedPaths].map((value) => normalizeReportPath(mustflowRoot, value)));
	const analyzedPaths = inputPaths.map((entry) => ({ path: entry, surfaces: classifyScriptPackPathSurface(entry) }));
	const requestedSurfaces = new Set(analyzedPaths.flatMap((entry) => entry.surfaces));
	const hasSourcePath = hasPathWithSurface(analyzedPaths, 'source');
	const suggestions = options.scripts
		.map((script): ScriptPackSuggestion | null => {
			if (CODE_NAVIGATION_SCRIPT_REFS.has(script.ref) && inputPaths.length > 0 && !hasSourcePath) {
				return null;
			}

			let score = 0;
			const reasons: string[] = [];
			const matchedPhases = options.phases.filter((phase) => script.phases.includes(phase));
			if (matchedPhases.length > 0) {
				score += matchedPhases.length * 3;
				reasons.push(`Matches requested phase: ${matchedPhases.join(', ')}`);
			}

			const matchedSkills = options.skills.filter((skill) => script.relatedSkills.includes(skill));
			if (matchedSkills.length > 0) {
				score += matchedSkills.length * 4;
				reasons.push(`Matches related skill: ${matchedSkills.join(', ')}`);
			}

			const scriptSurfaces = surfacesForScript(script);
			const matchedSurfaces = scriptSurfaces.filter((surface) => requestedSurfaces.has(surface));
			if (matchedSurfaces.length > 0) {
				score += matchedSurfaces.length * 2;
				reasons.push(`Matches changed surface: ${matchedSurfaces.join(', ')}`);
			}

			if (inputPaths.length > 0 && script.inputs.includes('path')) {
				score += 1;
				reasons.push('Accepts explicit path inputs.');
			}

			if (script.ref === 'code/symbol-read' && inputPaths.length > 0) {
				score = Math.max(1, score - 1);
				reasons.push('Follow-up helper after code/outline identifies a symbol line or source anchor.');
			}

			if (score > 0 && script.readOnly && !script.mutates && !script.network) {
				score += 1;
				reasons.push('Read-only, non-mutating, offline helper.');
			}

			if (score === 0) {
				return null;
			}

			return {
				script_ref: script.ref,
				score,
				confidence: confidenceForScore(score),
				usage: script.usage,
				phases: script.phases,
				matched_phases: uniqueSortedPhases(matchedPhases),
				matched_skills: uniqueSortedStrings(matchedSkills),
				matched_surfaces: uniqueSortedSurfaces(matchedSurfaces),
				reasons,
				read_only: script.readOnly,
				mutates: script.mutates,
				network: script.network,
				risk_level: script.riskLevel,
				cost: script.cost,
				report_schema_file: script.reportSchemaFile,
				run_hint: createRunHint(script, analyzedPaths),
			};
		})
		.filter((suggestion): suggestion is ScriptPackSuggestion => suggestion !== null)
		.sort((left, right) => right.score - left.score || left.script_ref.localeCompare(right.script_ref));

	const status: ScriptPackSuggestionStatus =
		issues.length > 0 ? 'partial' : suggestions.length > 0 ? 'suggested' : 'empty';

	return {
		schema_version: '1',
		command: 'script-pack',
		action: 'suggest',
		status,
		ok: true,
		mustflow_root: mustflowRoot,
		input: {
			phases: uniqueSortedPhases(options.phases),
			skills: uniqueSortedStrings(options.skills),
			paths: inputPaths,
			changed: options.changed,
		},
		analyzed_paths: analyzedPaths,
		suggestions,
		issues,
	};
}
