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
	DEPENDENCY_GRAPH_SCRIPT_REF,
	inspectDependencyGraph,
	type DependencyGraphReport,
} from '../../core/dependency-graph.js';

const DEPENDENCY_GRAPH_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-depth', kind: 'string' },
	{ name: '--max-nodes', kind: 'string' },
	{ name: '--max-edges', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedDependencyGraphOptions {
	readonly action: 'scan';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly maxDepth: number | null;
	readonly maxNodes: number | null;
	readonly maxEdges: number | null;
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
		return { value: null, error: t(lang, 'dependencyGraph.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'dependencyGraph.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getCodeDependencyGraphHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/dependency-graph scan <path...> [options]',
			summary: t(lang, 'dependencyGraph.help.summary'),
			options: [
				{ label: '--max-depth <count>', description: t(lang, 'dependencyGraph.help.option.maxDepth') },
				{ label: '--max-files <count>', description: t(lang, 'dependencyGraph.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'dependencyGraph.help.option.maxFileBytes') },
				{ label: '--max-nodes <count>', description: t(lang, 'dependencyGraph.help.option.maxNodes') },
				{ label: '--max-edges <count>', description: t(lang, 'dependencyGraph.help.option.maxEdges') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/dependency-graph scan src/cli/index.ts --json',
				'mf script-pack run code/dependency-graph scan src/core --max-depth 3 --json',
				'mf script-pack run code/dependency-graph scan src tests --max-nodes 120 --max-edges 300 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'dependencyGraph.help.exit.ok') },
				{ label: '1', description: t(lang, 'dependencyGraph.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseDependencyGraphOptions(args: readonly string[], lang: CliLang): ParsedDependencyGraphOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, DEPENDENCY_GRAPH_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);
	const maxDepth = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-depth'), '--max-depth', lang);
	const maxNodes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-nodes'), '--max-nodes', lang);
	const maxEdges = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-edges'), '--max-edges', lang);
	const positiveOptions = [maxFiles, maxFileBytes, maxDepth, maxNodes, maxEdges];

	if (action !== 'scan') {
		return {
			action: 'scan',
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxDepth: maxDepth.value,
			maxNodes: maxNodes.value,
			maxEdges: maxEdges.value,
			error: action ? t(lang, 'dependencyGraph.error.unknownAction', { action }) : t(lang, 'dependencyGraph.error.missingAction'),
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
			error: t(lang, 'dependencyGraph.error.missingPath'),
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
	};
}

function renderDependencyGraphSummary(report: DependencyGraphReport, lang: CliLang): string {
	const lines = [
		t(lang, 'dependencyGraph.title'),
		`${t(lang, 'scriptPack.label.script')}: ${DEPENDENCY_GRAPH_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'dependencyGraph.label.targets')}: ${report.targets.length}`,
		`${t(lang, 'dependencyGraph.label.nodes')}: ${report.nodes.length}`,
		`${t(lang, 'dependencyGraph.label.edges')}: ${report.edges.length}`,
		`${t(lang, 'dependencyGraph.label.cycles')}: ${report.cycles.length}`,
		`${t(lang, 'dependencyGraph.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	for (const edge of report.edges.slice(0, 40)) {
		lines.push(`- ${edge.source_path}:${edge.line} -> ${edge.target_path} (${edge.kind}, ${edge.specifier})`);
	}
	if (report.cycles.length > 0) {
		lines.push(t(lang, 'dependencyGraph.label.cycleList'));
		for (const cycle of report.cycles) {
			lines.push(`- ${cycle.join(' -> ')}`);
		}
	}
	if (report.findings.length > 0) {
		lines.push(t(lang, 'dependencyGraph.label.findings'), ...report.findings.map((finding) => `- ${finding.path}: ${finding.code} (${finding.message})`));
	}
	if (report.issues.length > 0) {
		lines.push(t(lang, 'dependencyGraph.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}
	if (report.edges.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'dependencyGraph.clean'));
	}
	return lines.join('\n');
}

export function runCodeDependencyGraphScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeDependencyGraphHelp(lang));
		return 0;
	}

	const options = parseDependencyGraphOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run code/dependency-graph --help', getCodeDependencyGraphHelp(lang), lang);
		return 1;
	}

	const report = inspectDependencyGraph(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxDepth: options.maxDepth ?? undefined,
		maxNodes: options.maxNodes ?? undefined,
		maxEdges: options.maxEdges ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderDependencyGraphSummary(report, lang));
	return report.ok ? 0 : 1;
}
