import path from 'node:path';

import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import { writeUtf8FileInsideWithoutSymlinks } from '../lib/filesystem.js';
import { isRecord, type TomlTable } from '../lib/command-contract.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { readMustflowTomlFile } from '../lib/toml.js';
import {
	createTechnologyPreferenceId,
	normalizeTechnologyKey,
	normalizeTechnologyName,
	normalizeTechnologyPreferencesTable,
	serializeTechnologyPreferences,
	technologyConfigExists,
	technologyPreferenceMatches,
	TECHNOLOGY_AUTHORITY,
	TECHNOLOGY_CONFIG_RELATIVE_PATH,
	TECHNOLOGY_GUIDANCE,
	TECHNOLOGY_KINDS,
	TECHNOLOGY_STATUSES,
	type TechnologyKind,
	type TechnologyPreference,
	type TechnologyPreferencesFile,
	type TechnologyStatus,
} from '../../core/technology-preferences.js';

const TECH_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--scope', kind: 'string' },
	{ name: '--kind', kind: 'string' },
	{ name: '--status', kind: 'string' },
	{ name: '--ecosystem', kind: 'string' },
	{ name: '--package', kind: 'string' },
	{ name: '--why', kind: 'string' },
	{ name: '--constraint', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedTechOptions {
	readonly action: 'list' | 'add' | 'remove' | 'suggest';
	readonly positionals: readonly string[];
	readonly json: boolean;
	readonly scope: readonly string[];
	readonly kind: string | null;
	readonly status: string | null;
	readonly ecosystem: string | null;
	readonly packages: readonly string[];
	readonly why: string | null;
	readonly constraints: readonly string[];
	readonly error?: string;
}

function getRepeatedStringOptions(
	occurrences: readonly { readonly name: string; readonly value: boolean | string }[],
	name: string,
): readonly string[] {
	return occurrences
		.filter((occurrence) => occurrence.name === name && typeof occurrence.value === 'string')
		.map((occurrence) => String(occurrence.value).trim())
		.filter((value) => value.length > 0);
}

function isTechnologyKind(value: string | null): value is TechnologyKind {
	return value !== null && (TECHNOLOGY_KINDS as readonly string[]).includes(value);
}

function isTechnologyStatus(value: string | null): value is TechnologyStatus {
	return value !== null && (TECHNOLOGY_STATUSES as readonly string[]).includes(value);
}

export function getTechHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf tech <list|add|remove|suggest> [options]',
			summary: 'Manage low-authority technology preferences for agents.',
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '--scope <scope>', description: 'Filter or tag a project area such as frontend, backend, ui, data, or cli' },
				{ label: '--kind <kind>', description: `Technology kind: ${TECHNOLOGY_KINDS.join(', ')}` },
				{ label: '--status <status>', description: `Preference status: ${TECHNOLOGY_STATUSES.join(', ')}` },
				{ label: '--ecosystem <ecosystem>', description: 'Package ecosystem or platform, such as npm, cargo, pip, go, or deno' },
				{ label: '--package <package>', description: 'Package name to associate with the preference. Repeatable.' },
				{ label: '--why <text>', description: 'Short rationale for the preference' },
				{ label: '--constraint <text>', description: 'Guardrail agents must keep in mind. Repeatable.' },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf tech list',
				'mf tech add framework nextjs --scope frontend --ecosystem npm --package next --package react --why "Preferred React app framework"',
				'mf tech add language rust --scope backend --status preferred --why "Use for correctness-critical engines"',
				'mf tech add library jquery --scope frontend --status avoid --why "Avoid new usage"',
				'mf tech suggest --scope frontend',
				'mf tech remove framework.frontend.nextjs',
			],
			exitCodes: [
				{ label: '0', description: 'Technology preferences were inspected or updated' },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function parseTechOptions(args: readonly string[], lang: CliLang): ParsedTechOptions {
	const [actionToken, ...rest] = args;
	const action = actionToken as ParsedTechOptions['action'] | undefined;

	if (action !== 'list' && action !== 'add' && action !== 'remove' && action !== 'suggest') {
		return {
			action: 'list',
			positionals: [],
			json: false,
			scope: [],
			kind: null,
			status: null,
			ecosystem: null,
			packages: [],
			why: null,
			constraints: [],
			error: actionToken ? `Unknown tech action: ${actionToken}` : 'Specify a tech action: list, add, remove, or suggest',
		};
	}

	const parsed = parseCliOptions(rest, TECH_OPTIONS, { allowPositionals: true });
	if (parsed.error) {
		return {
			action,
			positionals: parsed.positionals,
			json: hasParsedCliOption(parsed, '--json'),
			scope: [],
			kind: null,
			status: null,
			ecosystem: null,
			packages: [],
			why: null,
			constraints: [],
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	const kind = getParsedCliStringOption(parsed, '--kind');
	const status = getParsedCliStringOption(parsed, '--status');

	if (kind !== null && !isTechnologyKind(kind)) {
		return invalidParsed(action, parsed.positionals, hasParsedCliOption(parsed, '--json'), `Unsupported technology kind: ${kind}`);
	}

	if (status !== null && !isTechnologyStatus(status)) {
		return invalidParsed(action, parsed.positionals, hasParsedCliOption(parsed, '--json'), `Unsupported technology status: ${status}`);
	}

	return {
		action,
		positionals: parsed.positionals,
		json: hasParsedCliOption(parsed, '--json'),
		scope: getRepeatedStringOptions(parsed.occurrences, '--scope'),
		kind,
		status,
		ecosystem: getParsedCliStringOption(parsed, '--ecosystem'),
		packages: getRepeatedStringOptions(parsed.occurrences, '--package'),
		why: getParsedCliStringOption(parsed, '--why'),
		constraints: getRepeatedStringOptions(parsed.occurrences, '--constraint'),
	};
}

function invalidParsed(
	action: ParsedTechOptions['action'],
	positionals: readonly string[],
	json: boolean,
	error: string,
): ParsedTechOptions {
	return {
		action,
		positionals,
		json,
		scope: [],
		kind: null,
		status: null,
		ecosystem: null,
		packages: [],
		why: null,
		constraints: [],
		error,
	};
}

function readTechnologyPreferences(projectRoot: string): TechnologyPreferencesFile {
	if (!technologyConfigExists(projectRoot)) {
		return normalizeTechnologyPreferencesTable(undefined, false);
	}

	const parsed = readMustflowTomlFile(projectRoot, TECHNOLOGY_CONFIG_RELATIVE_PATH);
	if (!isRecord(parsed)) {
		return {
			...normalizeTechnologyPreferencesTable(undefined, true),
			issues: [`${TECHNOLOGY_CONFIG_RELATIVE_PATH} must contain a TOML table`],
		};
	}

	return normalizeTechnologyPreferencesTable(parsed as TomlTable, true);
}

function writeTechnologyPreferences(projectRoot: string, preferences: readonly TechnologyPreference[]): void {
	const targetPath = path.join(projectRoot, ...TECHNOLOGY_CONFIG_RELATIVE_PATH.split('/'));
	writeUtf8FileInsideWithoutSymlinks(projectRoot, targetPath, serializeTechnologyPreferences(preferences));
}

function renderPreference(preference: TechnologyPreference): string[] {
	const details = [
		preference.scope.length > 0 ? `scope: ${preference.scope.join(', ')}` : null,
		preference.ecosystem ? `ecosystem: ${preference.ecosystem}` : null,
		preference.packages.length > 0 ? `packages: ${preference.packages.join(', ')}` : null,
	].filter((value): value is string => value !== null);
	const lines = [`- [${preference.status}] ${preference.kind} ${preference.name} (${preference.id})`];

	if (details.length > 0) {
		lines.push(`  ${details.join('; ')}`);
	}

	if (preference.rationale) {
		lines.push(`  why: ${preference.rationale}`);
	}

	for (const constraint of preference.constraints) {
		lines.push(`  constraint: ${constraint}`);
	}

	return lines;
}

function renderList(file: TechnologyPreferencesFile, preferences: readonly TechnologyPreference[]): string {
	const lines = [
		'mustflow technology preferences',
		`Path: ${file.path}`,
		`Authority: ${file.authority} (preferences only)`,
		`Preferences: ${preferences.length}`,
	];

	if (file.issues.length > 0) {
		lines.push('Issues:', ...file.issues.map((issue) => `- ${issue}`));
	}

	if (preferences.length === 0) {
		lines.push('No technology preferences recorded.');
		return lines.join('\n');
	}

	for (const preference of preferences) {
		lines.push(...renderPreference(preference));
	}

	return lines.join('\n');
}

function filterPreferences(file: TechnologyPreferencesFile, options: ParsedTechOptions): readonly TechnologyPreference[] {
	return file.preferences.filter((preference) =>
		technologyPreferenceMatches(preference, {
			scope: options.scope[0] ?? null,
			kind: options.kind,
			status: options.status,
		}),
	);
}

function runList(projectRoot: string, options: ParsedTechOptions, reporter: Reporter): number {
	const file = readTechnologyPreferences(projectRoot);
	const preferences = filterPreferences(file, options);

	if (options.json) {
		reporter.stdout(JSON.stringify({ ...file, preferences }, null, 2));
		return file.issues.length === 0 ? 0 : 1;
	}

	reporter.stdout(renderList(file, preferences));
	return file.issues.length === 0 ? 0 : 1;
}

function runSuggest(projectRoot: string, options: ParsedTechOptions, reporter: Reporter): number {
	const file = readTechnologyPreferences(projectRoot);
	const filtered = filterPreferences(file, {
		...options,
		status: null,
	});
	const preferred = filtered.filter((preference) => preference.status === 'preferred' || preference.status === 'allowed');
	const avoid = filtered.filter((preference) => preference.status === 'avoid');
	const payload = {
		path: file.path,
		authority: TECHNOLOGY_AUTHORITY,
		guidance: TECHNOLOGY_GUIDANCE,
		preferred,
		avoid,
		issues: file.issues,
	};

	if (options.json) {
		reporter.stdout(JSON.stringify(payload, null, 2));
		return file.issues.length === 0 ? 0 : 1;
	}

	const lines = ['mustflow technology suggestions', `Path: ${file.path}`, `Authority: ${TECHNOLOGY_AUTHORITY}`];
	lines.push('Guidance:', ...TECHNOLOGY_GUIDANCE.map((item) => `- ${item}`));
	lines.push('Preferred or allowed:');
	lines.push(...(preferred.length === 0 ? ['- none'] : preferred.flatMap(renderPreference)));
	lines.push('Avoid:');
	lines.push(...(avoid.length === 0 ? ['- none'] : avoid.flatMap(renderPreference)));
	if (file.issues.length > 0) {
		lines.push('Issues:', ...file.issues.map((issue) => `- ${issue}`));
	}
	reporter.stdout(lines.join('\n'));
	return file.issues.length === 0 ? 0 : 1;
}

function findExistingIndex(preferences: readonly TechnologyPreference[], candidate: TechnologyPreference): number {
	return preferences.findIndex((preference) => {
		if (preference.id === candidate.id) {
			return true;
		}

		return preference.kind === candidate.kind && normalizeTechnologyKey(preference.name) === normalizeTechnologyKey(candidate.name);
	});
}

function runAdd(projectRoot: string, options: ParsedTechOptions, reporter: Reporter): number {
	const [kindToken, nameToken] = options.positionals;
	if (!isTechnologyKind(kindToken ?? null)) {
		reporter.stderr(renderCliError('Missing or unsupported technology kind', 'mf tech --help'));
		return 1;
	}

	if (!nameToken) {
		reporter.stderr(renderCliError('Missing technology name', 'mf tech --help'));
		return 1;
	}
	const kind = kindToken as TechnologyKind;

	if (options.status !== null && !isTechnologyStatus(options.status)) {
		reporter.stderr(renderCliError(`Unsupported technology status: ${options.status}`, 'mf tech --help'));
		return 1;
	}

	const file = readTechnologyPreferences(projectRoot);
	if (file.issues.length > 0) {
		reporter.stderr(renderCliError(`Cannot update invalid ${TECHNOLOGY_CONFIG_RELATIVE_PATH}`, 'mf tech list'));
		return 1;
	}

	const status = options.status ?? 'preferred';
	const scope = options.scope.length > 0 ? options.scope : [];
	const name = normalizeTechnologyName(nameToken);
	const candidate: TechnologyPreference = {
		id: createTechnologyPreferenceId(kind, name, scope),
		kind,
		name,
		status,
		authority: TECHNOLOGY_AUTHORITY,
		scope,
		ecosystem: options.ecosystem,
		packages: options.packages,
		rationale: options.why,
		constraints: options.constraints,
	};
	const preferences = [...file.preferences];
	const existingIndex = findExistingIndex(preferences, candidate);
	const action = existingIndex === -1 ? 'created' : 'updated';

	if (existingIndex === -1) {
		preferences.push(candidate);
	} else {
		preferences[existingIndex] = candidate;
	}

	writeTechnologyPreferences(projectRoot, preferences);

	if (options.json) {
		reporter.stdout(JSON.stringify({ action, preference: candidate, path: TECHNOLOGY_CONFIG_RELATIVE_PATH }, null, 2));
		return 0;
	}

	reporter.stdout(`${action === 'created' ? 'Created' : 'Updated'} ${candidate.id} in ${TECHNOLOGY_CONFIG_RELATIVE_PATH}`);
	return 0;
}

function runRemove(projectRoot: string, options: ParsedTechOptions, reporter: Reporter): number {
	const [target] = options.positionals;
	if (!target) {
		reporter.stderr(renderCliError('Missing technology id or name', 'mf tech --help'));
		return 1;
	}

	const file = readTechnologyPreferences(projectRoot);
	if (file.issues.length > 0) {
		reporter.stderr(renderCliError(`Cannot update invalid ${TECHNOLOGY_CONFIG_RELATIVE_PATH}`, 'mf tech list'));
		return 1;
	}

	const key = normalizeTechnologyKey(target);
	const matches = file.preferences.filter(
		(preference) => preference.id === target || normalizeTechnologyKey(preference.name) === key,
	);

	if (matches.length === 0) {
		reporter.stderr(renderCliError(`No technology preference matched ${target}`, 'mf tech list'));
		return 1;
	}

	if (matches.length > 1) {
		reporter.stderr(renderCliError(`Multiple technology preferences matched ${target}; remove by id`, 'mf tech list'));
		return 1;
	}

	const removed = matches[0];
	const preferences = file.preferences.filter((preference) => preference.id !== removed.id);
	writeTechnologyPreferences(projectRoot, preferences);

	if (options.json) {
		reporter.stdout(JSON.stringify({ action: 'removed', preference: removed, path: TECHNOLOGY_CONFIG_RELATIVE_PATH }, null, 2));
		return 0;
	}

	reporter.stdout(`Removed ${removed.id} from ${TECHNOLOGY_CONFIG_RELATIVE_PATH}`);
	return 0;
}

export function runTech(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getTechHelp(lang));
		return 0;
	}

	const options = parseTechOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf tech --help', getTechHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();

	if (options.action === 'list') {
		return runList(projectRoot, options, reporter);
	}

	if (options.action === 'suggest') {
		return runSuggest(projectRoot, options, reporter);
	}

	if (options.action === 'add') {
		return runAdd(projectRoot, options, reporter);
	}

	return runRemove(projectRoot, options, reporter);
}
