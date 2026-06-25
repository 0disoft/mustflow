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
	createTestRegressionSelectorReport,
	TEST_REGRESSION_SELECTOR_SCRIPT_REF,
	type TestRegressionSelectorReport,
} from '../../core/test-regression-selector.js';

const TEST_REGRESSION_SELECTOR_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--base', kind: 'string' },
	{ name: '--head', kind: 'string' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-tests', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedTestRegressionSelectorOptions {
	readonly action: 'select';
	readonly json: boolean;
	readonly baseRef: string | null;
	readonly headRef: string | null;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxTests: number | null;
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
		return { value: null, error: t(lang, 'testRegressionSelector.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'testRegressionSelector.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getTestRegressionSelectorHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run test/regression-selector select [path...] [options]',
			summary: t(lang, 'testRegressionSelector.help.summary'),
			options: [
				{ label: '--base <ref>', description: t(lang, 'testRegressionSelector.help.option.base') },
				{ label: '--head <ref>', description: t(lang, 'testRegressionSelector.help.option.head') },
				{ label: '--max-files <count>', description: t(lang, 'testRegressionSelector.help.option.maxFiles') },
				{ label: '--max-tests <count>', description: t(lang, 'testRegressionSelector.help.option.maxTests') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run test/regression-selector select --base HEAD --json',
				'mf script-pack run test/regression-selector select src tests --base main --head HEAD --json',
				'mf script-pack run test/regression-selector select --max-tests 20',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'testRegressionSelector.help.exit.ok') },
				{ label: '1', description: t(lang, 'testRegressionSelector.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseTestRegressionSelectorOptions(
	args: readonly string[],
	lang: CliLang,
): ParsedTestRegressionSelectorOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, TEST_REGRESSION_SELECTOR_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const baseRef = getParsedCliStringOption(parsed, '--base');
	const headRef = getParsedCliStringOption(parsed, '--head');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxTests = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-tests'), '--max-tests', lang);

	if (action !== 'select') {
		return {
			action: 'select',
			json,
			baseRef,
			headRef,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxTests: maxTests.value,
			error: action
				? t(lang, 'testRegressionSelector.error.unknownAction', { action })
				: t(lang, 'testRegressionSelector.error.missingAction'),
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
			maxTests: maxTests.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxFiles, maxTests]) {
		if (candidate.error) {
			return {
				action,
				json,
				baseRef,
				headRef,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxTests: maxTests.value,
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
		maxTests: maxTests.value,
	};
}

function renderTestRegressionSelectorSummary(report: TestRegressionSelectorReport, lang: CliLang): string {
	const lines = [
		t(lang, 'testRegressionSelector.title'),
		`${t(lang, 'scriptPack.label.script')}: ${TEST_REGRESSION_SELECTOR_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'testRegressionSelector.label.selectionStatus')}: ${report.summary.selection_status}`,
		`${t(lang, 'testRegressionSelector.label.changedFiles')}: ${report.summary.changed_file_count}`,
		`${t(lang, 'testRegressionSelector.label.selectedTests')}: ${report.summary.selected_test_count}`,
		`${t(lang, 'testRegressionSelector.label.fallbacks')}: ${report.summary.fallback_count}`,
		`${t(lang, 'testRegressionSelector.label.recommendedIntent')}: ${report.summary.recommended_intent}`,
	];

	if (report.selected_tests.length > 0) {
		lines.push(t(lang, 'testRegressionSelector.label.selectedTests'));
		for (const testCandidate of report.selected_tests.slice(0, 40)) {
			lines.push(`- ${testCandidate.path}: ${testCandidate.reason} (${testCandidate.source_path})`);
		}
	}

	if (report.fallbacks.length > 0) {
		lines.push(t(lang, 'testRegressionSelector.label.fallbacks'));
		for (const fallback of report.fallbacks) {
			lines.push(`- ${fallback.path}: ${fallback.reason} (${fallback.recommended_intent})`);
		}
	}

	if (report.run_hint) {
		lines.push(`${t(lang, 'testRegressionSelector.label.runHint')}: ${report.run_hint}`);
	}

	if (report.findings.length > 0) {
		lines.push(
			t(lang, 'testRegressionSelector.label.findings'),
			...report.findings.map((finding) => `- ${finding.path}: ${finding.code} (${finding.message})`),
		);
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'testRegressionSelector.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.changed_files.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'testRegressionSelector.clean'));
	}

	return lines.join('\n');
}

export function runTestRegressionSelectorScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getTestRegressionSelectorHelp(lang));
		return 0;
	}

	const options = parseTestRegressionSelectorOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run test/regression-selector --help',
			getTestRegressionSelectorHelp(lang),
			lang,
		);
		return 1;
	}

	const report = createTestRegressionSelectorReport(resolveMustflowRoot(), {
		baseRef: options.baseRef ?? undefined,
		headRef: options.headRef,
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxTests: options.maxTests ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderTestRegressionSelectorSummary(report, lang));
	return report.ok ? 0 : 1;
}
