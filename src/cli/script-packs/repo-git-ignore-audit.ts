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
	auditRepoGitIgnore,
	REPO_GIT_IGNORE_AUDIT_SCRIPT_REF,
	type GitIgnoreAuditReport,
} from '../../core/repo-git-ignore-audit.js';

const REPO_GIT_IGNORE_AUDIT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-paths', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoGitIgnoreAuditOptions {
	readonly action: 'audit';
	readonly paths: readonly string[];
	readonly json: boolean;
	readonly maxPaths?: number;
	readonly error?: string;
}

export function getRepoGitIgnoreAuditHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/git-ignore-audit audit [path...] [options]',
			summary: t(lang, 'gitIgnoreAudit.help.summary'),
			options: [
				{ label: '--max-paths <n>', description: t(lang, 'gitIgnoreAudit.help.option.maxPaths') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/git-ignore-audit audit --json',
				'mf script-pack run repo/git-ignore-audit audit .env.local dist/app.js --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'gitIgnoreAudit.help.exit.ok') },
				{ label: '1', description: t(lang, 'gitIgnoreAudit.help.exit.fail') },
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
		return t(lang, 'gitIgnoreAudit.error.invalidPositiveInteger', { option: label });
	}

	return parsed;
}

function parseRepoGitIgnoreAuditOptions(args: readonly string[], lang: CliLang): ParsedRepoGitIgnoreAuditOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_GIT_IGNORE_AUDIT_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'audit') {
		return {
			action: 'audit',
			paths: parsed.positionals,
			json,
			error: action
				? t(lang, 'gitIgnoreAudit.error.unknownAction', { action })
				: t(lang, 'gitIgnoreAudit.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, paths: parsed.positionals, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	const maxPaths = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-paths') ?? undefined, '--max-paths', lang);
	if (typeof maxPaths === 'string') {
		return { action, paths: parsed.positionals, json, error: maxPaths };
	}

	return {
		action,
		paths: parsed.positionals,
		json,
		maxPaths,
	};
}

function renderRepoGitIgnoreAuditSummary(report: GitIgnoreAuditReport, lang: CliLang): string {
	const lines = [
		t(lang, 'gitIgnoreAudit.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_GIT_IGNORE_AUDIT_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'gitIgnoreAudit.label.pathsChecked')}: ${report.summary.paths_checked}`,
		`${t(lang, 'gitIgnoreAudit.label.ignoredPaths')}: ${report.summary.ignored_paths}`,
		`${t(lang, 'gitIgnoreAudit.label.ignoreSources')}: ${report.summary.ignore_sources}`,
	];

	if (report.paths.length > 0) {
		lines.push(t(lang, 'gitIgnoreAudit.label.paths'));
		for (const entry of report.paths) {
			const evidence =
				entry.source_path && entry.source_line
					? ` (${entry.source_path}:${entry.source_line} ${entry.pattern ?? ''})`
					: '';
			lines.push(`- ${entry.path}: ${entry.status}${evidence}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'gitIgnoreAudit.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'gitIgnoreAudit.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.paths.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'gitIgnoreAudit.clean'));
	}

	return lines.join('\n');
}

export function runRepoGitIgnoreAuditScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoGitIgnoreAuditHelp(lang));
		return 0;
	}

	const options = parseRepoGitIgnoreAuditOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/git-ignore-audit --help',
			getRepoGitIgnoreAuditHelp(lang),
			lang,
		);
		return 1;
	}

	const report = auditRepoGitIgnore(resolveMustflowRoot(), {
		paths: options.paths,
		maxPaths: options.maxPaths,
	});
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoGitIgnoreAuditSummary(report, lang));
	return report.ok ? 0 : 1;
}
