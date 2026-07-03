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
	inspectRepoAutomationSurface,
	REPO_AUTOMATION_SURFACE_SCRIPT_REF,
	type RepoAutomationSurfaceReport,
} from '../../core/repo-automation-surface.js';

const REPO_AUTOMATION_SURFACE_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoAutomationSurfaceOptions {
	readonly action: 'inspect';
	readonly json: boolean;
	readonly error?: string;
}

export function getRepoAutomationSurfaceHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/automation-surface inspect [options]',
			summary: t(lang, 'automationSurface.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/automation-surface inspect',
				'mf script-pack run repo/automation-surface inspect --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'automationSurface.help.exit.ok') },
				{ label: '1', description: t(lang, 'automationSurface.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseRepoAutomationSurfaceOptions(args: readonly string[], lang: CliLang): ParsedRepoAutomationSurfaceOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_AUTOMATION_SURFACE_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'inspect') {
		return {
			action: 'inspect',
			json,
			error: action
				? t(lang, 'automationSurface.error.unknownAction', { action })
				: t(lang, 'automationSurface.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { action, json };
}

function renderRepoAutomationSurfaceSummary(report: RepoAutomationSurfaceReport, lang: CliLang): string {
	const lines = [
		t(lang, 'automationSurface.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_AUTOMATION_SURFACE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'automationSurface.label.surfaces')}: ${report.summary.surface_count}`,
		`${t(lang, 'automationSurface.label.risky')}: ${report.summary.risky_surface_count}`,
		`${t(lang, 'automationSurface.label.findings')}: ${report.findings.length}`,
	];

	if (report.surfaces.length > 0) {
		lines.push(t(lang, 'automationSurface.label.surfaceDetails'));
		for (const surface of report.surfaces.slice(0, 30)) {
			const location = surface.line === null ? surface.path : `${surface.path}:${surface.line}`;
			const mapped = surface.mapped_intent === null ? 'unmapped' : `intent ${surface.mapped_intent}`;
			lines.push(`- ${surface.name} (${surface.category}, ${surface.kind}, ${mapped}) at ${location}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'automationSurface.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'automationSurface.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

export function runRepoAutomationSurfaceScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoAutomationSurfaceHelp(lang));
		return 0;
	}

	const options = parseRepoAutomationSurfaceOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/automation-surface --help',
			getRepoAutomationSurfaceHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectRepoAutomationSurface(resolveMustflowRoot());
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoAutomationSurfaceSummary(report, lang));
	return report.ok ? 0 : 1;
}
