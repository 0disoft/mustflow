import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { createLocalIndex } from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

export function getIndexHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf index [options]',
			summary: t(lang, 'index.help.summary'),
			options: [
				{
					label: '--dry-run',
					description: t(lang, 'index.help.option.dryRun'),
				},
				{
					label: '--source',
					description: t(lang, 'index.help.option.source'),
				},
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf index --dry-run --json', 'mf index', 'mf index --json'],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'index.help.exit.ok'),
				},
				{ label: '1', description: t(lang, 'cli.common.invalidInput') },
			],
		},
		lang,
	);
}

function renderIndexSummary(result: Awaited<ReturnType<typeof createLocalIndex>>, lang: CliLang): string {
	const lines = [
		t(lang, 'index.title'),
		`${t(lang, 'label.mustflowRoot')}: ${result.mustflow_root}`,
		`${t(lang, 'label.database')}: ${result.database_path}`,
		`${t(lang, 'label.documents')}: ${result.document_count}`,
		`${t(lang, 'label.skills')}: ${result.skill_count}`,
		`${t(lang, 'label.commandIntents')}: ${result.command_intent_count}`,
		`source_anchors: ${result.source_anchor_count}`,
		`${t(lang, 'label.wroteFiles')}: ${result.wrote_files ? 'yes' : 'no'}`,
	];

	if (result.dry_run) {
		lines.push(t(lang, 'index.dryRunNoFiles'));
	}

	return lines.join('\n');
}

export async function runIndex(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getIndexHelp(lang));
		return 0;
	}

	const supported = new Set(['--dry-run', '--json', '--source']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf index --help', getIndexHelp(lang), lang);
		return 1;
	}

	const result = await createLocalIndex(resolveMustflowRoot(), {
		dryRun: args.includes('--dry-run'),
		includeSource: args.includes('--source'),
	});

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(result, null, 2));
		return 0;
	}

	reporter.stdout(renderIndexSummary(result, lang));
	return 0;
}
