import { buildAgentPluginBundle } from '../../core/agent-plugin-bundle.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const PLUGIN_OPTIONS = [
	{ name: '--bundle', kind: 'string' },
	{ name: '--json', kind: 'boolean' },
] as const;

export function getPluginHelp(lang: CliLang = 'en'): string {
	return renderHelp({
		usage: 'mf plugin build [options]',
		summary: t(lang, 'command.plugin.summary'),
		options: [
			{ label: '--bundle <path>', description: 'Bundle declaration; defaults to plugin-bundles/mustflow-review.bundle.json' },
			{ label: '--json', description: t(lang, 'cli.option.json') },
			{ label: '-h, --help', description: t(lang, 'cli.option.help') },
		],
		examples: ['mf plugin build', 'mf plugin build --bundle plugin-bundles/custom.bundle.json --json'],
		exitCodes: [
			{ label: '0', description: 'The portable plugin was generated and locally validated' },
			{ label: '1', description: t(lang, 'cli.common.invalidInput') },
		],
	}, lang);
}

export function runPlugin(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getPluginHelp(lang));
		return 0;
	}
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, PLUGIN_OPTIONS, { allowPositionals: true });
	if (action !== 'build' || parsed.error || parsed.positionals.length > 0) {
		const message = action !== 'build'
			? 'Expected the build action.'
			: parsed.error
				? formatCliOptionParseError(parsed.error, lang)
				: t(lang, 'cli.error.unexpectedArgument', { argument: parsed.positionals[0] ?? '' });
		printUsageError(reporter, message, 'mf plugin --help', getPluginHelp(lang), lang);
		return 1;
	}
	const bundle = getParsedCliStringOption(parsed, '--bundle') ?? 'plugin-bundles/mustflow-review.bundle.json';
	try {
		const report = buildAgentPluginBundle(resolveMustflowRoot(), bundle);
		if (hasParsedCliOption(parsed, '--json')) {
			reporter.stdout(JSON.stringify(report, null, 2));
		} else {
			reporter.stdout([
				'mustflow agent plugin build',
				`plugin: ${report.plugin}`,
				`output: ${report.output_directory}`,
				`skills: ${report.skill_count}`,
				`mcp_servers: ${report.mcp_server_count}`,
				`source_refresh: ${report.source_refresh}`,
			].join('\n'));
		}
		return 0;
	} catch (error) {
		reporter.stderr(error instanceof Error ? error.message : String(error));
		return 1;
	}
}
