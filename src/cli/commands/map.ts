import type { Reporter } from '../lib/reporter.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import { generateRepoMap, writeRepoMap } from '../lib/repo-map.js';

export function getMapHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf map [options]',
			summary: t(lang, 'map.help.summary'),
			options: [
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
				{ label: '--stdout', description: t(lang, 'map.help.option.stdout') },
				{ label: '--write', description: t(lang, 'map.help.option.write') },
				{
					label: '--depth <level>',
					description: t(lang, 'map.help.option.depth'),
				},
				{
					label: '--include-nested',
					description: t(lang, 'map.help.option.includeNested'),
				},
				{
					label: '--root-only',
					description: t(lang, 'map.help.option.rootOnly'),
				},
			],
			examples: ['mf map --stdout', 'mf map --write', 'mf map --write --include-nested'],
			exitCodes: [
				{ label: '0', description: t(lang, 'map.help.exit.ok') },
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

export function runMap(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getMapHelp(lang));
		return 0;
	}

	let shouldPrint = false;
	let shouldWrite = false;
	let depth = 3;
	let includeNested: boolean | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--stdout') {
			shouldPrint = true;
			continue;
		}

		if (arg === '--write') {
			shouldWrite = true;
			continue;
		}

		if (arg === '--include-nested') {
			if (includeNested === false) {
				printUsageError(reporter, t(lang, 'map.error.nestedConflict'), 'mf map --help', getMapHelp(lang), lang);
				return 1;
			}

			includeNested = true;
			continue;
		}

		if (arg === '--root-only') {
			if (includeNested === true) {
				printUsageError(reporter, t(lang, 'map.error.nestedConflict'), 'mf map --help', getMapHelp(lang), lang);
				return 1;
			}

			includeNested = false;
			continue;
		}

		if (arg === '--depth') {
			const rawDepth = args[index + 1];
			const parsedDepth = Number.parseInt(rawDepth ?? '', 10);

			if (!Number.isInteger(parsedDepth) || parsedDepth < 1) {
				printUsageError(reporter, t(lang, 'map.error.invalidDepth'), 'mf map --help', getMapHelp(lang), lang);
				return 1;
			}

			depth = parsedDepth;
			index += 1;
			continue;
		}

		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: arg }), 'mf map --help', getMapHelp(lang), lang);
		return 1;
	}

	if (!shouldPrint && !shouldWrite) {
		shouldPrint = true;
	}

	const projectRoot = resolveMustflowRoot();
	const content = generateRepoMap(projectRoot, { depth, includeNested });

	if (shouldWrite) {
		writeRepoMap(projectRoot, content);
		reporter.stdout(t(lang, 'map.wrote'));
	}

	if (shouldPrint) {
		reporter.stdout(content);
	}

	return 0;
}
