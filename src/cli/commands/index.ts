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
				{
					label: '--incremental',
					description: t(lang, 'index.help.option.incremental'),
				},
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf index --dry-run --json', 'mf index', 'mf index --incremental --json'],
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
		`skill_routes: ${result.skill_route_count}`,
		`${t(lang, 'label.commandIntents')}: ${result.command_intent_count}`,
		`command_effects: ${result.command_effect_count}`,
		`verification_evidence_summaries: ${result.verification_evidence_summary_count}`,
		`verification_receipt_summaries: ${result.verification_receipt_summary_count}`,
		`verification_coverage_states: ${result.verification_coverage_state_count}`,
		`verification_risk_signals: ${result.verification_risk_signal_count}`,
		`failure_fingerprints: ${result.failure_fingerprint_count}`,
		`source_anchors: ${result.source_anchor_count}`,
		`index_mode: ${result.index_mode}`,
		`reused_existing: ${result.reused_existing ? 'yes' : 'no'}`,
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

	const supported = new Set(['--dry-run', '--json', '--source', '--incremental']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, t(lang, 'cli.error.unknownOption', { option: unsupported[0] }), 'mf index --help', getIndexHelp(lang), lang);
		return 1;
	}

	const result = await createLocalIndex(resolveMustflowRoot(), {
		dryRun: args.includes('--dry-run'),
		includeSource: args.includes('--source'),
		incremental: args.includes('--incremental'),
	});

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(result, null, 2));
		return 0;
	}

	reporter.stdout(renderIndexSummary(result, lang));
	return 0;
}
