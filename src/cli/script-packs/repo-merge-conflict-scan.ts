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
	checkRepoMergeConflictScan,
	REPO_MERGE_CONFLICT_SCAN_SCRIPT_REF,
	type MergeConflictScanReport,
} from '../../core/repo-merge-conflict-scan.js';

const REPO_MERGE_CONFLICT_SCAN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoMergeConflictScanOptions {
	readonly action: 'check';
	readonly paths: readonly string[];
	readonly json: boolean;
	readonly maxFiles?: number;
	readonly maxFileBytes?: number;
	readonly error?: string;
}

export function getRepoMergeConflictScanHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/merge-conflict-scan check [path...] [options]',
			summary: t(lang, 'mergeConflictScan.help.summary'),
			options: [
				{ label: '--max-files <n>', description: t(lang, 'mergeConflictScan.help.option.maxFiles') },
				{ label: '--max-file-bytes <n>', description: t(lang, 'mergeConflictScan.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/merge-conflict-scan check --json',
				'mf script-pack run repo/merge-conflict-scan check src README.md --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'mergeConflictScan.help.exit.ok') },
				{ label: '1', description: t(lang, 'mergeConflictScan.help.exit.fail') },
			],
		},
		lang,
	);
}

function parsePositiveInteger(value: string | undefined, label: string, lang: CliLang): number | undefined | string {
	if (value === undefined) {
		return undefined;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return t(lang, 'mergeConflictScan.error.invalidPositiveInteger', { option: label });
	}

	return parsed;
}

function parseRepoMergeConflictScanOptions(args: readonly string[], lang: CliLang): ParsedRepoMergeConflictScanOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_MERGE_CONFLICT_SCAN_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'check') {
		return {
			action: 'check',
			paths: parsed.positionals,
			json,
			error: action
				? t(lang, 'mergeConflictScan.error.unknownAction', { action })
				: t(lang, 'mergeConflictScan.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, paths: parsed.positionals, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files') ?? undefined, '--max-files', lang);
	if (typeof maxFiles === 'string') {
		return { action, paths: parsed.positionals, json, error: maxFiles };
	}

	const maxFileBytes = parsePositiveInteger(
		getParsedCliStringOption(parsed, '--max-file-bytes') ?? undefined,
		'--max-file-bytes',
		lang,
	);
	if (typeof maxFileBytes === 'string') {
		return { action, paths: parsed.positionals, json, error: maxFileBytes };
	}

	return {
		action,
		paths: parsed.positionals,
		json,
		maxFiles,
		maxFileBytes,
	};
}

function renderRepoMergeConflictScanSummary(report: MergeConflictScanReport, lang: CliLang): string {
	const lines = [
		t(lang, 'mergeConflictScan.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_MERGE_CONFLICT_SCAN_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'mergeConflictScan.label.filesChecked')}: ${report.summary.files_checked}`,
		`${t(lang, 'mergeConflictScan.label.markersFound')}: ${report.summary.markers_found}`,
	];

	if (report.markers.length > 0) {
		lines.push(t(lang, 'mergeConflictScan.label.markers'));
		for (const marker of report.markers) {
			lines.push(`- ${marker.path}:${marker.line}:${marker.column} ${marker.marker}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'mergeConflictScan.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'mergeConflictScan.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.markers.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'mergeConflictScan.clean'));
	}

	return lines.join('\n');
}

export function runRepoMergeConflictScanScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoMergeConflictScanHelp(lang));
		return 0;
	}

	const options = parseRepoMergeConflictScanOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/merge-conflict-scan --help',
			getRepoMergeConflictScanHelp(lang),
			lang,
		);
		return 1;
	}

	const report = checkRepoMergeConflictScan(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles,
		maxFileBytes: options.maxFileBytes,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoMergeConflictScanSummary(report, lang));
	return report.ok ? 0 : 1;
}
