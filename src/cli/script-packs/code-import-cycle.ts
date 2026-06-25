import { printUsageError, renderHelp } from '../lib/cli-output.js';
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
import { IMPORT_CYCLE_SCRIPT_REF, inspectImportCycles, type ImportCycleReport } from '../../core/import-cycle.js';

const IMPORT_CYCLE_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-depth', kind: 'string' },
	{ name: '--max-nodes', kind: 'string' },
	{ name: '--max-edges', kind: 'string' },
	{ name: '--max-cycles', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedImportCycleOptions {
	readonly action: 'check';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly maxDepth: number | null;
	readonly maxNodes: number | null;
	readonly maxEdges: number | null;
	readonly maxCycles: number | null;
	readonly error?: string;
}

function parsePositiveInteger(
	value: string | null,
	option: string,
	lang: CliLang,
): { readonly value: number | null; readonly error?: string } {
	if (value === null) {
		return { value: null };
	}
	if (!/^[1-9]\d*$/u.test(value)) {
		return { value: null, error: t(lang, 'importCycle.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'importCycle.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getCodeImportCycleHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/import-cycle check <path...> [options]',
			summary: t(lang, 'importCycle.help.summary'),
			options: [
				{ label: '--max-depth <count>', description: t(lang, 'importCycle.help.option.maxDepth') },
				{ label: '--max-files <count>', description: t(lang, 'importCycle.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'importCycle.help.option.maxFileBytes') },
				{ label: '--max-nodes <count>', description: t(lang, 'importCycle.help.option.maxNodes') },
				{ label: '--max-edges <count>', description: t(lang, 'importCycle.help.option.maxEdges') },
				{ label: '--max-cycles <count>', description: t(lang, 'importCycle.help.option.maxCycles') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/import-cycle check src --json',
				'mf script-pack run code/import-cycle check src/core --max-depth 30 --json',
				'mf script-pack run code/import-cycle check src tests --max-cycles 20 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'importCycle.help.exit.ok') },
				{ label: '1', description: t(lang, 'importCycle.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseImportCycleOptions(args: readonly string[], lang: CliLang): ParsedImportCycleOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, IMPORT_CYCLE_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);
	const maxDepth = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-depth'), '--max-depth', lang);
	const maxNodes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-nodes'), '--max-nodes', lang);
	const maxEdges = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-edges'), '--max-edges', lang);
	const maxCycles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-cycles'), '--max-cycles', lang);
	const positiveOptions = [maxFiles, maxFileBytes, maxDepth, maxNodes, maxEdges, maxCycles];

	if (action !== 'check') {
		return {
			action: 'check',
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxDepth: maxDepth.value,
			maxNodes: maxNodes.value,
			maxEdges: maxEdges.value,
			maxCycles: maxCycles.value,
			error: action ? t(lang, 'importCycle.error.unknownAction', { action }) : t(lang, 'importCycle.error.missingAction'),
		};
	}
	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxDepth: maxDepth.value,
			maxNodes: maxNodes.value,
			maxEdges: maxEdges.value,
			maxCycles: maxCycles.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}
	for (const candidate of positiveOptions) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxFileBytes: maxFileBytes.value,
				maxDepth: maxDepth.value,
				maxNodes: maxNodes.value,
				maxEdges: maxEdges.value,
				maxCycles: maxCycles.value,
				error: candidate.error,
			};
		}
	}
	if (parsed.positionals.length === 0) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxDepth: maxDepth.value,
			maxNodes: maxNodes.value,
			maxEdges: maxEdges.value,
			maxCycles: maxCycles.value,
			error: t(lang, 'importCycle.error.missingPath'),
		};
	}
	return {
		action,
		json,
		paths: parsed.positionals,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
		maxDepth: maxDepth.value,
		maxNodes: maxNodes.value,
		maxEdges: maxEdges.value,
		maxCycles: maxCycles.value,
	};
}

function renderImportCycleSummary(report: ImportCycleReport, lang: CliLang): string {
	const lines = [
		t(lang, 'importCycle.title'),
		`${t(lang, 'scriptPack.label.script')}: ${IMPORT_CYCLE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'importCycle.label.targets')}: ${report.targets.length}`,
		`${t(lang, 'importCycle.label.nodes')}: ${report.graph.node_count}`,
		`${t(lang, 'importCycle.label.edges')}: ${report.graph.edge_count}`,
		`${t(lang, 'importCycle.label.cycles')}: ${report.cycles.length}`,
		`${t(lang, 'importCycle.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (report.cycles.length > 0) {
		lines.push(t(lang, 'importCycle.label.cycleList'));
		for (const cycle of report.cycles) {
			lines.push(`- ${cycle.cycle_id}: ${cycle.paths.join(' -> ')}`);
			for (const edge of cycle.edges) {
				lines.push(`  - ${edge.source_path}:${edge.line} -> ${edge.target_path} (${edge.kind}, ${edge.specifier})`);
			}
		}
	}
	if (report.findings.length > 0) {
		lines.push(t(lang, 'importCycle.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}
	if (report.issues.length > 0) {
		lines.push(t(lang, 'importCycle.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}
	if (report.cycles.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'importCycle.clean'));
	}
	return lines.join('\n');
}

export function runCodeImportCycleScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeImportCycleHelp(lang));
		return 0;
	}

	const options = parseImportCycleOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run code/import-cycle --help', getCodeImportCycleHelp(lang), lang);
		return 1;
	}

	const report = inspectImportCycles(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxDepth: options.maxDepth ?? undefined,
		maxNodes: options.maxNodes ?? undefined,
		maxEdges: options.maxEdges ?? undefined,
		maxCycles: options.maxCycles ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderImportCycleSummary(report, lang));
	return report.ok ? 0 : 1;
}
