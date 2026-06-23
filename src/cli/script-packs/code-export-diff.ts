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
	CODE_EXPORT_DIFF_SCRIPT_REF,
	inspectExportDiff,
	type ExportDiffReport,
} from '../../core/export-diff.js';

const EXPORT_DIFF_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--base', kind: 'string' },
	{ name: '--head', kind: 'string' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedExportDiffOptions {
	readonly action: 'compare';
	readonly json: boolean;
	readonly baseRef: string | null;
	readonly headRef: string | null;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
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
		return { value: null, error: t(lang, 'exportDiff.error.invalidPositiveInteger', { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'exportDiff.error.invalidPositiveInteger', { option, value }) };
	}

	return { value: parsed };
}

export function getCodeExportDiffHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/export-diff compare [path...] [options]',
			summary: t(lang, 'exportDiff.help.summary'),
			options: [
				{ label: '--base <ref>', description: t(lang, 'exportDiff.help.option.base') },
				{ label: '--head <ref>', description: t(lang, 'exportDiff.help.option.head') },
				{ label: '--max-files <count>', description: t(lang, 'exportDiff.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'exportDiff.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/export-diff compare --base HEAD --json',
				'mf script-pack run code/export-diff compare src --base HEAD~1 --head HEAD --json',
				'mf script-pack run code/export-diff compare src/index.ts --max-files 20 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'exportDiff.help.exit.ok') },
				{ label: '1', description: t(lang, 'exportDiff.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseExportDiffOptions(args: readonly string[], lang: CliLang): ParsedExportDiffOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, EXPORT_DIFF_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const baseRef = getParsedCliStringOption(parsed, '--base');
	const headRef = getParsedCliStringOption(parsed, '--head');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);

	if (action !== 'compare') {
		return {
			action: 'compare',
			json,
			baseRef,
			headRef,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			error: action ? t(lang, 'exportDiff.error.unknownAction', { action }) : t(lang, 'exportDiff.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			baseRef,
			headRef,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxFiles, maxFileBytes]) {
		if (candidate.error) {
			return {
				action,
				json,
				baseRef,
				headRef,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxFileBytes: maxFileBytes.value,
				error: candidate.error,
			};
		}
	}

	return {
		action,
		json,
		baseRef,
		headRef,
		paths: parsed.positionals,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
	};
}

function renderExportDiffSummary(report: ExportDiffReport, lang: CliLang): string {
	const lines = [
		t(lang, 'exportDiff.title'),
		`${t(lang, 'scriptPack.label.script')}: ${CODE_EXPORT_DIFF_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'exportDiff.label.files')}: ${report.summary.files_changed}`,
		`${t(lang, 'exportDiff.label.added')}: ${report.summary.added}`,
		`${t(lang, 'exportDiff.label.removed')}: ${report.summary.removed}`,
		`${t(lang, 'exportDiff.label.changed')}: ${report.summary.changed}`,
	];

	if (report.exports.length > 0) {
		lines.push(t(lang, 'exportDiff.label.exports'));
		for (const entry of report.exports.filter((candidate) => candidate.change !== 'unchanged')) {
			const beforeReturn = entry.before?.return_type ?? t(lang, 'value.none');
			const afterReturn = entry.after?.return_type ?? t(lang, 'value.none');
			lines.push(
				`- ${entry.path}: ${entry.change} ${entry.kind} ${entry.name} (${entry.compatibility}, ${beforeReturn} -> ${afterReturn})`,
			);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'exportDiff.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'exportDiff.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.exports.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'exportDiff.clean'));
	}

	return lines.join('\n');
}

export function runCodeExportDiffScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeExportDiffHelp(lang));
		return 0;
	}

	const options = parseExportDiffOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run code/export-diff --help', getCodeExportDiffHelp(lang), lang);
		return 1;
	}

	const report = inspectExportDiff(resolveMustflowRoot(), {
		baseRef: options.baseRef ?? undefined,
		headRef: options.headRef,
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderExportDiffSummary(report, lang));
	return report.ok ? 0 : 1;
}
