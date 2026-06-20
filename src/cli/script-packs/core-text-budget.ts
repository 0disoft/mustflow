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
	inspectTextBudget,
	TEXT_BUDGET_SCRIPT_REF,
	TEXT_BUDGET_UNITS,
	type TextBudgetReport,
	type TextBudgetUnit,
} from '../../core/text-budget.js';

const TEXT_BUDGET_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--min', kind: 'string' },
	{ name: '--max', kind: 'string' },
	{ name: '--exact', kind: 'string' },
	{ name: '--unit', kind: 'string' },
	{ name: '--json-pointer', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedTextBudgetOptions {
	readonly action: 'check';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly min: number | null;
	readonly max: number | null;
	readonly exact: number | null;
	readonly unit: TextBudgetUnit;
	readonly jsonPointer: string | null;
	readonly error?: string;
}

export function getCoreTextBudgetHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run core/text-budget check <path...> [options]',
			summary: t(lang, 'textBudget.help.summary'),
			options: [
				{ label: '--min <count>', description: t(lang, 'textBudget.help.option.min') },
				{ label: '--max <count>', description: t(lang, 'textBudget.help.option.max') },
				{ label: '--exact <count>', description: t(lang, 'textBudget.help.option.exact') },
				{ label: '--unit <unit>', description: t(lang, 'textBudget.help.option.unit') },
				{ label: '--json-pointer <pointer>', description: t(lang, 'textBudget.help.option.jsonPointer') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run core/text-budget check README.md --max 5000',
				'mf script-pack run core/text-budget check package.json --json-pointer /description --max 80 --json',
				'mf script-pack run core/text-budget check docs/intro.md --min 20 --max 120 --unit word',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'textBudget.help.exit.ok') },
				{ label: '1', description: t(lang, 'textBudget.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseNonNegativeInteger(value: string | null, option: string, lang: CliLang): { readonly value: number | null; readonly error?: string } {
	if (value === null) {
		return { value: null };
	}

	if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
		return { value: null, error: t(lang, 'textBudget.error.invalidNumber', { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'textBudget.error.invalidNumber', { option, value }) };
	}

	return { value: parsed };
}

function parseTextBudgetUnit(value: string | null, lang: CliLang): { readonly value: TextBudgetUnit; readonly error?: string } {
	if (value === null) {
		return { value: 'grapheme' };
	}

	if ((TEXT_BUDGET_UNITS as readonly string[]).includes(value)) {
		return { value: value as TextBudgetUnit };
	}

	return {
		value: 'grapheme',
		error: t(lang, 'textBudget.error.invalidUnit', { unit: value, allowed: TEXT_BUDGET_UNITS.join(', ') }),
	};
}

function parseTextBudgetOptions(args: readonly string[], lang: CliLang): ParsedTextBudgetOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, TEXT_BUDGET_OPTIONS, {
		allowPositionals: true,
		allowEmptyStringValues: true,
	});
	const json = hasParsedCliOption(parsed, '--json');
	const min = parseNonNegativeInteger(getParsedCliStringOption(parsed, '--min'), '--min', lang);
	const max = parseNonNegativeInteger(getParsedCliStringOption(parsed, '--max'), '--max', lang);
	const exact = parseNonNegativeInteger(getParsedCliStringOption(parsed, '--exact'), '--exact', lang);
	const unit = parseTextBudgetUnit(getParsedCliStringOption(parsed, '--unit'), lang);
	const jsonPointer = getParsedCliStringOption(parsed, '--json-pointer');

	if (action !== 'check') {
		return {
			action: 'check',
			json,
			paths: parsed.positionals,
			min: min.value,
			max: max.value,
			exact: exact.value,
			unit: unit.value,
			jsonPointer,
			error: action ? t(lang, 'textBudget.error.unknownAction', { action }) : t(lang, 'textBudget.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			min: min.value,
			max: max.value,
			exact: exact.value,
			unit: unit.value,
			jsonPointer,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [min, max, exact, unit]) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				min: min.value,
				max: max.value,
				exact: exact.value,
				unit: unit.value,
				jsonPointer,
				error: candidate.error,
			};
		}
	}

	if (parsed.positionals.length === 0) {
		return {
			action,
			json,
			paths: parsed.positionals,
			min: min.value,
			max: max.value,
			exact: exact.value,
			unit: unit.value,
			jsonPointer,
			error: t(lang, 'textBudget.error.missingPath'),
		};
	}

	if (exact.value !== null && (min.value !== null || max.value !== null)) {
		return {
			action,
			json,
			paths: parsed.positionals,
			min: min.value,
			max: max.value,
			exact: exact.value,
			unit: unit.value,
			jsonPointer,
			error: t(lang, 'textBudget.error.exactConflict'),
		};
	}

	if (exact.value === null && min.value === null && max.value === null) {
		return {
			action,
			json,
			paths: parsed.positionals,
			min: min.value,
			max: max.value,
			exact: exact.value,
			unit: unit.value,
			jsonPointer,
			error: t(lang, 'textBudget.error.missingBudget'),
		};
	}

	if (min.value !== null && max.value !== null && min.value > max.value) {
		return {
			action,
			json,
			paths: parsed.positionals,
			min: min.value,
			max: max.value,
			exact: exact.value,
			unit: unit.value,
			jsonPointer,
			error: t(lang, 'textBudget.error.minGreaterThanMax'),
		};
	}

	return {
		action,
		json,
		paths: parsed.positionals,
		min: min.value,
		max: max.value,
		exact: exact.value,
		unit: unit.value,
		jsonPointer,
	};
}

function renderBudget(report: TextBudgetReport): string {
	if (report.policy.exact !== null) {
		return `exact ${report.policy.exact} ${report.policy.unit}`;
	}

	const lower = report.policy.min === null ? null : `min ${report.policy.min}`;
	const upper = report.policy.max === null ? null : `max ${report.policy.max}`;
	return [lower, upper].filter((part): part is string => part !== null).join(', ') + ` ${report.policy.unit}`;
}

function renderTextBudgetSummary(report: TextBudgetReport, lang: CliLang): string {
	const lines = [
		t(lang, 'textBudget.title'),
		`${t(lang, 'scriptPack.label.script')}: ${TEXT_BUDGET_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'textBudget.label.budget')}: ${renderBudget(report)}`,
		`${t(lang, 'textBudget.label.checkedTargets')}: ${report.metrics.length}`,
		`${t(lang, 'textBudget.label.findings')}: ${report.findings.length}`,
	];

	if (report.metrics.length > 0) {
		lines.push(t(lang, 'textBudget.label.metrics'));
		for (const metric of report.metrics) {
			const pointer = metric.json_pointer === null ? '' : ` ${metric.json_pointer}`;
			lines.push(`- ${metric.path}${pointer}: ${metric.value} ${metric.unit}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'textBudget.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'textBudget.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'textBudget.clean'));
	}

	return lines.join('\n');
}

export function runCoreTextBudgetScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCoreTextBudgetHelp(lang));
		return 0;
	}

	const options = parseTextBudgetOptions(args, lang);

	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run core/text-budget --help',
			getCoreTextBudgetHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectTextBudget(resolveMustflowRoot(), {
		paths: options.paths,
		min: options.min,
		max: options.max,
		exact: options.exact,
		unit: options.unit,
		jsonPointer: options.jsonPointer,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderTextBudgetSummary(report, lang));
	return report.ok ? 0 : 1;
}
