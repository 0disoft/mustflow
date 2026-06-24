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
import { inspectSecretRiskScan, SECRET_RISK_SCAN_SCRIPT_REF, type SecretRiskScanReport } from '../../core/secret-risk-scan.js';

const SECRET_RISK_SCAN_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-findings', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedSecretRiskScanOptions {
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
		return { value: null, error: t(lang, 'secretRiskScan.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'secretRiskScan.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getRepoSecretRiskScanHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/secret-risk-scan scan [path...] [options]',
			summary: t(lang, 'secretRiskScan.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'secretRiskScan.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'secretRiskScan.help.option.maxFileBytes') },
				{ label: '--max-findings <count>', description: t(lang, 'secretRiskScan.help.option.maxFindings') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/secret-risk-scan scan --json',
				'mf script-pack run repo/secret-risk-scan scan src README.md --json',
				'mf script-pack run repo/secret-risk-scan scan .env.example docs --max-findings 50 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'secretRiskScan.help.exit.ok') },
				{ label: '1', description: t(lang, 'secretRiskScan.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseSecretRiskScanOptions(args: readonly string[], lang: CliLang): ParsedSecretRiskScanOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, SECRET_RISK_SCAN_OPTIONS, { allowPositionals: true });
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
			error: action ? t(lang, 'secretRiskScan.error.unknownAction', { action }) : t(lang, 'secretRiskScan.error.missingAction'),
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

function renderSecretRiskScanSummary(report: SecretRiskScanReport, lang: CliLang): string {
	const lines = [
		t(lang, 'secretRiskScan.title'),
		`${t(lang, 'scriptPack.label.script')}: ${SECRET_RISK_SCAN_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'secretRiskScan.label.files')}: ${report.summary.file_count}`,
		`${t(lang, 'secretRiskScan.label.findings')}: ${report.summary.finding_count}`,
		`${t(lang, 'secretRiskScan.label.highOrCritical')}: ${report.summary.high_or_critical_count}`,
		`${t(lang, 'secretRiskScan.label.skippedSecretFiles')}: ${report.summary.skipped_secret_file_count}`,
		`${t(lang, 'secretRiskScan.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (report.findings.length > 0) {
		lines.push(t(lang, 'secretRiskScan.label.findings'));
		for (const finding of report.findings.slice(0, 40)) {
			const line = finding.line ? `:${finding.line}` : '';
			const detector = finding.detector ? ` ${finding.detector}` : '';
			lines.push(`- ${finding.path}${line}: ${finding.code}${detector} (${finding.message})`);
		}
	}
	if (report.issues.length > 0) {
		lines.push(t(lang, 'secretRiskScan.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}
	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'secretRiskScan.clean'));
	}
	return lines.join('\n');
}

export function runRepoSecretRiskScanScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoSecretRiskScanHelp(lang));
		return 0;
	}

	const options = parseSecretRiskScanOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run repo/secret-risk-scan --help', getRepoSecretRiskScanHelp(lang), lang);
		return 1;
	}

	const report = inspectSecretRiskScan(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxFindings: options.maxFindings ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderSecretRiskScanSummary(report, lang));
	return report.ok ? 0 : 1;
}
