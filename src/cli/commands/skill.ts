import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type ParsedCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { resolveSkillRoutes } from '../../core/skill-route-resolution.js';

const SKILL_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--task', kind: 'string' },
	{ name: '--path', kind: 'string' },
	{ name: '--reason', kind: 'string' },
	{ name: '--max-candidates', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedSkillArgs {
	readonly json: boolean;
	readonly action: string | null;
	readonly taskText: string | null;
	readonly paths: readonly string[];
	readonly reasons: readonly string[];
	readonly maxCandidates: number | undefined;
	readonly error?: ReturnType<typeof parseCliOptions>['error'];
}

export function getSkillHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf skill route [options]',
			summary: t(lang, 'command.skill.summary'),
			options: [
				{ label: '--task <text>', description: 'Task text used for route scoring' },
				{ label: '--path <path>', description: 'Changed or expected path; may be repeated' },
				{ label: '--reason <reason>', description: 'Classification or verification reason; may be repeated' },
				{ label: '--max-candidates <count>', description: 'Maximum candidates to return, from 1 to 10' },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json',
				'mf skill route --reason docs_change --path docs-site/src/content/docs/en/commands/context.md',
			],
			exitCodes: [
				{ label: '0', description: 'Skill route candidates were resolved' },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function parseMaxCandidates(value: string | null): number | undefined {
	if (value === null) {
		return undefined;
	}

	const parsed = Number(value);
	return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function getParsedCliStringOptions(parsed: ParsedCliOptions, name: string): string[] {
	return parsed.occurrences
		.filter((occurrence) => occurrence.name === name && typeof occurrence.value === 'string')
		.map((occurrence) => occurrence.value as string);
}

function parseSkillArgs(args: readonly string[]): ParsedSkillArgs {
	const parsed = parseCliOptions(args, SKILL_OPTIONS, { allowPositionals: true });
	return {
		json: hasParsedCliOption(parsed, '--json'),
		action: parsed.positionals[0] ?? null,
		taskText: getParsedCliStringOption(parsed, '--task'),
		paths: getParsedCliStringOptions(parsed, '--path'),
		reasons: getParsedCliStringOptions(parsed, '--reason'),
		maxCandidates: parseMaxCandidates(getParsedCliStringOption(parsed, '--max-candidates')),
		error: parsed.error,
	};
}

function renderSkillRouteReport(report: ReturnType<typeof resolveSkillRoutes>, lang: CliLang): string {
	const lines = [
		'mustflow skill route',
		`${t(lang, 'label.mustflowRoot')}: ${resolveMustflowRoot()}`,
		`selected_main: ${report.selected.main?.skill ?? t(lang, 'value.none')}`,
		`selected_adjuncts: ${report.selected.adjuncts.map((candidate) => candidate.skill).join(', ') || t(lang, 'value.none')}`,
		'',
		'Candidates',
	];

	if (report.candidates.length === 0) {
		lines.push(`- ${t(lang, 'value.none')}`);
	} else {
		for (const candidate of report.candidates) {
			lines.push(
				`- ${candidate.skill} (${candidate.route_type}, score ${candidate.score.toFixed(1)})`,
				`  path: ${candidate.skill_path}`,
				`  reasons: ${candidate.selection_reasons.join(', ') || t(lang, 'value.none')}`,
			);
		}
	}

	lines.push('', 'Source files', ...report.source_files.map((sourceFile) => `- ${sourceFile}`));
	return lines.join('\n');
}

export function runSkill(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getSkillHelp(lang));
		return 0;
	}

	const parsed = parseSkillArgs(args);

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf skill --help', getSkillHelp(lang), lang);
		return 1;
	}

	if (parsed.action !== 'route') {
		printUsageError(
			reporter,
			t(lang, parsed.action ? 'cli.error.unexpectedArgument' : 'cli.error.missingValue', {
				argument: parsed.action ?? '',
				option: 'route',
			}),
			'mf skill --help',
			getSkillHelp(lang),
			lang,
		);
		return 1;
	}

	if (Number.isNaN(parsed.maxCandidates)) {
		printUsageError(
			reporter,
			t(lang, 'cli.error.unexpectedValue', { option: '--max-candidates' }),
			'mf skill --help',
			getSkillHelp(lang),
			lang,
		);
		return 1;
	}

	const report = resolveSkillRoutes(resolveMustflowRoot(), {
		taskText: parsed.taskText,
		paths: parsed.paths,
		reasons: parsed.reasons,
		maxCandidates: parsed.maxCandidates,
	});

	if (parsed.json) {
		reporter.stdout(JSON.stringify({
			...report,
			command: 'skill',
			action: 'route',
		}, null, 2));
		return 0;
	}

	reporter.stdout(renderSkillRouteReport(report, lang));
	return 0;
}
