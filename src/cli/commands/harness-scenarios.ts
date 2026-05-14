import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

interface ParsedHarnessScenarioArgs {
	readonly hasFixtures: boolean;
	readonly error?: {
		readonly message: string;
	};
}

function getHarnessScenariosScriptPath(): string {
	return path.resolve(fileURLToPath(new URL('../../../scripts/run-harness-scenarios.mjs', import.meta.url)));
}

function parseHarnessScenarioArgs(args: readonly string[], lang: CliLang): ParsedHarnessScenarioArgs {
	let hasFixtures = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--json') {
			continue;
		}

		if (arg === '--fixtures') {
			const value = args[index + 1];

			if (!value || value.startsWith('-')) {
				return {
					hasFixtures,
					error: { message: t(lang, 'cli.error.missingValue', { option: '--fixtures' }) },
				};
			}

			hasFixtures = true;
			index += 1;
			continue;
		}

		if (arg.startsWith('--fixtures=')) {
			const value = arg.slice('--fixtures='.length);

			if (!value) {
				return {
					hasFixtures,
					error: { message: t(lang, 'cli.error.missingValue', { option: '--fixtures' }) },
				};
			}

			hasFixtures = true;
			continue;
		}

		if (arg.startsWith('-')) {
			return {
				hasFixtures,
				error: { message: t(lang, 'cli.error.unknownOption', { option: arg }) },
			};
		}

		return {
			hasFixtures,
			error: { message: t(lang, 'cli.error.unexpectedArgument', { argument: arg }) },
		};
	}

	return { hasFixtures };
}

export function getHarnessScenariosHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf harness-scenarios --fixtures <path> [options]',
			summary: t(lang, 'harnessScenarios.help.summary'),
			options: [
				{ label: '--fixtures <path>', description: t(lang, 'harnessScenarios.help.option.fixtures') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf harness-scenarios --fixtures tests/fixtures/harness-scenarios',
				'mf harness-scenarios --fixtures tests/fixtures/harness-scenarios --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'harnessScenarios.help.exit.ok') },
				{ label: '1', description: t(lang, 'harnessScenarios.help.exit.fail') },
			],
		},
		lang,
	);
}

export function runHarnessScenarios(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	const helpText = getHarnessScenariosHelp(lang);

	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(helpText);
		return 0;
	}

	const parsed = parseHarnessScenarioArgs(args, lang);

	if (parsed.error) {
		printUsageError(reporter, parsed.error.message, 'mf harness-scenarios --help', helpText, lang);
		return 1;
	}

	if (!parsed.hasFixtures) {
		printUsageError(
			reporter,
			t(lang, 'harnessScenarios.error.missingFixtures'),
			'mf harness-scenarios --help',
			helpText,
			lang,
		);
		return 1;
	}

	const scriptPath = getHarnessScenariosScriptPath();

	if (!existsSync(scriptPath)) {
		printUsageError(
			reporter,
			t(lang, 'harnessScenarios.error.missingRunner'),
			'mf harness-scenarios --help',
			helpText,
			lang,
		);
		return 1;
	}

	const result = spawnSync(process.execPath, [scriptPath, ...args], {
		cwd: resolveMustflowRoot(),
		encoding: 'utf8',
	});

	if (result.stdout.trim().length > 0) {
		reporter.stdout(result.stdout.trimEnd());
	}

	if (result.stderr.trim().length > 0) {
		reporter.stderr(result.stderr.trimEnd());
	}

	if (result.error) {
		reporter.stderr(result.error.message);
		return 1;
	}

	return typeof result.status === 'number' ? result.status : 1;
}
