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
	inspectRepoToolchainProvenance,
	REPO_TOOLCHAIN_PROVENANCE_SCRIPT_REF,
	type RepoToolchainProvenanceReport,
} from '../../core/repo-toolchain-provenance.js';

const REPO_TOOLCHAIN_PROVENANCE_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoToolchainProvenanceOptions {
	readonly action: 'inspect';
	readonly json: boolean;
	readonly error?: string;
}

export function getRepoToolchainProvenanceHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/toolchain-provenance inspect [options]',
			summary: t(lang, 'toolchainProvenance.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/toolchain-provenance inspect',
				'mf script-pack run repo/toolchain-provenance inspect --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'toolchainProvenance.help.exit.ok') },
				{ label: '1', description: t(lang, 'toolchainProvenance.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseRepoToolchainProvenanceOptions(args: readonly string[], lang: CliLang): ParsedRepoToolchainProvenanceOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_TOOLCHAIN_PROVENANCE_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'inspect') {
		return {
			action: 'inspect',
			json,
			error: action
				? t(lang, 'toolchainProvenance.error.unknownAction', { action })
				: t(lang, 'toolchainProvenance.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { action, json };
}

function renderRepoToolchainProvenanceSummary(report: RepoToolchainProvenanceReport, lang: CliLang): string {
	const lines = [
		t(lang, 'toolchainProvenance.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_TOOLCHAIN_PROVENANCE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'toolchainProvenance.label.sources')}: ${report.summary.source_count}`,
		`${t(lang, 'toolchainProvenance.label.lockfiles')}: ${report.summary.lockfile_count}`,
		`${t(lang, 'toolchainProvenance.label.findings')}: ${report.summary.finding_count}`,
	];

	if (report.sources.length > 0) {
		lines.push(t(lang, 'toolchainProvenance.label.sourceDetails'));
		for (const source of report.sources) {
			const location = source.line === null ? source.path : `${source.path}:${source.line}`;
			lines.push(`- ${source.kind} ${source.key}=${source.value} (${source.source_kind}, ${location})`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'toolchainProvenance.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'toolchainProvenance.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.sources.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'toolchainProvenance.clean'));
	}

	return lines.join('\n');
}

export function runRepoToolchainProvenanceScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoToolchainProvenanceHelp(lang));
		return 0;
	}

	const options = parseRepoToolchainProvenanceOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/toolchain-provenance --help',
			getRepoToolchainProvenanceHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectRepoToolchainProvenance(resolveMustflowRoot());
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoToolchainProvenanceSummary(report, lang));
	return report.ok ? 0 : 1;
}
