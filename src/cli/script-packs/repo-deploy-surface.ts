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
	inspectRepoDeploySurface,
	REPO_DEPLOY_SURFACE_SCRIPT_REF,
	type RepoDeploySurfaceReport,
} from '../../core/repo-deploy-surface.js';

const REPO_DEPLOY_SURFACE_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedRepoDeploySurfaceOptions {
	readonly action: 'inspect';
	readonly json: boolean;
	readonly error?: string;
}

export function getRepoDeploySurfaceHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/deploy-surface inspect [options]',
			summary: t(lang, 'deploySurface.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/deploy-surface inspect',
				'mf script-pack run repo/deploy-surface inspect --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'deploySurface.help.exit.ok') },
				{ label: '1', description: t(lang, 'deploySurface.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseRepoDeploySurfaceOptions(args: readonly string[], lang: CliLang): ParsedRepoDeploySurfaceOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REPO_DEPLOY_SURFACE_OPTIONS, { allowPositionals: false });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'inspect') {
		return {
			action: 'inspect',
			json,
			error: action
				? t(lang, 'deploySurface.error.unknownAction', { action })
				: t(lang, 'deploySurface.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, error: formatCliOptionParseError(parsed.error, lang) };
	}

	return { action, json };
}

function renderRepoDeploySurfaceSummary(report: RepoDeploySurfaceReport, lang: CliLang): string {
	const lines = [
		t(lang, 'deploySurface.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REPO_DEPLOY_SURFACE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'deploySurface.label.deploySurface')}: ${
			report.has_deploy_surface ? t(lang, 'value.yes') : t(lang, 'value.no')
		}`,
		`${t(lang, 'deploySurface.label.surfaces')}: ${report.summary.surface_count}`,
		`${t(lang, 'deploySurface.label.requiredVerification')}: ${report.summary.required_verification_count}`,
		`${t(lang, 'deploySurface.label.manualGates')}: ${report.summary.manual_gate_count}`,
	];

	if (report.surfaces.length > 0) {
		lines.push(t(lang, 'deploySurface.label.surfaceDetails'));
		for (const surface of report.surfaces) {
			const location = surface.line === null ? surface.path : `${surface.path}:${surface.line}`;
			const trigger = surface.trigger === null ? '' : `, trigger ${surface.trigger}`;
			lines.push(`- ${surface.surface_type} (${surface.kind}) at ${location}${trigger}`);
		}
	}

	if (report.required_verification.length > 0) {
		lines.push(t(lang, 'deploySurface.label.requiredVerification'));
		for (const verification of report.required_verification) {
			lines.push(`- ${verification}`);
		}
	}

	if (report.manual_gates.length > 0) {
		lines.push(t(lang, 'deploySurface.label.manualGates'));
		for (const gate of report.manual_gates) {
			lines.push(`- ${gate}`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'deploySurface.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (!report.has_deploy_surface && report.issues.length === 0) {
		lines.push(t(lang, 'deploySurface.noSurfaces'));
	}

	return lines.join('\n');
}

export function runRepoDeploySurfaceScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoDeploySurfaceHelp(lang));
		return 0;
	}

	const options = parseRepoDeploySurfaceOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/deploy-surface --help',
			getRepoDeploySurfaceHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectRepoDeploySurface(resolveMustflowRoot());
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderRepoDeploySurfaceSummary(report, lang));
	return report.ok ? 0 : 1;
}
