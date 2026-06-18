import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { inspectQualityGaming, type QualityGamingReport } from '../../core/quality-gaming.js';

const QUALITY_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--all', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedQualityOptions {
	readonly action: 'check';
	readonly json: boolean;
	readonly all: boolean;
	readonly error?: string;
}

export function getQualityHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf quality <check> [options]',
			summary: t(lang, 'quality.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '--all', description: t(lang, 'quality.help.option.all') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf quality check', 'mf quality check --json', 'mf quality check --all'],
			exitCodes: [
				{ label: '0', description: t(lang, 'quality.help.exit.ok') },
				{ label: '1', description: t(lang, 'quality.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseQualityOptions(args: readonly string[], lang: CliLang): ParsedQualityOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, QUALITY_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const all = hasParsedCliOption(parsed, '--all');

	if (action !== 'check') {
		return {
			action: 'check',
			json,
			all,
			error: action ? t(lang, 'quality.error.unknownAction', { action }) : t(lang, 'quality.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, all, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { action, json, all };
}

function renderQualitySummary(report: QualityGamingReport, lang: CliLang): string {
	const lines = [
		t(lang, 'quality.title'),
		`${t(lang, 'label.mode')}: ${report.mode}`,
		`${t(lang, 'label.scope')}: ${report.scope}`,
		`${t(lang, 'quality.label.checkedFiles')}: ${report.checked_files}`,
		`${t(lang, 'quality.label.riskCount')}: ${report.risk_count}`,
	];

	if (report.issues.length > 0) {
		lines.push(t(lang, 'quality.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.risky_files.length > 0) {
		lines.push(t(lang, 'quality.label.riskyFiles'));
		for (const file of report.risky_files) {
			lines.push(`- ${file.path} (${file.risk_count})`);
			for (const risk of file.risks) {
				const line = risk.line === null ? '' : `:${risk.line}`;
				lines.push(`  - ${risk.code}${line} [${risk.severity}] ${risk.detail}`);
			}
		}
	}

	if (report.risky_files.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'quality.clean'));
	}

	return lines.join('\n');
}

export function runQuality(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getQualityHelp(lang));
		return 0;
	}

	const options = parseQualityOptions(args, lang);

	if (options.error) {
		printUsageError(reporter, options.error, 'mf quality --help', getQualityHelp(lang), lang);
		return 1;
	}

	const report = inspectQualityGaming(resolveMustflowRoot(), {
		scope: options.all ? 'tracked' : 'changed',
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderQualitySummary(report, lang));
	return report.ok ? 0 : 1;
}
