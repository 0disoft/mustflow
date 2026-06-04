import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import { isRecord, type TomlTable } from '../lib/command-contract.js';
import { t, type CliLang } from '../lib/i18n.js';
import { readMustflowTextFileIfExists } from '../lib/mustflow-read.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { readMustflowTomlFile } from '../lib/toml.js';
import {
	normalizeTechnologyPreferencesTable,
	TECHNOLOGY_CONFIG_RELATIVE_PATH,
	type TechnologyPreference,
} from '../../core/technology-preferences.js';

function readTextIfExists(projectRoot: string, relativePath: string): string | undefined {
	return readMustflowTextFileIfExists(projectRoot, relativePath) ?? undefined;
}

function readTomlIfExists(projectRoot: string, relativePath: string): TomlTable | undefined {
	try {
		const parsed = readMustflowTomlFile(projectRoot, relativePath);
		return isRecord(parsed) ? parsed : undefined;
	} catch {
		return undefined;
	}
}

function renderMissing(relativePath: string, lang: CliLang): string {
	return t(lang, 'help.missingFile', { path: relativePath });
}

function renderWorkflowHelp(projectRoot: string, lang: CliLang): string {
	return readTextIfExists(projectRoot, '.mustflow/docs/agent-workflow.md') ?? renderMissing('.mustflow/docs/agent-workflow.md', lang);
}

function renderSkillsHelp(projectRoot: string, lang: CliLang): string {
	return readTextIfExists(projectRoot, '.mustflow/skills/INDEX.md') ?? renderMissing('.mustflow/skills/INDEX.md', lang);
}

function renderCommandsHelp(projectRoot: string, lang: CliLang): string {
	const commands = readTomlIfExists(projectRoot, '.mustflow/config/commands.toml');

	if (!commands) {
		return renderMissing('.mustflow/config/commands.toml', lang);
	}

	if (!isRecord(commands.intents)) {
		return t(lang, 'help.commands.noIntents');
	}

	const lines = [t(lang, 'help.commands.title'), '', t(lang, 'help.commands.configuredIntents'), ''];

	for (const [name, intent] of Object.entries(commands.intents).sort(([left], [right]) => left.localeCompare(right))) {
		if (!isRecord(intent)) {
			continue;
		}

		const status = typeof intent.status === 'string' ? intent.status : 'unknown';
		const description = typeof intent.description === 'string' ? ` - ${intent.description}` : '';
		lines.push(`- ${name}: ${status}${description}`);
	}

	return lines.join('\n');
}

function renderPreferencesHelp(projectRoot: string, lang: CliLang): string {
	const preferences = readTomlIfExists(projectRoot, '.mustflow/config/preferences.toml');

	if (!preferences) {
		return `${t(lang, 'help.preferences.title')}\n\n${renderMissing('.mustflow/config/preferences.toml', lang)}`;
	}

	const lines = [t(lang, 'help.preferences.title'), '', t(lang, 'help.preferences.intro'), ''];

	for (const [sectionName, section] of Object.entries(preferences)) {
		if (!isRecord(section)) {
			continue;
		}

		renderPreferenceSection(lines, sectionName, section);
	}

	return lines.join('\n').trimEnd();
}

function renderTechnologyPreference(preference: TechnologyPreference): string[] {
	const details = [
		preference.scope.length > 0 ? `scope: ${preference.scope.join(', ')}` : null,
		preference.ecosystem ? `ecosystem: ${preference.ecosystem}` : null,
		preference.packages.length > 0 ? `packages: ${preference.packages.join(', ')}` : null,
	].filter((value): value is string => value !== null);
	const lines = [`- [${preference.status}] ${preference.kind} ${preference.name} (${preference.id})`];

	if (details.length > 0) {
		lines.push(`  ${details.join('; ')}`);
	}

	if (preference.rationale) {
		lines.push(`  why: ${preference.rationale}`);
	}

	for (const constraint of preference.constraints) {
		lines.push(`  constraint: ${constraint}`);
	}

	return lines;
}

function renderTechnologyHelp(projectRoot: string, lang: CliLang): string {
	const technology = readTomlIfExists(projectRoot, TECHNOLOGY_CONFIG_RELATIVE_PATH);

	if (!technology) {
		return `Technology Preferences\n\n${renderMissing(TECHNOLOGY_CONFIG_RELATIVE_PATH, lang)}`;
	}

	const file = normalizeTechnologyPreferencesTable(technology, true);
	const lines = [
		'Technology Preferences',
		'',
		`Path: ${file.path}`,
		`Authority: ${file.authority} (preferences only)`,
		'Guidance:',
		...file.guidance.map((item) => `- ${item}`),
		'',
		`Preferences: ${file.preferences.length}`,
	];

	if (file.preferences.length === 0) {
		lines.push('No technology preferences recorded.');
	}

	for (const preference of file.preferences) {
		lines.push(...renderTechnologyPreference(preference));
	}

	if (file.issues.length > 0) {
		lines.push('', 'Issues:', ...file.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

function renderPreferenceSection(lines: string[], sectionName: string, section: TomlTable): void {
	const nestedSections: Array<[string, TomlTable]> = [];
	const scalarLines: string[] = [];

	for (const [key, value] of Object.entries(section)) {
		if (isRecord(value)) {
			nestedSections.push([`${sectionName}.${key}`, value]);
			continue;
		}

		if (Array.isArray(value)) {
			scalarLines.push(`- ${key}: ${value.join(', ')}`);
			continue;
		}

		if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') {
			scalarLines.push(`- ${key}: ${String(value)}`);
		}
	}

	lines.push(`[${sectionName}]`, ...scalarLines, '');

	for (const [nestedName, nestedSection] of nestedSections) {
		renderPreferenceSection(lines, nestedName, nestedSection);
	}
}

export function getHelpHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf help [topic]',
			summary: t(lang, 'help.help.summary'),
			topics: [
				{
					label: 'workflow',
					description: t(lang, 'help.topic.workflow'),
				},
				{ label: 'skills', description: t(lang, 'help.topic.skills') },
				{
					label: 'commands',
					description: t(lang, 'help.topic.commands'),
				},
				{
					label: 'preferences',
					description: t(lang, 'help.topic.preferences'),
				},
				{
					label: 'technology',
					description: 'Show framework, library, runtime, and tool preferences',
				},
			],
			options: [{ label: '-h, --help', description: t(lang, 'cli.option.help') }],
			examples: ['mf help workflow', 'mf help skills', 'mf help preferences', 'mf help technology'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'help.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'help.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

export function runHelp(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	const [topic, ...rest] = args;

	if (!topic || topic === '--help' || topic === '-h') {
		reporter.stdout(getHelpHelp(lang));
		return 0;
	}

	if (rest.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: rest[0] }), 'mf help --help', getHelpHelp(lang), lang);
		return 1;
	}

	const projectRoot = resolveMustflowRoot();

	if (topic === 'workflow') {
		reporter.stdout(renderWorkflowHelp(projectRoot, lang));
		return 0;
	}

	if (topic === 'skills') {
		reporter.stdout(renderSkillsHelp(projectRoot, lang));
		return 0;
	}

	if (topic === 'commands') {
		reporter.stdout(renderCommandsHelp(projectRoot, lang));
		return 0;
	}

	if (topic === 'preferences') {
		reporter.stdout(renderPreferencesHelp(projectRoot, lang));
		return 0;
	}

	if (topic === 'technology') {
		reporter.stdout(renderTechnologyHelp(projectRoot, lang));
		return 0;
	}

	reporter.stderr(renderCliError(t(lang, 'help.error.unknownTopic', { topic }), 'mf help --help', lang));
	return 1;
}
