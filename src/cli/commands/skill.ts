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
import { listScriptPackScripts } from '../lib/script-pack-registry.js';
import {
	createScriptPackSuggestionReport,
	type ScriptPackSuggestionReport,
} from '../../core/script-pack-suggestions.js';
import { resolveSkillRoutes } from '../../core/skill-route-resolution.js';
import {
	createExternalSkillImportReport,
	createExternalSkillUpdateReminder,
	createExternalSkillUpdateReport,
	type ExternalSkillImportReport,
	type ExternalSkillImportMode,
	type ExternalSkillUpdateReport,
} from '../lib/external-skill-import.js';

const SKILL_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--task', kind: 'string' },
	{ name: '--path', kind: 'string' },
	{ name: '--reason', kind: 'string' },
	{ name: '--max-candidates', kind: 'string' },
	{ name: '--install', kind: 'boolean' },
	{ name: '--dry-run', kind: 'boolean' },
	{ name: '--all', kind: 'boolean' },
	{ name: '--name', kind: 'string' },
	{ name: '--ref', kind: 'string' },
	{ name: '--trust-scripts', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedSkillArgs {
	readonly json: boolean;
	readonly action: string | null;
	readonly sourceUrl: string | null;
	readonly skillNames: readonly string[];
	readonly taskText: string | null;
	readonly paths: readonly string[];
	readonly reasons: readonly string[];
	readonly maxCandidates: number | undefined;
	readonly install: boolean;
	readonly dryRun: boolean;
	readonly all: boolean;
	readonly name: string | null;
	readonly ref: string | null;
	readonly trustScripts: boolean;
	readonly error?: ReturnType<typeof parseCliOptions>['error'];
}

type SkillRouteReport = ReturnType<typeof resolveSkillRoutes>;
type SkillRouteCandidate = SkillRouteReport['candidates'][number];
interface SkillRouteDependencyRead {
	readonly candidate: SkillRouteCandidate;
	readonly reason: string;
}
type SkillRouteScriptPackSuggestions = Pick<
	ScriptPackSuggestionReport,
	'status' | 'input' | 'analyzed_paths' | 'suggestions' | 'issues'
>;

export function getSkillHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf skill route [options]',
			summary: t(lang, 'command.skill.summary'),
			options: [
				{ label: 'route', description: 'Resolve installed skill route candidates' },
				{ label: 'import <github-url>', description: 'Preview or install an external SKILL.md under .mustflow/external-skills/' },
				{ label: 'outdated [skill-name...]', description: 'Check installed external skills for upstream file changes' },
				{ label: 'update <skill-name>|--all', description: 'Refresh installed external skills from their saved provenance source' },
				{ label: '--task <text>', description: 'Task text used for route scoring' },
				{ label: '--path <path>', description: 'Changed or expected path; may be repeated' },
				{ label: '--reason <reason>', description: 'Classification or verification reason; may be repeated' },
				{ label: '--max-candidates <count>', description: 'Maximum candidates to return, from 1 to 10' },
				{ label: '--dry-run', description: 'Preview an external skill import without writing files; default for import' },
				{ label: '--install', description: 'Install an external skill after previewing the same source' },
				{ label: '--all', description: 'Select every installed external skill for outdated or update checks' },
				{ label: '--name <slug>', description: 'Override the installed external skill directory name' },
				{ label: '--ref <ref>', description: 'Override the GitHub ref used for import' },
				{ label: '--trust-scripts', description: 'Create command-contract intents for imported scripts; requires --install to write them' },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json',
				'mf skill route --reason docs_change --path docs-site/src/content/docs/en/commands/context.md',
				'mf skill import https://github.com/example/agent-skills/tree/main/review/security --dry-run --json',
				'mf skill import https://github.com/example/agent-skills/blob/main/review/security/SKILL.md --install',
				'mf skill outdated --json',
				'mf skill update concurrency-review --dry-run --json',
				'mf skill update --all --trust-scripts',
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
		sourceUrl: parsed.positionals[1] ?? null,
		skillNames: parsed.positionals.slice(1),
		taskText: getParsedCliStringOption(parsed, '--task'),
		paths: getParsedCliStringOptions(parsed, '--path'),
		reasons: getParsedCliStringOptions(parsed, '--reason'),
		maxCandidates: parseMaxCandidates(getParsedCliStringOption(parsed, '--max-candidates')),
		install: hasParsedCliOption(parsed, '--install'),
		dryRun: hasParsedCliOption(parsed, '--dry-run'),
		all: hasParsedCliOption(parsed, '--all'),
		name: getParsedCliStringOption(parsed, '--name'),
		ref: getParsedCliStringOption(parsed, '--ref'),
		trustScripts: hasParsedCliOption(parsed, '--trust-scripts'),
		error: parsed.error,
	};
}

function selectedSkillNames(report: SkillRouteReport): readonly string[] {
	return [...new Set([
		...(report.selected.main ? [report.selected.main.skill] : []),
		...report.selected.adjuncts.map((candidate) => candidate.skill),
		...report.candidates.map((candidate) => candidate.skill),
	])];
}

function createSkillRouteScriptPackSuggestions(
	mustflowRoot: string,
	report: SkillRouteReport,
	paths: readonly string[],
): SkillRouteScriptPackSuggestions {
	const suggestionReport = createScriptPackSuggestionReport(mustflowRoot, {
		changed: false,
		phases: ['before_change', 'during_change', 'review'],
		skills: selectedSkillNames(report),
		paths,
		scripts: listScriptPackScripts(),
	});

	return {
		status: suggestionReport.status,
		input: suggestionReport.input,
		analyzed_paths: suggestionReport.analyzed_paths,
		suggestions: suggestionReport.suggestions,
		issues: suggestionReport.issues,
	};
}

function routeDependencyReason(candidate: SkillRouteCandidate): string | null {
	return candidate.selection_reasons.find((reason) => reason.startsWith('route_dependency:')) ?? null;
}

function conflictHintCandidates(report: SkillRouteReport): SkillRouteCandidate[] {
	const candidates = [
		...(report.selected.main ? [report.selected.main] : []),
		...report.selected.adjuncts,
		...report.candidates,
	];
	const seenSkills = new Set<string>();
	return candidates.filter((candidate) => {
		if (seenSkills.has(candidate.skill) || candidate.route_card.route_dependencies.conflicts_with.length === 0) {
			return false;
		}
		seenSkills.add(candidate.skill);
		return true;
	});
}

function renderSkillRouteReport(report: SkillRouteReport, lang: CliLang, warnings: readonly string[] = []): string {
	const dependencyReads = report.selected.adjuncts
		.map((candidate) => ({ candidate, reason: routeDependencyReason(candidate) }))
		.filter((entry): entry is SkillRouteDependencyRead => entry.reason !== null);
	const conflictHints = conflictHintCandidates(report);
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
				`  matched_dimensions: ${candidate.matched_dimensions.join(', ') || t(lang, 'value.none')}`,
			);
		}
	}

	if (dependencyReads.length > 0) {
		lines.push('', 'Dependency reads');
		for (const { candidate, reason } of dependencyReads) {
			lines.push(
				`- ${candidate.skill}`,
				`  reason: ${reason}`,
				`  path: ${candidate.skill_path}`,
			);
		}
	}

	if (conflictHints.length > 0) {
		lines.push('', 'Conflict hints');
		for (const candidate of conflictHints) {
			lines.push(
				`- ${candidate.skill}`,
				`  conflicts_with: ${candidate.route_card.route_dependencies.conflicts_with.join(', ')}`,
				`  path: ${candidate.skill_path}`,
			);
		}
	}

	lines.push(
		'',
		'Read plan',
		...report.read_plan.selected_skill_paths.map((skillPath) => `- read selected skill: ${skillPath}`),
		`- avoid by default: ${report.read_plan.avoid_by_default.join(', ') || t(lang, 'value.none')}`,
		`- fallback route metadata: ${report.read_plan.fallback_route_metadata.path}`,
		'',
		'Source files',
		...report.source_files.map((sourceFile) => `- ${sourceFile}`),
	);
	if (warnings.length > 0) {
		lines.push('', 'Warnings', ...warnings.map((warning) => `- ${warning}`));
	}
	return lines.join('\n');
}

function renderSkillUpdateReport(report: ExternalSkillUpdateReport): string {
	const lines = [
		`mustflow skill ${report.action}`,
		`status: ${report.status}`,
		`mode: ${report.mode}`,
		`wrote_files: ${String(report.wrote_files)}`,
		'',
		'Skills',
	];

	if (report.skills.length === 0) {
		lines.push('- none');
	} else {
		for (const skill of report.skills) {
			lines.push(
				`- ${skill.skill_name}: ${skill.status}`,
				`  source: ${skill.source?.source_url ?? 'none'}`,
				`  target: ${skill.target.skill_dir}`,
				`  changed_files: ${String(skill.changed_files.length)}`,
			);
			for (const changedFile of skill.changed_files) {
				lines.push(
					`  - ${changedFile.relative_path}: ${changedFile.status}`,
					`    current: ${changedFile.current_sha256 ?? 'none'}`,
					`    remote: ${changedFile.remote_sha256 ?? 'none'}`,
				);
			}
			if (skill.issues.length > 0) {
				for (const issue of skill.issues) {
					lines.push(`  issue: ${issue}`);
				}
			}
		}
	}

	if (report.warnings.length > 0) {
		lines.push('', 'Warnings', ...report.warnings.map((warning) => `- ${warning}`));
	}

	if (report.issues.length > 0) {
		lines.push('', 'Issues', ...report.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

function renderSkillImportReport(report: ExternalSkillImportReport): string {
	const lines = [
		'mustflow skill import',
		`status: ${report.status}`,
		`mode: ${report.mode}`,
		`source: ${report.source?.source_url ?? 'none'}`,
		`target: ${report.target?.skill_dir ?? 'none'}`,
		`wrote_files: ${String(report.wrote_files)}`,
		'',
		'Files',
	];

	if (report.files.length === 0) {
		lines.push('- none');
	} else {
		for (const file of report.files) {
			lines.push(`- ${file.relative_path} (${file.kind}, ${file.bytes} bytes, ${file.sha256})`);
		}
	}

	if (report.script_trust) {
		lines.push(
			'',
			'Script trust',
			`- requested: ${String(report.script_trust.requested)}`,
			`- status: ${report.script_trust.status}`,
			`- command authority: ${String(report.script_trust.grants_command_authority)}`,
		);
		if (report.script_trust.fragment_path) {
			lines.push(`- command fragment: ${report.script_trust.fragment_path}`);
		}
		for (const intent of report.script_trust.intents) {
			lines.push(`- intent: ${intent.intent}`);
		}
	}

	if (report.warnings.length > 0) {
		lines.push('', 'Warnings', ...report.warnings.map((warning) => `- ${warning}`));
	}

	if (report.issues.length > 0) {
		lines.push('', 'Issues', ...report.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

function parseImportMode(parsed: ParsedSkillArgs): ExternalSkillImportMode | null {
	if (parsed.install && parsed.dryRun) {
		return null;
	}

	return parsed.install ? 'install' : 'dry_run';
}

export async function runSkill(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getSkillHelp(lang));
		return 0;
	}

	const parsed = parseSkillArgs(args);

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf skill --help', getSkillHelp(lang), lang);
		return 1;
	}

	if (
		parsed.action !== 'route' &&
		parsed.action !== 'import' &&
		parsed.action !== 'outdated' &&
		parsed.action !== 'update'
	) {
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

	if (parsed.action === 'import') {
		const mode = parseImportMode(parsed);
		if (mode === null) {
			printUsageError(
				reporter,
				t(lang, 'cli.error.unexpectedValue', { option: '--install/--dry-run' }),
				'mf skill --help',
				getSkillHelp(lang),
				lang,
			);
			return 1;
		}

		if (!parsed.sourceUrl) {
			printUsageError(
				reporter,
				t(lang, 'cli.error.missingValue', { option: 'import <github-url>' }),
				'mf skill --help',
				getSkillHelp(lang),
				lang,
			);
			return 1;
		}

		const report = await createExternalSkillImportReport(resolveMustflowRoot(), parsed.sourceUrl, {
			mode,
			name: parsed.name,
			ref: parsed.ref,
			trustScripts: parsed.trustScripts,
		});

		if (parsed.json) {
			reporter.stdout(JSON.stringify(report, null, 2));
		} else {
			reporter.stdout(renderSkillImportReport(report));
		}

		return report.ok ? 0 : 1;
	}

	if (parsed.action === 'outdated' || parsed.action === 'update') {
		if (parsed.action === 'outdated' && (parsed.install || parsed.dryRun)) {
			printUsageError(
				reporter,
				t(lang, 'cli.error.unexpectedValue', { option: '--install/--dry-run' }),
				'mf skill --help',
				getSkillHelp(lang),
				lang,
			);
			return 1;
		}

		if (parsed.action === 'update' && parsed.install) {
			printUsageError(
				reporter,
				t(lang, 'cli.error.unexpectedValue', { option: '--install' }),
				'mf skill --help',
				getSkillHelp(lang),
				lang,
			);
			return 1;
		}

		const report = await createExternalSkillUpdateReport(resolveMustflowRoot(), {
			action: parsed.action,
			mode: parsed.action === 'outdated' ? 'check' : parsed.dryRun ? 'dry_run' : 'install',
			skillNames: parsed.skillNames,
			all: parsed.all,
			trustScripts: parsed.trustScripts,
		});

		if (parsed.json) {
			reporter.stdout(JSON.stringify(report, null, 2));
		} else {
			reporter.stdout(renderSkillUpdateReport(report));
		}

		return report.ok ? 0 : 1;
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

	const mustflowRoot = resolveMustflowRoot();
	const report = resolveSkillRoutes(mustflowRoot, {
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
			script_pack_suggestions: createSkillRouteScriptPackSuggestions(mustflowRoot, report, parsed.paths),
		}, null, 2));
		return 0;
	}

	const updateReminder = createExternalSkillUpdateReminder(mustflowRoot);
	reporter.stdout(renderSkillRouteReport(report, lang, updateReminder ? [updateReminder] : []));
	return 0;
}
