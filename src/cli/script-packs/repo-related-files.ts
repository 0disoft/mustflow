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
	inspectRelatedFiles,
	RELATED_FILES_SCRIPT_REF,
	type RelatedFilesReport,
} from '../../core/related-files.js';

const RELATED_FILES_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-candidates', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedRelatedFilesOptions {
	readonly action: 'map';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly maxCandidates: number | null;
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
		return { value: null, error: t(lang, 'relatedFiles.error.invalidPositiveInteger', { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'relatedFiles.error.invalidPositiveInteger', { option, value }) };
	}

	return { value: parsed };
}

export function getRepoRelatedFilesHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/related-files map <path...> [options]',
			summary: t(lang, 'relatedFiles.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'relatedFiles.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'relatedFiles.help.option.maxFileBytes') },
				{ label: '--max-candidates <count>', description: t(lang, 'relatedFiles.help.option.maxCandidates') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/related-files map src/cli/index.ts --json',
				'mf script-pack run repo/related-files map src/core/code-outline.ts --max-candidates 50 --json',
				'mf script-pack run repo/related-files map src tests/cli/package.test.js --max-files 500 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'relatedFiles.help.exit.ok') },
				{ label: '1', description: t(lang, 'relatedFiles.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseRelatedFilesOptions(args: readonly string[], lang: CliLang): ParsedRelatedFilesOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, RELATED_FILES_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);
	const maxCandidates = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-candidates'), '--max-candidates', lang);

	if (action !== 'map') {
		return {
			action: 'map',
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxCandidates: maxCandidates.value,
			error: action ? t(lang, 'relatedFiles.error.unknownAction', { action }) : t(lang, 'relatedFiles.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxCandidates: maxCandidates.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxFiles, maxFileBytes, maxCandidates]) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxFileBytes: maxFileBytes.value,
				maxCandidates: maxCandidates.value,
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
			maxCandidates: maxCandidates.value,
			error: t(lang, 'relatedFiles.error.missingPath'),
		};
	}

	return {
		action,
		json,
		paths: parsed.positionals,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
		maxCandidates: maxCandidates.value,
	};
}

function renderRelatedFilesSummary(report: RelatedFilesReport, lang: CliLang): string {
	const lines = [
		t(lang, 'relatedFiles.title'),
		`${t(lang, 'scriptPack.label.script')}: ${RELATED_FILES_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'relatedFiles.label.targets')}: ${report.targets.length}`,
		`${t(lang, 'relatedFiles.label.candidates')}: ${report.candidates.length}`,
		`${t(lang, 'relatedFiles.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (report.candidates.length > 0) {
		lines.push(t(lang, 'relatedFiles.label.related'));
		for (const candidate of report.candidates) {
			const line = candidate.line === null ? '' : `:${candidate.line}`;
			lines.push(
				`- ${candidate.path}: ${candidate.relationship}, ${t(lang, 'relatedFiles.label.confidence')} ${candidate.confidence} (${candidate.source_path}${line})`,
			);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'relatedFiles.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'relatedFiles.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.candidates.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'relatedFiles.clean'));
	}

	return lines.join('\n');
}

export function runRepoRelatedFilesScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoRelatedFilesHelp(lang));
		return 0;
	}

	const options = parseRelatedFilesOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/related-files --help',
			getRepoRelatedFilesHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectRelatedFiles(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxCandidates: options.maxCandidates ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRelatedFilesSummary(report, lang));
	return report.ok ? 0 : 1;
}
