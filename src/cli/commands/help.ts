import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { printUsageError, renderCliError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { readTomlFile } from '../lib/toml.js';

type TomlTable = Record<string, unknown>;

function isRecord(value: unknown): value is TomlTable {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readTextIfExists(projectRoot: string, relativePath: string): string | undefined {
	const filePath = path.join(projectRoot, ...relativePath.split('/'));
	return existsSync(filePath) ? readFileSync(filePath, 'utf8') : undefined;
}

function readTomlIfExists(projectRoot: string, relativePath: string): TomlTable | undefined {
	const filePath = path.join(projectRoot, ...relativePath.split('/'));

	if (!existsSync(filePath)) {
		return undefined;
	}

	const parsed = readTomlFile(filePath);
	return isRecord(parsed) ? parsed : undefined;
}

function renderMissing(relativePath: string, lang: CliLang): string {
	if (lang === 'ko') {
		return `현재 디렉터리에서 ${relativePath} 파일을 찾지 못했습니다. 먼저 mf init을 실행하거나 mustflow 루트로 이동하세요.`;
	}

	return `No ${relativePath} found in the current directory. Run mf init first or switch to a mustflow root.`;
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
		return lang === 'ko'
			? '명령어\n\n.mustflow/config/commands.toml에서 [intents] 테이블을 찾지 못했습니다.'
			: 'Commands\n\nNo [intents] table was found in .mustflow/config/commands.toml.';
	}

	const lines =
		lang === 'ko'
			? ['명령어', '', '.mustflow/config/commands.toml에 설정된 명령 의도:', '']
			: ['Commands', '', 'Configured command intents in .mustflow/config/commands.toml:', ''];

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
		return `${lang === 'ko' ? '선호값' : 'Preferences'}\n\n${renderMissing('.mustflow/config/preferences.toml', lang)}`;
	}

	const lines =
		lang === 'ko'
			? ['선호값', '', '.mustflow/config/preferences.toml의 저장소별 에이전트 선호값:', '']
			: ['Preferences', '', 'Repository-level agent preferences in .mustflow/config/preferences.toml:', ''];

	for (const [sectionName, section] of Object.entries(preferences)) {
		if (!isRecord(section)) {
			continue;
		}

		renderPreferenceSection(lines, sectionName, section);
	}

	return lines.join('\n').trimEnd();
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
			summary:
				lang === 'ko'
					? '설치된 mustflow 작업 흐름에서 도움말을 보여줍니다.'
					: 'Show help from the installed mustflow workflow.',
			topics: [
				{
					label: 'workflow',
					description: lang === 'ko' ? '.mustflow/docs/agent-workflow.md를 출력합니다' : 'Print .mustflow/docs/agent-workflow.md',
				},
				{ label: 'skills', description: lang === 'ko' ? '.mustflow/skills/INDEX.md를 출력합니다' : 'Print .mustflow/skills/INDEX.md' },
				{
					label: 'commands',
					description:
						lang === 'ko' ? '.mustflow/config/commands.toml을 요약합니다' : 'Summarize .mustflow/config/commands.toml',
				},
				{
					label: 'preferences',
					description:
						lang === 'ko' ? '.mustflow/config/preferences.toml을 요약합니다' : 'Summarize .mustflow/config/preferences.toml',
				},
			],
			options: [{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' }],
			examples: ['mf help workflow', 'mf help skills', 'mf help preferences'],
			exitCodes: [
				{
					label: '0',
					description:
						lang === 'ko'
							? '도움말 주제를 출력했거나 설치된 주제가 없었습니다'
							: 'Help topic was printed or no installed topic was available',
				},
				{
					label: '1',
					description:
						lang === 'ko' ? '알 수 없는 주제나 선택지가 있었습니다' : 'The command received an unknown topic or option',
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
		printUsageError(reporter, `Unknown option: ${rest[0]}`, 'mf help --help', getHelpHelp(lang), lang);
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

	reporter.stderr(renderCliError(`Unknown help topic: ${topic}`, 'mf help --help', lang));
	reporter.stdout(getHelpHelp(lang));
	return 1;
}
