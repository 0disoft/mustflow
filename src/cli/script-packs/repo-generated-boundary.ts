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
	GENERATED_BOUNDARY_SCRIPT_REF,
	inspectGeneratedBoundary,
	type GeneratedBoundaryReport,
} from '../../core/generated-boundary.js';

const GENERATED_BOUNDARY_OPTIONS = [{ name: '--json', kind: 'boolean' }] as const satisfies readonly CliOptionSpec[];

interface ParsedGeneratedBoundaryOptions {
	readonly action: 'check';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly error?: string;
}

export function getRepoGeneratedBoundaryHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run repo/generated-boundary check <path...> [options]',
			summary: t(lang, 'generatedBoundary.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run repo/generated-boundary check src/cli/index.ts',
				'mf script-pack run repo/generated-boundary check dist/cli/index.js --json',
				'mf script-pack run repo/generated-boundary check AGENTS.md .mustflow/config/manifest.lock.toml',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'generatedBoundary.help.exit.ok') },
				{ label: '1', description: t(lang, 'generatedBoundary.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseGeneratedBoundaryOptions(args: readonly string[], lang: CliLang): ParsedGeneratedBoundaryOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, GENERATED_BOUNDARY_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');

	if (action !== 'check') {
		return {
			action: 'check',
			json,
			paths: parsed.positionals,
			error: action
				? t(lang, 'generatedBoundary.error.unknownAction', { action })
				: t(lang, 'generatedBoundary.error.missingAction'),
		};
	}

	if (parsed.error) {
		return { action, json, paths: parsed.positionals, error: formatCliOptionParseError(parsed.error, lang) };
	}

	if (parsed.positionals.length === 0) {
		return { action, json, paths: parsed.positionals, error: t(lang, 'generatedBoundary.error.missingPath') };
	}

	return { action, json, paths: parsed.positionals };
}

function renderGeneratedBoundarySummary(report: GeneratedBoundaryReport, lang: CliLang): string {
	const lines = [
		t(lang, 'generatedBoundary.title'),
		`${t(lang, 'scriptPack.label.script')}: ${GENERATED_BOUNDARY_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'generatedBoundary.label.checkedTargets')}: ${report.targets.length}`,
		`${t(lang, 'generatedBoundary.label.findings')}: ${report.findings.length}`,
	];

	if (report.targets.length > 0) {
		lines.push(t(lang, 'generatedBoundary.label.targets'));
		for (const target of report.targets) {
			const boundaries =
				target.matched_boundaries.length === 0 ? t(lang, 'value.none') : target.matched_boundaries.join(', ');
			lines.push(`- ${target.path}: ${target.kind}, ${t(lang, 'generatedBoundary.label.boundaries')}: ${boundaries}`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'generatedBoundary.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'generatedBoundary.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'generatedBoundary.clean'));
	}

	return lines.join('\n');
}

export function runRepoGeneratedBoundaryScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getRepoGeneratedBoundaryHelp(lang));
		return 0;
	}

	const options = parseGeneratedBoundaryOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run repo/generated-boundary --help',
			getRepoGeneratedBoundaryHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectGeneratedBoundary(resolveMustflowRoot(), { paths: options.paths });
	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderGeneratedBoundarySummary(report, lang));
	return report.ok ? 0 : 1;
}
