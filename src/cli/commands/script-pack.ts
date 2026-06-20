import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import type { MessageKey } from '../i18n/en.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import {
	findScriptPackScript,
	SCRIPT_PACKS,
	type ScriptPackDefinition,
	type ScriptPackScriptDefinition,
} from '../lib/script-pack-registry.js';

const SCRIPT_PACK_LIST_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ScriptPackCatalogScript {
	readonly id: string;
	readonly ref: string;
	readonly usage: string;
	readonly summary_key: MessageKey;
	readonly actions: readonly string[];
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
				report_schema_file: script.reportSchemaFile,
			})),
		})),
		issues: [],
	};
}

export function getScriptPackHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack <list|run> [options]',
			summary: t(lang, 'scriptPack.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack list',
				'mf script-pack list --json',
				'mf script-pack run core/text-budget check README.md --max 5000',
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
