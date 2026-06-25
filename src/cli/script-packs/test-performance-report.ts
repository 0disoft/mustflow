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
	createTestPerformanceReport,
	TEST_PERFORMANCE_REPORT_SCRIPT_REF,
	type TestPerformanceReport,
} from '../../core/test-performance-report.js';

const TEST_PERFORMANCE_REPORT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-samples', kind: 'string' },
	{ name: '--max-intents', kind: 'string' },
	{ name: '--max-test-files', kind: 'string' },
	{ name: '--max-findings', kind: 'string' },
	{ name: '--slow-ms', kind: 'string' },
	{ name: '--timeout-ratio', kind: 'string' },
	{ name: '--phase-ms', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedTestPerformanceReportOptions {
	readonly action: 'summarize';
	readonly json: boolean;
	readonly maxSamples: number | null;
	readonly maxIntents: number | null;
	readonly maxTestFiles: number | null;
	readonly maxFindings: number | null;
	readonly slowMs: number | null;
	readonly timeoutRatio: number | null;
	readonly phaseMs: number | null;
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
		return { value: null, error: t(lang, 'testPerformance.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'testPerformance.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

function parsePositiveRatio(
	value: string | null,
	option: string,
	lang: CliLang,
): { readonly value: number | null; readonly error?: string } {
	if (value === null) {
		return { value: null };
	}
	const parsed = Number(value);
	if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 1) {
		return { value: null, error: t(lang, 'testPerformance.error.invalidRatio', { option, value }) };
	}
	return { value: parsed };
}

export function getTestPerformanceReportHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run test/performance-report summarize [options]',
			summary: t(lang, 'testPerformance.help.summary'),
			options: [
				{ label: '--max-samples <count>', description: t(lang, 'testPerformance.help.option.maxSamples') },
				{ label: '--max-intents <count>', description: t(lang, 'testPerformance.help.option.maxIntents') },
				{ label: '--max-test-files <count>', description: t(lang, 'testPerformance.help.option.maxTestFiles') },
				{ label: '--max-findings <count>', description: t(lang, 'testPerformance.help.option.maxFindings') },
				{ label: '--slow-ms <ms>', description: t(lang, 'testPerformance.help.option.slowMs') },
				{ label: '--timeout-ratio <ratio>', description: t(lang, 'testPerformance.help.option.timeoutRatio') },
				{ label: '--phase-ms <ms>', description: t(lang, 'testPerformance.help.option.phaseMs') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run test/performance-report summarize --json',
				'mf script-pack run test/performance-report summarize --max-samples 100 --slow-ms 60000 --json',
				'mf script-pack run test/performance-report summarize --timeout-ratio 0.8 --phase-ms 15000',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'testPerformance.help.exit.ok') },
				{ label: '1', description: t(lang, 'testPerformance.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseTestPerformanceReportOptions(
	args: readonly string[],
	lang: CliLang,
): ParsedTestPerformanceReportOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, TEST_PERFORMANCE_REPORT_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');
	const maxSamples = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-samples'), '--max-samples', lang);
	const maxIntents = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-intents'), '--max-intents', lang);
	const maxTestFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-test-files'), '--max-test-files', lang);
	const maxFindings = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-findings'), '--max-findings', lang);
	const slowMs = parsePositiveInteger(getParsedCliStringOption(parsed, '--slow-ms'), '--slow-ms', lang);
	const timeoutRatio = parsePositiveRatio(getParsedCliStringOption(parsed, '--timeout-ratio'), '--timeout-ratio', lang);
	const phaseMs = parsePositiveInteger(getParsedCliStringOption(parsed, '--phase-ms'), '--phase-ms', lang);

	if (action !== 'summarize') {
		return {
			action: 'summarize',
			json,
			maxSamples: maxSamples.value,
			maxIntents: maxIntents.value,
			maxTestFiles: maxTestFiles.value,
			maxFindings: maxFindings.value,
			slowMs: slowMs.value,
			timeoutRatio: timeoutRatio.value,
			phaseMs: phaseMs.value,
			error: action ? t(lang, 'testPerformance.error.unknownAction', { action }) : t(lang, 'testPerformance.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			maxSamples: maxSamples.value,
			maxIntents: maxIntents.value,
			maxTestFiles: maxTestFiles.value,
			maxFindings: maxFindings.value,
			slowMs: slowMs.value,
			timeoutRatio: timeoutRatio.value,
			phaseMs: phaseMs.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxSamples, maxIntents, maxTestFiles, maxFindings, slowMs, timeoutRatio, phaseMs]) {
		if (candidate.error) {
			return {
				action,
				json,
				maxSamples: maxSamples.value,
				maxIntents: maxIntents.value,
				maxTestFiles: maxTestFiles.value,
				maxFindings: maxFindings.value,
				slowMs: slowMs.value,
				timeoutRatio: timeoutRatio.value,
				phaseMs: phaseMs.value,
				error: candidate.error,
			};
		}
	}

	return {
		action,
		json,
		maxSamples: maxSamples.value,
		maxIntents: maxIntents.value,
		maxTestFiles: maxTestFiles.value,
		maxFindings: maxFindings.value,
		slowMs: slowMs.value,
		timeoutRatio: timeoutRatio.value,
		phaseMs: phaseMs.value,
	};
}

function renderTestPerformanceReportSummary(report: TestPerformanceReport, lang: CliLang): string {
	const lines = [
		t(lang, 'testPerformance.title'),
		`${t(lang, 'scriptPack.label.script')}: ${TEST_PERFORMANCE_REPORT_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'testPerformance.label.samples')}: ${report.summary.sample_count}`,
		`${t(lang, 'testPerformance.label.intents')}: ${report.summary.intent_count}`,
		`${t(lang, 'testPerformance.label.testFiles')}: ${report.summary.test_file_count}`,
		`${t(lang, 'testPerformance.label.findings')}: ${report.findings.length}`,
		`${t(lang, 'testPerformance.label.truncated')}: ${report.truncated ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (report.intents.length > 0) {
		lines.push(t(lang, 'testPerformance.label.slowestIntents'));
		for (const entry of report.intents.slice(0, 20)) {
			lines.push(
				`- ${entry.intent}: p95 ${entry.p95_duration_ms}ms, max ${entry.max_duration_ms}ms, ` +
					`${t(lang, 'testPerformance.label.failures')} ${entry.failure_count}`,
			);
		}
	}

	if (report.test_files.length > 0) {
		lines.push(t(lang, 'testPerformance.label.slowestTestFiles'));
		for (const testFile of report.test_files.slice(0, 20)) {
			lines.push(`- ${testFile.path}: ${testFile.duration_ms}ms, ${testFile.status}`);
		}
	}

	if (report.phases.length > 0) {
		lines.push(t(lang, 'testPerformance.label.slowestPhases'));
		for (const phase of report.phases.slice(0, 10)) {
			lines.push(`- ${phase.name}: p95 ${phase.p95_duration_ms}ms, max ${phase.max_duration_ms}ms`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'testPerformance.label.findings'));
		for (const finding of report.findings.slice(0, 40)) {
			const intent = finding.intent ? ` ${finding.intent}` : '';
			const phase = finding.phase ? ` ${finding.phase}` : '';
			lines.push(`- ${finding.code}${intent}${phase}: ${finding.message}`);
		}
	}

	if (report.next_actions.length > 0) {
		lines.push(t(lang, 'testPerformance.label.nextActions'));
		for (const action of report.next_actions) {
			const runHint = action.run_hint ? ` (${action.run_hint})` : '';
			lines.push(`- ${action.code}: ${action.message}${runHint}`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'testPerformance.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.summary.sample_count === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'testPerformance.clean'));
	}

	return lines.join('\n');
}

export function runTestPerformanceReportScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getTestPerformanceReportHelp(lang));
		return 0;
	}

	const options = parseTestPerformanceReportOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run test/performance-report --help',
			getTestPerformanceReportHelp(lang),
			lang,
		);
		return 1;
	}

	const report = createTestPerformanceReport(resolveMustflowRoot(), {
		maxSamples: options.maxSamples ?? undefined,
		maxIntents: options.maxIntents ?? undefined,
		maxTestFiles: options.maxTestFiles ?? undefined,
		maxFindings: options.maxFindings ?? undefined,
		slowSampleThresholdMs: options.slowMs ?? undefined,
		highTimeoutRatio: options.timeoutRatio ?? undefined,
		phaseBottleneckThresholdMs: options.phaseMs ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderTestPerformanceReportSummary(report, lang));
	return report.ok ? 0 : 1;
}
