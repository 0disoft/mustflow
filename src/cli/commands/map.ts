import type { Reporter } from '../lib/reporter.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	acquireActiveCommandLock,
	REPO_MAP_WRITE_EFFECTS,
	reportActiveCommandLockConflict,
} from '../lib/active-command-lock.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import { generateRepoMap, writeRepoMap } from '../lib/repo-map.js';

const MAP_OPTIONS = [
	{ name: '--stdout', kind: 'boolean' },
	{ name: '--write', kind: 'boolean' },
	{ name: '--depth', kind: 'string' },
	{ name: '--include-nested', kind: 'boolean' },
	{ name: '--root-only', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];

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
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getMapHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, MAP_OPTIONS);

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf map --help', getMapHelp(lang), lang);
		return 1;
	}

	let shouldPrint = hasParsedCliOption(parsed, '--stdout');
	const shouldWrite = hasParsedCliOption(parsed, '--write');
	let depth = 3;
	const wantsIncludeNested = hasParsedCliOption(parsed, '--include-nested');
	const wantsRootOnly = hasParsedCliOption(parsed, '--root-only');
	let includeNested = wantsIncludeNested ? true : wantsRootOnly ? false : undefined;
	const rawDepth = getParsedCliStringOption(parsed, '--depth');

	if (wantsIncludeNested && wantsRootOnly) {
		printUsageError(reporter, t(lang, 'map.error.nestedConflict'), 'mf map --help', getMapHelp(lang), lang);
		return 1;
	}

	if (rawDepth !== null) {
		const parsedDepth = Number.parseInt(rawDepth, 10);

		if (!Number.isInteger(parsedDepth) || parsedDepth < 1) {
			printUsageError(reporter, t(lang, 'map.error.invalidDepth'), 'mf map --help', getMapHelp(lang), lang);
			return 1;
		}

		depth = parsedDepth;
	}

	if (!shouldPrint && !shouldWrite) {
		shouldPrint = true;
	}

	const projectRoot = resolveMustflowRoot();
	const activeLock = shouldWrite ? acquireActiveCommandLock(projectRoot, 'mf map --write', REPO_MAP_WRITE_EFFECTS) : null;

	if (activeLock && !activeLock.ok) {
		reportActiveCommandLockConflict(reporter, 'mf map --write', activeLock.conflicts, 'mf map --help', lang);
		return 1;
	}

	try {
		const content = generateRepoMap(projectRoot, { depth, includeNested });

		if (shouldWrite) {
			writeRepoMap(projectRoot, content);
			reporter.stdout(t(lang, 'map.wrote'));
		}

		if (shouldPrint) {
			reporter.stdout(content);
		}

		return 0;
	} finally {
		if (activeLock?.ok) {
			activeLock.handle.release();
		}
	}
}
