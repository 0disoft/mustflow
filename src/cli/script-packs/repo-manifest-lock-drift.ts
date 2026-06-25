import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import {
	checkRepoManifestLockDrift,
	REPO_MANIFEST_LOCK_DRIFT_SCRIPT_REF,
	type ManifestLockDriftReport,
} from '../../core/repo-manifest-lock-drift.js';

const REPO_MANIFEST_LOCK_DRIFT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-entries', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoManifestLockDriftOptions {
	readonly action: 'check';
	readonly paths: readonly string[];
	readonly json: boolean;
	readonly maxEntries?: number;
	readonly error?: string;
}

export function getRepoManifestLockDriftHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/manifest-lock-drift check [path...] [options]',
			summary: t(lang, 'manifestLockDrift.help.summary'),
			options: [
				{ label: '--max-entries <n>', description: t(lang, 'manifestLockDrift.help.option.maxEntries') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/manifest-lock-drift check --json',
				'mf script-pack run repo/manifest-lock-drift check AGENTS.md .mustflow/config/commands.toml --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'manifestLockDrift.help.exit.ok') },
				{ label: '1', description: t(lang, 'manifestLockDrift.help.exit.fail') },
			],
		},
		lang,
	);
}

function parsePositiveInteger(value: string | undefined, label: string, lang: CliLang): number | undefined | string {
	if (value === undefined) {
		return undefined;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		return t(lang, 'manifestLockDrift.error.invalidPositiveInteger', { option: label });
	}

	return parsed;
}

function parseRepoManifestLockDriftOptions(args: readonly string[], lang: CliLang): ParsedRepoManifestLockDriftOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_MANIFEST_LOCK_DRIFT_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'check') {
		return {
			action: 'check',
			paths: parsed.positionals,
			json,
			error: action
				? t(lang, 'manifestLockDrift.error.unknownAction', { action })
				: t(lang, 'manifestLockDrift.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, paths: parsed.positionals, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	const maxEntries = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-entries') ?? undefined, '--max-entries', lang);
	if (typeof maxEntries === 'string') {
		return { action, paths: parsed.positionals, json, error: maxEntries };
	}

	return {
		action,
		paths: parsed.positionals,
		json,
		maxEntries,
	};
}

function renderRepoManifestLockDriftSummary(report: ManifestLockDriftReport, lang: CliLang): string {
	const lines = [
		t(lang, 'manifestLockDrift.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_MANIFEST_LOCK_DRIFT_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'manifestLockDrift.label.entriesChecked')}: ${report.summary.entries_checked}`,
		`${t(lang, 'manifestLockDrift.label.hashMismatches')}: ${report.summary.hash_mismatches}`,
		`${t(lang, 'manifestLockDrift.label.missingEntries')}: ${report.summary.missing_entries}`,
	];

	if (report.entries.length > 0) {
		lines.push(t(lang, 'manifestLockDrift.label.entries'));
		for (const entry of report.entries) {
			if (entry.status === 'skipped') {
				continue;
			}
			const evidence =
				entry.lock_hash && entry.actual_hash && entry.lock_hash !== entry.actual_hash
					? ` (${entry.lock_hash} != ${entry.actual_hash})`
					: '';
			lines.push(`- ${entry.path}: ${entry.status}${evidence}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'manifestLockDrift.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'manifestLockDrift.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'manifestLockDrift.clean'));
	}

	return lines.join('\n');
}

export function runRepoManifestLockDriftScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoManifestLockDriftHelp(lang));
		return 0;
	}

	const options = parseRepoManifestLockDriftOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/manifest-lock-drift --help',
			getRepoManifestLockDriftHelp(lang),
			lang,
		);
		return 1;
	}

	const report = checkRepoManifestLockDrift(resolveMustflowRoot(), {
		paths: options.paths,
		maxEntries: options.maxEntries,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoManifestLockDriftSummary(report, lang));
	return report.ok ? 0 : 1;
}
