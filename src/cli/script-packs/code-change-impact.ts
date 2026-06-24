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
import { CHANGE_IMPACT_SCRIPT_REF, inspectChangeImpact, type ChangeImpactReport } from '../../core/change-impact.js';

const CHANGE_IMPACT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--base', kind: 'string' },
	{ name: '--head', kind: 'string' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-impacts', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedChangeImpactOptions {
	readonly action: 'analyze';
	readonly json: boolean;
	readonly baseRef: string | null;
	readonly headRef: string | null;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxImpacts: number | null;
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
		return { value: null, error: t(lang, 'changeImpact.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'changeImpact.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getCodeChangeImpactHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/change-impact analyze [path...] [options]',
			summary: t(lang, 'changeImpact.help.summary'),
			options: [
				{ label: '--base <ref>', description: t(lang, 'changeImpact.help.option.base') },
				{ label: '--head <ref>', description: t(lang, 'changeImpact.help.option.head') },
				{ label: '--max-files <count>', description: t(lang, 'changeImpact.help.option.maxFiles') },
				{ label: '--max-impacts <count>', description: t(lang, 'changeImpact.help.option.maxImpacts') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'changeImpact.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/change-impact analyze --base HEAD --json',
				'mf script-pack run code/change-impact analyze src --base main --head HEAD --json',
				'mf script-pack run code/change-impact analyze src/core --max-impacts 80 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'changeImpact.help.exit.ok') },
				{ label: '1', description: t(lang, 'changeImpact.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseChangeImpactOptions(args: readonly string[], lang: CliLang): ParsedChangeImpactOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, CHANGE_IMPACT_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const baseRef = getParsedCliStringOption(parsed, '--base');
	const headRef = getParsedCliStringOption(parsed, '--head');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxImpacts = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-impacts'), '--max-impacts', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);
	const positiveOptions = [maxFiles, maxImpacts, maxFileBytes];

	if (action !== 'analyze') {
		return {
			action: 'analyze',
			json,
			baseRef,
			headRef,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxImpacts: maxImpacts.value,
			maxFileBytes: maxFileBytes.value,
			error: action ? t(lang, 'changeImpact.error.unknownAction', { action }) : t(lang, 'changeImpact.error.missingAction'),
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
			maxImpacts: maxImpacts.value,
			maxFileBytes: maxFileBytes.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}
	for (const candidate of positiveOptions) {
		if (candidate.error) {
			return {
				action,
				json,
				baseRef,
				headRef,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxImpacts: maxImpacts.value,
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
		maxImpacts: maxImpacts.value,
		maxFileBytes: maxFileBytes.value,
	};
}

function renderChangeImpactSummary(report: ChangeImpactReport, lang: CliLang): string {
	const lines = [
		t(lang, 'changeImpact.title'),
		`${t(lang, 'scriptPack.label.script')}: ${CHANGE_IMPACT_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'changeImpact.label.changedFiles')}: ${report.changed_files.length}`,
		`${t(lang, 'changeImpact.label.impacts')}: ${report.impacts.length}`,
		`${t(lang, 'changeImpact.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	for (const impact of report.impacts.slice(0, 40)) {
		lines.push(`- ${impact.path}: ${impact.relationship} (${impact.reason})`);
	}

	if (report.script_hints.length > 0) {
		lines.push(t(lang, 'changeImpact.label.scriptHints'));
		for (const hint of report.script_hints) {
			lines.push(`- ${hint.script_ref}: ${hint.command}`);
		}
	}
	if (report.verification_hints.length > 0) {
		lines.push(t(lang, 'changeImpact.label.verificationHints'));
		for (const hint of report.verification_hints) {
			lines.push(`- ${hint.intent}: ${hint.reason}`);
		}
	}
	if (report.findings.length > 0) {
		lines.push(
			t(lang, 'changeImpact.label.findings'),
			...report.findings.map((finding) => `- ${finding.path}: ${finding.code} (${finding.message})`),
		);
	}
	if (report.issues.length > 0) {
		lines.push(t(lang, 'changeImpact.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}
	if (report.changed_files.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'changeImpact.clean'));
	}
	return lines.join('\n');
}

export function runCodeChangeImpactScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeChangeImpactHelp(lang));
		return 0;
	}

	const options = parseChangeImpactOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run code/change-impact --help', getCodeChangeImpactHelp(lang), lang);
		return 1;
	}

	const report = inspectChangeImpact(resolveMustflowRoot(), {
		baseRef: options.baseRef ?? undefined,
		headRef: options.headRef,
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxImpacts: options.maxImpacts ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderChangeImpactSummary(report, lang));
	return report.ok ? 0 : 1;
}
