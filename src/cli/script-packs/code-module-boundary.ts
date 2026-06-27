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
import {
	inspectModuleBoundaries,
	MODULE_BOUNDARY_SCRIPT_REF,
	type ModuleBoundaryReport,
} from '../../core/module-boundary.js';

const MODULE_BOUNDARY_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--config', kind: 'string' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-depth', kind: 'string' },
	{ name: '--max-nodes', kind: 'string' },
	{ name: '--max-edges', kind: 'string' },
	{ name: '--max-cycles', kind: 'string' },
	{ name: '--max-shared-files', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedModuleBoundaryOptions {
	readonly action: 'check';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly configPath: string | null;
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly maxDepth: number | null;
	readonly maxNodes: number | null;
	readonly maxEdges: number | null;
	readonly maxCycles: number | null;
	readonly maxSharedFiles: number | null;
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
		return { value: null, error: t(lang, 'moduleBoundary.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'moduleBoundary.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getCodeModuleBoundaryHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/module-boundary check <path...> [options]',
			summary: t(lang, 'moduleBoundary.help.summary'),
			options: [
				{ label: '--config <path>', description: t(lang, 'moduleBoundary.help.option.config') },
				{ label: '--max-depth <count>', description: t(lang, 'moduleBoundary.help.option.maxDepth') },
				{ label: '--max-files <count>', description: t(lang, 'moduleBoundary.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'moduleBoundary.help.option.maxFileBytes') },
				{ label: '--max-nodes <count>', description: t(lang, 'moduleBoundary.help.option.maxNodes') },
				{ label: '--max-edges <count>', description: t(lang, 'moduleBoundary.help.option.maxEdges') },
				{ label: '--max-cycles <count>', description: t(lang, 'moduleBoundary.help.option.maxCycles') },
				{ label: '--max-shared-files <count>', description: t(lang, 'moduleBoundary.help.option.maxSharedFiles') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/module-boundary check src --json',
				'mf script-pack run code/module-boundary check src --config .mustflow/config/module-boundaries.toml --json',
				'mf script-pack run code/module-boundary check src/features --max-depth 30 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'moduleBoundary.help.exit.ok') },
				{ label: '1', description: t(lang, 'moduleBoundary.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseModuleBoundaryOptions(args: readonly string[], lang: CliLang): ParsedModuleBoundaryOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, MODULE_BOUNDARY_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const configPath = getParsedCliStringOption(parsed, '--config');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);
	const maxDepth = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-depth'), '--max-depth', lang);
	const maxNodes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-nodes'), '--max-nodes', lang);
	const maxEdges = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-edges'), '--max-edges', lang);
	const maxCycles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-cycles'), '--max-cycles', lang);
	const maxSharedFiles = parsePositiveInteger(
		getParsedCliStringOption(parsed, '--max-shared-files'),
		'--max-shared-files',
		lang,
	);
	const positiveOptions = [maxFiles, maxFileBytes, maxDepth, maxNodes, maxEdges, maxCycles, maxSharedFiles];

	if (action !== 'check') {
		return {
			action: 'check',
			json,
			paths: parsed.positionals,
			configPath,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxDepth: maxDepth.value,
			maxNodes: maxNodes.value,
			maxEdges: maxEdges.value,
			maxCycles: maxCycles.value,
			maxSharedFiles: maxSharedFiles.value,
			error: action ? t(lang, 'moduleBoundary.error.unknownAction', { action }) : t(lang, 'moduleBoundary.error.missingAction'),
		};
	}
	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			configPath,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxDepth: maxDepth.value,
			maxNodes: maxNodes.value,
			maxEdges: maxEdges.value,
			maxCycles: maxCycles.value,
			maxSharedFiles: maxSharedFiles.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}
	for (const candidate of positiveOptions) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				configPath,
				maxFiles: maxFiles.value,
				maxFileBytes: maxFileBytes.value,
				maxDepth: maxDepth.value,
				maxNodes: maxNodes.value,
				maxEdges: maxEdges.value,
				maxCycles: maxCycles.value,
				maxSharedFiles: maxSharedFiles.value,
				error: candidate.error,
			};
		}
	}
	if (parsed.positionals.length === 0) {
		return {
			action,
			json,
			paths: parsed.positionals,
			configPath,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxDepth: maxDepth.value,
			maxNodes: maxNodes.value,
			maxEdges: maxEdges.value,
			maxCycles: maxCycles.value,
			maxSharedFiles: maxSharedFiles.value,
			error: t(lang, 'moduleBoundary.error.missingPath'),
		};
	}
	return {
		action,
		json,
		paths: parsed.positionals,
		configPath,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
		maxDepth: maxDepth.value,
		maxNodes: maxNodes.value,
		maxEdges: maxEdges.value,
		maxCycles: maxCycles.value,
		maxSharedFiles: maxSharedFiles.value,
	};
}

function renderModuleBoundarySummary(report: ModuleBoundaryReport, lang: CliLang): string {
	const lines = [
		t(lang, 'moduleBoundary.title'),
		`${t(lang, 'scriptPack.label.script')}: ${MODULE_BOUNDARY_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'moduleBoundary.label.config')}: ${report.config.path} (${report.config.status})`,
		`${t(lang, 'moduleBoundary.label.targets')}: ${report.targets.length}`,
		`${t(lang, 'moduleBoundary.label.edges')}: ${report.graph.edge_count}`,
		`${t(lang, 'moduleBoundary.label.rules')}: ${report.rules.length}`,
		`${t(lang, 'moduleBoundary.label.findings')}: ${report.findings.length}`,
		`${t(lang, 'moduleBoundary.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (report.findings.length > 0) {
		lines.push(t(lang, 'moduleBoundary.label.findingList'));
		for (const finding of report.findings.slice(0, 80)) {
			const location = finding.line ? `${finding.path}:${finding.line}` : finding.path;
			lines.push(`- ${location}: ${finding.code} (${finding.message})`);
		}
	}
	if (report.shared_metrics.length > 0) {
		lines.push(t(lang, 'moduleBoundary.label.sharedMetrics'));
		for (const metric of report.shared_metrics) {
			lines.push(`- ${metric.path}: ${metric.file_count} files, ${metric.export_count} exports`);
		}
	}
	if (report.issues.length > 0) {
		lines.push(t(lang, 'moduleBoundary.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}
	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'moduleBoundary.clean'));
	}
	return lines.join('\n');
}

export function runCodeModuleBoundaryScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeModuleBoundaryHelp(lang));
		return 0;
	}

	const options = parseModuleBoundaryOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run code/module-boundary --help', getCodeModuleBoundaryHelp(lang), lang);
		return 1;
	}

	const report = inspectModuleBoundaries(resolveMustflowRoot(), {
		paths: options.paths,
		configPath: options.configPath ?? undefined,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxDepth: options.maxDepth ?? undefined,
		maxNodes: options.maxNodes ?? undefined,
		maxEdges: options.maxEdges ?? undefined,
		maxCycles: options.maxCycles ?? undefined,
		maxSharedFiles: options.maxSharedFiles ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderModuleBoundarySummary(report, lang));
	return report.ok ? 0 : 1;
}
