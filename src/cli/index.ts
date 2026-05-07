#!/usr/bin/env node

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runCheck } from './commands/check.js';
import { runContext } from './commands/context.js';
import { runDashboard } from './commands/dashboard.js';
import { runDoctor } from './commands/doctor.js';
import { runHelp } from './commands/help.js';
import { runInit } from './commands/init.js';
import { runIndex } from './commands/index.js';
import { runMap } from './commands/map.js';
import { runRun } from './commands/run.js';
import { runSearch } from './commands/search.js';
import { runStatus } from './commands/status.js';
import { runUpdate } from './commands/update.js';
import { COMMAND_DEFINITIONS } from './lib/command-registry.js';
import { renderCliError, renderHelp } from './lib/cli-output.js';
import { DEFAULT_CLI_LANG, isCliLang, text, type CliLang } from './lib/i18n.js';
import { consoleReporter, type Reporter } from './lib/reporter.js';

interface ParsedGlobalOptions {
	readonly lang: CliLang;
	readonly args: readonly string[];
	readonly error?: string;
}

function getTopLevelHelp(lang: CliLang): string {
	return renderHelp(
		{
			usage: 'mf [--lang <lang>] <command> [options]',
			commands: COMMAND_DEFINITIONS.map((command) => ({
				label: command.usage,
				description: text(command.summary, lang),
			})),
			options: [
				{
					label: '--lang <lang>',
					description:
						lang === 'ko'
							? 'CLI 출력 언어를 선택합니다. 지원값: en, ko'
							: 'Select CLI output language. Supported values: en, ko',
				},
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
				{ label: '-v, --version', description: lang === 'ko' ? '패키지 버전을 보여줍니다' : 'Show package version' },
			],
			examples: [
				'mf --lang ko help',
				'mf init --dry-run',
				'mf doctor --json',
				'mf check --json',
				'mf context --json',
				'mf map --write',
				'mf search mustflow_check',
			],
			exitCodes: [
				{
					label: '0',
					description:
						lang === 'ko'
							? '명령이 완료되었거나 요청한 정보를 출력했습니다'
							: 'Command completed or printed requested information',
				},
				{
					label: '1',
					description:
						lang === 'ko'
							? '명령이 실패했거나 검증 문제 또는 잘못된 입력이 있었습니다'
							: 'Command failed, found validation issues, or received invalid input',
				},
			],
		},
		lang,
	);
}

function getPackageVersion(): string {
	const packageUrl = new URL('../../package.json', import.meta.url);
	const rawPackageJson = readFileSync(packageUrl, 'utf8');
	const parsed = JSON.parse(rawPackageJson) as { version?: unknown };

	return typeof parsed.version === 'string' ? parsed.version : '0.0.0';
}

function getErrorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function parseGlobalOptions(argv: string[]): ParsedGlobalOptions {
	let lang = DEFAULT_CLI_LANG;
	const args: string[] = [];

	for (let index = 0; index < argv.length; index += 1) {
		const arg = argv[index];

		if (!arg) {
			continue;
		}

		if (arg === '--lang') {
			const value = argv[index + 1];

			if (!value || value.startsWith('-')) {
				return { lang, args, error: 'Missing value for --lang' };
			}

			if (!isCliLang(value)) {
				return { lang, args, error: `Unsupported CLI language: ${value}` };
			}

			lang = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--lang=')) {
			const value = arg.slice('--lang='.length);

			if (!isCliLang(value)) {
				return { lang, args, error: `Unsupported CLI language: ${value}` };
			}

			lang = value;
			continue;
		}

		args.push(arg);
	}

	return { lang, args };
}

export async function runCli(argv: string[], reporter: Reporter = consoleReporter): Promise<number> {
	const parsed = parseGlobalOptions(argv);
	const [command, ...args] = parsed.args;

	if (parsed.error) {
		reporter.stderr(renderCliError(parsed.error, 'mf --help', parsed.lang));
		reporter.stdout(getTopLevelHelp(parsed.lang));
		return 1;
	}

	if (!command || command === '--help' || command === '-h') {
		reporter.stdout(getTopLevelHelp(parsed.lang));
		return 0;
	}

	if (command === '--version' || command === '-v' || command === 'version') {
		reporter.stdout(getPackageVersion());
		return 0;
	}

	if (command === 'init') {
		return runInit(args, reporter, parsed.lang);
	}

	if (command === 'check') {
		return runCheck(args, reporter, parsed.lang);
	}

	if (command === 'status') {
		return runStatus(args, reporter, parsed.lang);
	}

	if (command === 'update') {
		return runUpdate(args, reporter, parsed.lang);
	}

	if (command === 'map') {
		return runMap(args, reporter, parsed.lang);
	}

	if (command === 'run') {
		return runRun(args, reporter, parsed.lang);
	}

	if (command === 'context') {
		return runContext(args, reporter, parsed.lang);
	}

	if (command === 'doctor') {
		return runDoctor(args, reporter, parsed.lang);
	}

	if (command === 'index') {
		return runIndex(args, reporter, parsed.lang);
	}

	if (command === 'search') {
		return runSearch(args, reporter, parsed.lang);
	}

	if (command === 'dashboard') {
		return runDashboard(args, reporter, parsed.lang);
	}

	if (command === 'help') {
		return runHelp(args, reporter, parsed.lang);
	}

	reporter.stderr(renderCliError(`Unknown command: ${command}`, 'mf --help', parsed.lang));
	reporter.stdout(getTopLevelHelp(parsed.lang));
	return 1;
}

function isDirectRun(): boolean {
	const entrypoint = process.argv[1];

	if (!entrypoint) {
		return false;
	}

	return path.resolve(entrypoint) === fileURLToPath(import.meta.url);
}

async function main(): Promise<void> {
	try {
		process.exitCode = await runCli(process.argv.slice(2));
	} catch (error) {
		consoleReporter.stderr(renderCliError(getErrorMessage(error), 'mf --help'));
		process.exitCode = 1;
	}
}

if (isDirectRun()) {
	void main();
}
