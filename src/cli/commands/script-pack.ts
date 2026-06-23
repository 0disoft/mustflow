import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import type { MessageKey } from '../i18n/en.js';
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
import {
	findScriptPackScript,
	listScriptPackScripts,
	SCRIPT_PACKS,
	type ScriptPackDefinition,
	type ScriptPackPhase,
	type ScriptPackRiskLevel,
	type ScriptPackCost,
	type ScriptPackScriptDefinition,
} from '../lib/script-pack-registry.js';
import {
	createScriptPackSuggestionReport,
	isScriptPackSuggestionPhase,
	type ScriptPackSuggestionPhase,
	type ScriptPackSuggestionReport,
} from '../../core/script-pack-suggestions.js';

const SCRIPT_PACK_LIST_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];
const SCRIPT_PACK_SUGGEST_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--changed', kind: 'boolean' },
	{ name: '--phase', kind: 'string' },
	{ name: '--skill', kind: 'string' },
	{ name: '--path', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ScriptPackCatalogScript {
	readonly id: string;
	readonly ref: string;
	readonly usage: string;
	readonly summary_key: MessageKey;
	readonly actions: readonly string[];
	readonly use_when: readonly string[];
	readonly phases: readonly ScriptPackPhase[];
	readonly read_only: boolean;
	readonly mutates: boolean;
	readonly network: boolean;
	readonly inputs: readonly string[];
	readonly outputs: readonly string[];
	readonly related_skills: readonly string[];
	readonly risk_level: ScriptPackRiskLevel;
	readonly cost: ScriptPackCost;
	readonly report_schema_file: string | null;
}

interface ScriptPackCatalogPack {
	readonly id: string;
	readonly summary_key: MessageKey;
	readonly scripts: readonly ScriptPackCatalogScript[];
}

interface ScriptPackCatalogReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly action: 'list';
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly packs: readonly ScriptPackCatalogPack[];
	readonly issues: readonly string[];
}

function createCatalogReport(mustflowRoot: string, packs: readonly ScriptPackDefinition[]): ScriptPackCatalogReport {
	return {
		schema_version: '1',
		command: 'script-pack',
		action: 'list',
		ok: true,
		mustflow_root: mustflowRoot,
		packs: packs.map((pack) => ({
			id: pack.id,
			summary_key: pack.summaryKey,
			scripts: pack.scripts.map((script) => ({
				id: script.id,
				ref: script.ref,
				usage: script.usage,
				summary_key: script.summaryKey,
				actions: script.actions,
				use_when: script.useWhen,
				phases: script.phases,
				read_only: script.readOnly,
				mutates: script.mutates,
				network: script.network,
				inputs: script.inputs,
				outputs: script.outputs,
				related_skills: script.relatedSkills,
				risk_level: script.riskLevel,
				cost: script.cost,
				report_schema_file: script.reportSchemaFile,
			})),
		})),
		issues: [],
	};
}

export function getScriptPackHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack <list|suggest|run> [options]',
			summary: t(lang, 'scriptPack.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '--changed', description: t(lang, 'scriptPack.help.option.changed') },
				{ label: '--phase <phase>', description: t(lang, 'scriptPack.help.option.phase') },
				{ label: '--skill <skill>', description: t(lang, 'scriptPack.help.option.skill') },
				{ label: '--path <path>', description: t(lang, 'scriptPack.help.option.path') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack list',
				'mf script-pack list --json',
				'mf script-pack suggest --path src/cli/index.ts --phase before_change',
				'mf script-pack suggest --changed --phase after_change --json',
				'mf script-pack run code/outline scan src --json',
				'mf script-pack run code/symbol-read read src/cli/index.ts --start-line 25 --json',
				'mf script-pack run code/route-outline scan src/server.ts --json',
				'mf script-pack run code/export-diff compare --base HEAD~1 --head HEAD --json',
				'mf script-pack run core/text-budget check README.md --max 5000',
				'mf script-pack run repo/config-chain inspect src/cli/index.ts --json',
				'mf script-pack run repo/generated-boundary check src/cli/index.ts --json',
				'mf script-pack run repo/related-files map src/cli/index.ts --json',
				'mf script-pack run core/text-budget --help',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'scriptPack.help.exit.ok') },
				{ label: '1', description: t(lang, 'scriptPack.help.exit.fail') },
			],
		},
		lang,
	);
}

function renderCatalogSummary(report: ScriptPackCatalogReport, lang: CliLang): string {
	const lines = [t(lang, 'scriptPack.title')];

	for (const pack of report.packs) {
		lines.push(`- ${pack.id}: ${t(lang, pack.summary_key)}`);
		for (const script of pack.scripts) {
			const schema = script.report_schema_file ?? t(lang, 'value.none');
			lines.push(
				`  - ${script.ref}: ${t(lang, script.summary_key)} ` +
					`(${t(lang, 'scriptPack.label.actions')}: ${script.actions.join(', ')}, ` +
					`${t(lang, 'scriptPack.label.schema')}: ${schema})`,
			);
		}
	}

	return lines.join('\n');
}

function parseListOptions(args: readonly string[], lang: CliLang): { readonly json: boolean; readonly error?: string } {
	const parsed = parseCliOptions(args, SCRIPT_PACK_LIST_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');

	if (parsed.error) {
		return { json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { json };
}

function getParsedCliStringOccurrences(
	parsed: ReturnType<typeof parseCliOptions>,
	name: string,
): readonly string[] {
	return parsed.occurrences
		.filter((occurrence) => occurrence.name === name && typeof occurrence.value === 'string')
		.map((occurrence) => String(occurrence.value));
}

function parseSuggestOptions(
	args: readonly string[],
	lang: CliLang,
): {
	readonly json: boolean;
	readonly changed: boolean;
	readonly phases: readonly ScriptPackSuggestionPhase[];
	readonly skills: readonly string[];
	readonly paths: readonly string[];
	readonly error?: string;
} {
	const parsed = parseCliOptions(args, SCRIPT_PACK_SUGGEST_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const changed = hasParsedCliOption(parsed, '--changed');
	const phases = getParsedCliStringOccurrences(parsed, '--phase');
	const invalidPhase = phases.find((phase) => !isScriptPackSuggestionPhase(phase));

	if (parsed.error) {
		return { json, changed, phases: [], skills: [], paths: parsed.positionals, error: formatCliOptionParseError(parsed.error, lang) };
	}

	if (invalidPhase) {
		return {
			json,
			changed,
			phases: [],
			skills: [],
			paths: parsed.positionals,
			error: t(lang, 'scriptPack.error.unknownPhase', { phase: invalidPhase }),
		};
	}

	const optionPaths = getParsedCliStringOccurrences(parsed, '--path');
	const firstPath = getParsedCliStringOption(parsed, '--path');
	const paths = optionPaths.length > 0 ? optionPaths : firstPath ? [firstPath] : [];
	const skills = getParsedCliStringOccurrences(parsed, '--skill');
	const selectorsPresent = changed || phases.length > 0 || skills.length > 0 || paths.length > 0 || parsed.positionals.length > 0;

	if (!selectorsPresent) {
		return {
			json,
			changed,
			phases: phases.filter(isScriptPackSuggestionPhase),
			skills,
			paths,
			error: t(lang, 'scriptPack.error.missingSuggestInput'),
		};
	}

	return {
		json,
		changed,
		phases: phases.filter(isScriptPackSuggestionPhase),
		skills,
		paths: [...paths, ...parsed.positionals],
	};
}

function renderSuggestionSummary(report: ScriptPackSuggestionReport, lang: CliLang): string {
	const lines = [
		t(lang, 'scriptPack.suggest.title'),
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'scriptPack.suggest.label.suggestions')}: ${report.suggestions.length}`,
	];

	if (report.analyzed_paths.length > 0) {
		lines.push(t(lang, 'scriptPack.suggest.label.analyzedPaths'));
		for (const entry of report.analyzed_paths) {
			lines.push(`- ${entry.path}: ${entry.surfaces.join(', ')}`);
		}
	}

	if (report.suggestions.length > 0) {
		lines.push(t(lang, 'scriptPack.suggest.label.recommendations'));
		for (const suggestion of report.suggestions) {
			lines.push(`- ${suggestion.script_ref}: ${suggestion.confidence}, score ${suggestion.score}`);
			for (const reason of suggestion.reasons) {
				lines.push(`  - ${reason}`);
			}
			lines.push(`  - ${t(lang, 'scriptPack.suggest.label.runHint')}: ${suggestion.run_hint}`);
		}
	} else {
		lines.push(t(lang, 'scriptPack.suggest.empty'));
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'generatedBoundary.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

async function runScriptPackList(args: string[], reporter: Reporter, lang: CliLang): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getScriptPackHelp(lang));
		return 0;
	}

	const options = parseListOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack --help', getScriptPackHelp(lang), lang);
		return 1;
	}

	const report = createCatalogReport(resolveMustflowRoot(), SCRIPT_PACKS);
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return 0;
	}

	reporter.stdout(renderCatalogSummary(report, lang));
	return 0;
}

async function runScriptPackSuggest(args: string[], reporter: Reporter, lang: CliLang): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getScriptPackHelp(lang));
		return 0;
	}

	const options = parseSuggestOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack suggest --help', getScriptPackHelp(lang), lang);
		return 1;
	}

	const report = createScriptPackSuggestionReport(resolveMustflowRoot(), {
		changed: options.changed,
		phases: options.phases,
		skills: options.skills,
		paths: options.paths,
		scripts: listScriptPackScripts(),
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return 0;
	}

	reporter.stdout(renderSuggestionSummary(report, lang));
	return 0;
}

async function runScriptPackScript(args: string[], reporter: Reporter, lang: CliLang): Promise<number> {
	const [scriptRef, ...scriptArgs] = args;
	if (args.length === 1 && hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getScriptPackHelp(lang));
		return 0;
	}

	if (!scriptRef) {
		printUsageError(
			reporter,
			t(lang, 'scriptPack.error.missingScript'),
			'mf script-pack --help',
			getScriptPackHelp(lang),
			lang,
		);
		return 1;
	}

	const script: ScriptPackScriptDefinition | undefined = findScriptPackScript(scriptRef);
	if (!script) {
		printUsageError(
			reporter,
			t(lang, 'scriptPack.error.unknownScript', { script: scriptRef }),
			'mf script-pack list',
			getScriptPackHelp(lang),
			lang,
		);
		return 1;
	}

	const runner = await script.loadRunner();
	return runner(scriptArgs, reporter, lang);
}

export async function runScriptPack(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	const [action, ...rest] = args;

	if ((!action || action !== 'run') && hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getScriptPackHelp(lang));
		return 0;
	}

	if (!action) {
		printUsageError(
			reporter,
			t(lang, 'scriptPack.error.missingAction'),
			'mf script-pack --help',
			getScriptPackHelp(lang),
			lang,
		);
		return 1;
	}

	if (action === 'list') {
		return runScriptPackList(rest, reporter, lang);
	}

	if (action === 'suggest') {
		return runScriptPackSuggest(rest, reporter, lang);
	}

	if (action === 'run') {
		return runScriptPackScript(rest, reporter, lang);
	}

	printUsageError(
		reporter,
		t(lang, 'scriptPack.error.unknownAction', { action }),
		'mf script-pack --help',
		getScriptPackHelp(lang),
		lang,
	);
	return 1;
}
