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
	inspectSecurityPatternScan,
	SECURITY_PATTERN_SCAN_SCRIPT_REF,
	type SecurityPatternScanReport,
} from '../../core/security-pattern-scan.js';

const SECURITY_PATTERN_SCAN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-findings', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedSecurityPatternScanOptions {
	readonly action: 'scan';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly maxFindings: number | null;
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
		return { value: null, error: t(lang, 'securityPatternScan.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'securityPatternScan.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getRepoSecurityPatternScanHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/security-pattern-scan scan [path...] [options]',
			summary: t(lang, 'securityPatternScan.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'securityPatternScan.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'securityPatternScan.help.option.maxFileBytes') },
				{ label: '--max-findings <count>', description: t(lang, 'securityPatternScan.help.option.maxFindings') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/security-pattern-scan scan --json',
				'mf script-pack run repo/security-pattern-scan scan src .github/workflows --json',
				'mf script-pack run repo/security-pattern-scan scan src/server.ts --max-findings 50 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'securityPatternScan.help.exit.ok') },
				{ label: '1', description: t(lang, 'securityPatternScan.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseSecurityPatternScanOptions(args: readonly string[], lang: CliLang): ParsedSecurityPatternScanOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, SECURITY_PATTERN_SCAN_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);
	const maxFindings = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-findings'), '--max-findings', lang);

	if (action !== 'scan') {
		return {
			action: 'scan',
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxFindings: maxFindings.value,
			error: action
				? t(lang, 'securityPatternScan.error.unknownAction', { action })
				: t(lang, 'securityPatternScan.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			maxFindings: maxFindings.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxFiles, maxFileBytes, maxFindings]) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxFileBytes: maxFileBytes.value,
				maxFindings: maxFindings.value,
				error: candidate.error,
			};
		}
	}

	return {
		action,
		json,
		paths: parsed.positionals,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
		maxFindings: maxFindings.value,
	};
}

function renderSecurityPatternScanSummary(report: SecurityPatternScanReport, lang: CliLang): string {
	const lines = [
		t(lang, 'securityPatternScan.title'),
		`${t(lang, 'scriptPack.label.script')}: ${SECURITY_PATTERN_SCAN_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'securityPatternScan.label.files')}: ${report.summary.file_count}`,
		`${t(lang, 'securityPatternScan.label.findings')}: ${report.summary.finding_count}`,
		`${t(lang, 'securityPatternScan.label.categories')}: ${report.summary.category_count}`,
		`${t(lang, 'securityPatternScan.label.highOrCritical')}: ${report.summary.high_or_critical_count}`,
		`${t(lang, 'securityPatternScan.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (report.findings.length > 0) {
		lines.push(t(lang, 'securityPatternScan.label.findings'));
		for (const finding of report.findings.slice(0, 40)) {
			const line = finding.line ? `:${finding.line}` : '';
			const detector = finding.detector ? ` ${finding.detector}` : '';
			const focus = finding.review_focus ? ` ${t(lang, 'securityPatternScan.label.reviewFocus')}: ${finding.review_focus}` : '';
			lines.push(`- ${finding.path}${line}: ${finding.code}${detector} (${finding.message})${focus}`);
		}
	}
	if (report.issues.length > 0) {
		lines.push(t(lang, 'securityPatternScan.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}
	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'securityPatternScan.clean'));
	}
	return lines.join('\n');
}

export function runRepoSecurityPatternScanScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoSecurityPatternScanHelp(lang));
		return 0;
	}

	const options = parseSecurityPatternScanOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/security-pattern-scan --help',
			getRepoSecurityPatternScanHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectSecurityPatternScan(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxFindings: options.maxFindings ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderSecurityPatternScanSummary(report, lang));
	return report.ok ? 0 : 1;
}
