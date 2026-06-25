import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import {
	formatCliOptionParseError,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import {
	checkRepoApprovalGate,
	REPO_APPROVAL_GATE_SCRIPT_REF,
	type RepoApprovalGateReport,
} from '../../core/repo-approval-gate.js';

const REPO_APPROVAL_GATE_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--action', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoApprovalGateOptions {
	readonly action: 'check';
	readonly json: boolean;
	readonly actionTypes: readonly string[];
	readonly error?: string;
}

export function getRepoApprovalGateHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/approval-gate check --action <type> [options]',
			summary: t(lang, 'approvalGate.help.summary'),
			options: [
				{ label: '--action <type>', description: t(lang, 'approvalGate.help.option.action') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/approval-gate check --action git_commit',
				'mf script-pack run repo/approval-gate check --action dependency_install --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'approvalGate.help.exit.ok') },
				{ label: '1', description: t(lang, 'approvalGate.help.exit.fail') },
			],
		},
		lang,
	);
}

function parsedStringOccurrences(
	parsed: ReturnType<typeof parseCliOptions>,
	name: string,
): readonly string[] {
	return parsed.occurrences
		.filter((occurrence) => occurrence.name === name && typeof occurrence.value === 'string')
		.map((occurrence) => String(occurrence.value));
}

function parseRepoApprovalGateOptions(args: readonly string[], lang: CliLang): ParsedRepoApprovalGateOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_APPROVAL_GATE_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');
	const actionTypes = parsedStringOccurrences(parsed, '--action').map((entry) => entry.trim()).filter(Boolean);

	if (action !== 'check') {
		return {
			action: 'check',
			json,
			actionTypes,
			error: action
				? t(lang, 'approvalGate.error.unknownAction', { action })
				: t(lang, 'approvalGate.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, actionTypes, error: formatCliOptionParseError(parsed.error, lang) };
	}

	if (actionTypes.length === 0) {
		return { action, json, actionTypes, error: t(lang, 'approvalGate.error.missingActionType') };
	}

	return { action, json, actionTypes };
}

function renderRepoApprovalGateSummary(report: RepoApprovalGateReport, lang: CliLang): string {
	const lines = [
		t(lang, 'approvalGate.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_APPROVAL_GATE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'approvalGate.label.approvalRequired')}: ${
			report.approval_required ? t(lang, 'value.yes') : t(lang, 'value.no')
		}`,
		`${t(lang, 'approvalGate.label.configuredRequiredActions')}: ${report.policy.required_for.length}`,
	];

	if (report.decisions.length > 0) {
		lines.push(t(lang, 'approvalGate.label.decisions'));
		for (const decision of report.decisions) {
			const state = decision.approval_required ? t(lang, 'value.yes') : t(lang, 'value.no');
			lines.push(`- ${decision.action_type}: ${state} (${decision.reason})`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'approvalGate.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.code}: ${finding.message}`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'approvalGate.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

export function runRepoApprovalGateScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoApprovalGateHelp(lang));
		return 0;
	}

	const options = parseRepoApprovalGateOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/approval-gate --help',
			getRepoApprovalGateHelp(lang),
			lang,
		);
		return 1;
	}

	const report = checkRepoApprovalGate(resolveMustflowRoot(), options.actionTypes);
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoApprovalGateSummary(report, lang));
	return report.ok ? 0 : 1;
}
