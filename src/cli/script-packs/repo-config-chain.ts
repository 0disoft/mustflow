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
	CONFIG_CHAIN_SCRIPT_REF,
	inspectConfigChain,
	type ConfigChainReport,
} from '../../core/config-chain.js';

const CONFIG_CHAIN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-configs', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedConfigChainOptions {
	readonly action: 'inspect';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxConfigs: number | null;
	readonly maxFileBytes: number | null;
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
		return { value: null, error: t(lang, 'configChain.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'configChain.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getRepoConfigChainHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/config-chain inspect <path...> [options]',
			summary: t(lang, 'configChain.help.summary'),
			options: [
				{ label: '--max-configs <count>', description: t(lang, 'configChain.help.option.maxConfigs') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'configChain.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/config-chain inspect src --json',
				'mf script-pack run repo/config-chain inspect tsconfig.json src/index.ts --json',
				'mf script-pack run repo/config-chain inspect . --max-configs 40 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'configChain.help.exit.ok') },
				{ label: '1', description: t(lang, 'configChain.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseConfigChainOptions(args: readonly string[], lang: CliLang): ParsedConfigChainOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, CONFIG_CHAIN_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxConfigs = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-configs'), '--max-configs', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);

	if (action !== 'inspect') {
		return {
			action: 'inspect',
			json,
			paths: parsed.positionals,
			maxConfigs: maxConfigs.value,
			maxFileBytes: maxFileBytes.value,
			error: action ? t(lang, 'configChain.error.unknownAction', { action }) : t(lang, 'configChain.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxConfigs: maxConfigs.value,
			maxFileBytes: maxFileBytes.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxConfigs, maxFileBytes]) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				maxConfigs: maxConfigs.value,
				maxFileBytes: maxFileBytes.value,
				error: candidate.error,
			};
		}
	}

	if (parsed.positionals.length === 0) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxConfigs: maxConfigs.value,
			maxFileBytes: maxFileBytes.value,
			error: t(lang, 'configChain.error.missingPath'),
		};
	}

	return {
		action,
		json,
		paths: parsed.positionals,
		maxConfigs: maxConfigs.value,
		maxFileBytes: maxFileBytes.value,
	};
}

function renderConfigChainSummary(report: ConfigChainReport, lang: CliLang): string {
	const lines = [
		t(lang, 'configChain.title'),
		`${t(lang, 'scriptPack.label.script')}: ${CONFIG_CHAIN_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'configChain.label.targets')}: ${report.targets.length}`,
		`${t(lang, 'configChain.label.configs')}: ${report.configs.length}`,
		`${t(lang, 'configChain.label.edges')}: ${report.edges.length}`,
		`${t(lang, 'configChain.label.findings')}: ${report.findings.length}`,
	];

	if (report.configs.length > 0) {
		lines.push(t(lang, 'configChain.label.configs'));
		for (const config of report.configs) {
			const dynamic = config.dynamic ? `, ${t(lang, 'configChain.label.dynamic')}` : '';
			lines.push(`- ${config.path}: ${config.kind}, ${config.format}${dynamic}`);
			for (const summary of config.summary.slice(0, 4)) {
				lines.push(`  - ${summary}`);
			}
		}
	}

	if (report.edges.length > 0) {
		lines.push(t(lang, 'configChain.label.edges'));
		for (const edge of report.edges) {
			const target = edge.to_path ?? edge.specifier;
			lines.push(`- ${edge.from_path} -> ${target}: ${edge.kind}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'configChain.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'configChain.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.configs.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'configChain.clean'));
	}

	return lines.join('\n');
}

export function runRepoConfigChainScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoConfigChainHelp(lang));
		return 0;
	}

	const options = parseConfigChainOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/config-chain --help',
			getRepoConfigChainHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectConfigChain(resolveMustflowRoot(), {
		paths: options.paths,
		maxConfigs: options.maxConfigs ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderConfigChainSummary(report, lang));
	return report.ok ? 0 : 1;
}
