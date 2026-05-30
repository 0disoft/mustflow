#!/usr/bin/env node

import { realpathSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { COMMAND_DEFINITIONS, findCommandDefinition } from './lib/command-registry.js';
import { renderCliError, renderHelp } from './lib/cli-output.js';
import { DEFAULT_CLI_LANG, SUPPORTED_CLI_LANGS, isCliLang, t, type CliLang } from './lib/i18n.js';
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
				description: t(lang, command.summaryKey),
			})),
			options: [
				{
					label: '--lang <lang>',
					description: t(lang, 'top.help.option.lang', { languages: SUPPORTED_CLI_LANGS.join(', ') }),
				},
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
				{ label: '-v, --version', description: t(lang, 'top.help.option.version') },
			],
			examples: [
				'mf --lang ko help',
				'mf api workspace-summary --json',
				'mf adapters status --json',
				'mf init --dry-run',
				'mf doctor --json',
				'mf docs review list',
				'mf handoff validate .mustflow/work-items/MF-0001.json',
				'mf check --json',
				'mf classify --changed',
				'mf contract-lint --json',
				'mf context --json',
				'mf map --write',
				'mf search mustflow_check',
				'mf explain authority AGENTS.md',
				'mf explain --why-blocked test',
				'mf impact --changed',
				'mf upgrade --dry-run',
				'mf verify --changed --plan-only --json',
				'mf verify --reason code_change',
				'mf line-endings check',
				'mf version --check',
				'mf version-sources --json',
			],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'top.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'top.help.exit.fail'),
				},
			],
		},
		lang,
	);
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
				return { lang, args, error: t(lang, 'cli.error.missingLangValue') };
			}

			if (!isCliLang(value)) {
				return { lang, args, error: t(lang, 'cli.error.unsupportedLanguage', { language: value }) };
			}

			lang = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--lang=')) {
			const value = arg.slice('--lang='.length);

			if (!isCliLang(value)) {
				return { lang, args, error: t(lang, 'cli.error.unsupportedLanguage', { language: value }) };
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

	const commandId = command === '--version' || command === '-v' ? 'version' : command;
	const commandDefinition = findCommandDefinition(commandId);

	if (commandDefinition) {
		const runner = await commandDefinition.loadRunner();
		return runner(args, reporter, parsed.lang);
	}

	reporter.stderr(renderCliError(t(parsed.lang, 'cli.error.unknownCommand', { command }), 'mf --help', parsed.lang));
	reporter.stdout(getTopLevelHelp(parsed.lang));
	return 1;
}

function isDirectRun(): boolean {
	const entrypoint = process.argv[1];

	if (!entrypoint) {
		return false;
	}

	const currentFile = fileURLToPath(import.meta.url);
	const resolvedEntrypoint = path.resolve(entrypoint);
	const resolvedCurrentFile = path.resolve(currentFile);

	if (resolvedEntrypoint === resolvedCurrentFile) {
		return true;
	}

	try {
		return realpathSync.native(resolvedEntrypoint) === realpathSync.native(resolvedCurrentFile);
	} catch {
		return false;
	}
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
