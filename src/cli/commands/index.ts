import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { createLocalIndex } from '../lib/local-index.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const INDEX_OPTIONS = [
	{ name: '--dry-run', kind: 'boolean' },
	{ name: '--json', kind: 'boolean' },
	{ name: '--source', kind: 'boolean' },
	{ name: '--incremental', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];

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
		`verification_plans: ${result.verification_plan_count}`,
		`acceptance_criteria: ${result.acceptance_criteria_count}`,
		`criterion_coverage: ${result.criterion_coverage_count}`,
		`verification_receipt_summaries: ${result.verification_receipt_summary_count}`,
		`command_receipt_summaries: ${result.command_receipt_summary_count}`,
		`verification_coverage_states: ${result.verification_coverage_state_count}`,
		`verification_risk_signals: ${result.verification_risk_signal_count}`,
		`validation_ratchet_signals: ${result.validation_ratchet_signal_count}`,
		`completion_verdict_summaries: ${result.completion_verdict_summary_count}`,
		`repro_routes: ${result.repro_route_count}`,
		`repro_observations: ${result.repro_observation_count}`,
		`failure_fingerprints: ${result.failure_fingerprint_count}`,
		`source_anchors: ${result.source_anchor_count}`,
		`source_anchor_risk_signals: ${result.source_anchor_risk_signal_count}`,
		`index_mode: ${result.index_mode}`,
		`reused_existing: ${result.reused_existing ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
		`${t(lang, 'label.wroteFiles')}: ${result.wrote_files ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (result.dry_run) {
		lines.push(t(lang, 'index.dryRunNoFiles'));
	}

	return lines.join('\n');
}

export async function runIndex(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getIndexHelp(lang));
		return 0;
	}

	const parsed = parseCliOptions(args, INDEX_OPTIONS);

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf index --help', getIndexHelp(lang), lang);
		return 1;
	}

	const result = await createLocalIndex(resolveMustflowRoot(), {
		dryRun: hasParsedCliOption(parsed, '--dry-run'),
		includeSource: hasParsedCliOption(parsed, '--source'),
		incremental: hasParsedCliOption(parsed, '--incremental'),
	});

	if (hasParsedCliOption(parsed, '--json')) {
		reporter.stdout(JSON.stringify(result, null, 2));
		return 0;
	}

	reporter.stdout(renderIndexSummary(result, lang));
	return 0;
}
