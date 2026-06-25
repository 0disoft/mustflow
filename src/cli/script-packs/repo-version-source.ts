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
import {
	inspectRepoVersionSource,
	REPO_VERSION_SOURCE_SCRIPT_REF,
	type RepoVersionSourceReport,
} from '../../core/repo-version-source.js';

const REPO_VERSION_SOURCE_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoVersionSourceOptions {
	readonly action: 'inspect';
	readonly json: boolean;
	readonly error?: string;
}

export function getRepoVersionSourceHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/version-source inspect [options]',
			summary: t(lang, 'versionSource.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/version-source inspect',
				'mf script-pack run repo/version-source inspect --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'versionSource.help.exit.ok') },
				{ label: '1', description: t(lang, 'versionSource.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseRepoVersionSourceOptions(args: readonly string[], lang: CliLang): ParsedRepoVersionSourceOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_VERSION_SOURCE_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'inspect') {
		return {
			action: 'inspect',
			json,
			error: action
				? t(lang, 'versionSource.error.unknownAction', { action })
				: t(lang, 'versionSource.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { action, json };
}

function renderRepoVersionSourceSummary(report: RepoVersionSourceReport, lang: CliLang): string {
	const authorityParts = [
		`source ${report.counts.source_authority_sources}`,
		`derived ${report.counts.derived_authority_sources}`,
		`unclassified ${report.counts.unclassified_authority_sources}`,
	];
	const lines = [
		t(lang, 'versionSource.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_VERSION_SOURCE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'versionSource.label.versioning')}: ${
			report.versioning_enabled ? t(lang, 'versionSources.value.enabled') : t(lang, 'versionSources.value.disabled')
		}`,
		`${t(lang, 'versionSource.label.sources')}: ${report.counts.sources}`,
		`${t(lang, 'versionSource.label.sourceAuthorities')}: ${authorityParts.join(', ')}`,
	];

	for (const source of report.sources) {
		const metadata = [source.kind, source.declared ? 'declared' : undefined, source.authority].filter(Boolean).join(', ');
		lines.push(`- ${source.path} (${metadata})`);
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'versionSource.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'versionSource.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.sources.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'versionSources.noSources'));
	}

	return lines.join('\n');
}

export function runRepoVersionSourceScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoVersionSourceHelp(lang));
		return 0;
	}

	const options = parseRepoVersionSourceOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/version-source --help',
			getRepoVersionSourceHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectRepoVersionSource(resolveMustflowRoot());
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoVersionSourceSummary(report, lang));
	return report.ok ? 0 : 1;
}
