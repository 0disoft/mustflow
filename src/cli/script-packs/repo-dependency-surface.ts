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
	inspectRepoDependencySurface,
	REPO_DEPENDENCY_SURFACE_SCRIPT_REF,
	type RepoDependencySurfaceReport,
} from '../../core/repo-dependency-surface.js';

const REPO_DEPENDENCY_SURFACE_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoDependencySurfaceOptions {
	readonly action: 'inspect';
	readonly json: boolean;
	readonly error?: string;
}

export function getRepoDependencySurfaceHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/dependency-surface inspect [options]',
			summary: t(lang, 'dependencySurface.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/dependency-surface inspect',
				'mf script-pack run repo/dependency-surface inspect --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'dependencySurface.help.exit.ok') },
				{ label: '1', description: t(lang, 'dependencySurface.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseRepoDependencySurfaceOptions(args: readonly string[], lang: CliLang): ParsedRepoDependencySurfaceOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_DEPENDENCY_SURFACE_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'inspect') {
		return {
			action: 'inspect',
			json,
			error: action
				? t(lang, 'dependencySurface.error.unknownAction', { action })
				: t(lang, 'dependencySurface.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { action, json };
}

function renderRepoDependencySurfaceSummary(report: RepoDependencySurfaceReport, lang: CliLang): string {
	const lines = [
		t(lang, 'dependencySurface.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_DEPENDENCY_SURFACE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'dependencySurface.label.surfaces')}: ${report.summary.surface_count}`,
		`${t(lang, 'dependencySurface.label.ecosystems')}: ${report.summary.ecosystem_count}`,
		`${t(lang, 'dependencySurface.label.findings')}: ${report.summary.finding_count}`,
	];

	if (report.surfaces.length > 0) {
		lines.push(t(lang, 'dependencySurface.label.surfaceDetails'));
		for (const surface of report.surfaces) {
			const location = surface.line === null ? surface.path : `${surface.path}:${surface.line}`;
			lines.push(`- ${surface.ecosystem} ${surface.kind} ${surface.name} at ${location}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'dependencySurface.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'dependencySurface.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

export function runRepoDependencySurfaceScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoDependencySurfaceHelp(lang));
		return 0;
	}

	const options = parseRepoDependencySurfaceOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/dependency-surface --help',
			getRepoDependencySurfaceHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectRepoDependencySurface(resolveMustflowRoot());
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoDependencySurfaceSummary(report, lang));
	return report.ok ? 0 : 1;
}
