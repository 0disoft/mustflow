import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { inspectLineEndings, type LineEndingReport } from '../../core/line-endings.js';

interface ParsedLineEndingOptions {
	readonly action: 'check' | 'normalize';
	readonly json: boolean;
	readonly apply: boolean;
	readonly dryRun: boolean;
	readonly all: boolean;
	readonly error?: string;
}

export function getLineEndingsHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf line-endings <check|normalize> [options]',
			summary: t(lang, 'lineEndings.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '--all', description: t(lang, 'lineEndings.help.option.all') },
				{ label: '--dry-run', description: t(lang, 'lineEndings.help.option.dryRun') },
				{ label: '--apply', description: t(lang, 'lineEndings.help.option.apply') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf line-endings check',
				'mf line-endings normalize --dry-run',
				'mf line-endings normalize --apply',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'lineEndings.help.exit.ok') },
				{ label: '1', description: t(lang, 'lineEndings.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseLineEndingOptions(args: readonly string[], lang: CliLang): ParsedLineEndingOptions {
	const [action, ...rest] = args;
	const json = rest.includes('--json');
	const apply = rest.includes('--apply');
	const dryRun = rest.includes('--dry-run');
	const all = rest.includes('--all');
	const supported = new Set(['--json', '--all', '--apply', '--dry-run']);
	const unsupported = rest.find((arg) => arg.startsWith('-') && !supported.has(arg));

	if (action !== 'check' && action !== 'normalize') {
		return {
			action: 'check',
			json,
			apply,
			dryRun,
			all,
			error: action ? t(lang, 'lineEndings.error.unknownAction', { action }) : t(lang, 'lineEndings.error.missingAction'),
		};
	}

	if (unsupported) {
		return { action, json, apply, dryRun, all, error: t(lang, 'cli.error.unknownOption', { option: unsupported }) };
	}

	if (action === 'check' && (apply || dryRun)) {
		return { action, json, apply, dryRun, all, error: t(lang, 'lineEndings.error.checkModeOption') };
	}

	if (action === 'normalize' && apply && dryRun) {
		return { action, json, apply, dryRun, all, error: t(lang, 'lineEndings.error.conflictingModes') };
	}

	return { action, json, apply, dryRun, all };
}

function renderLineEndingSummary(report: LineEndingReport, lang: CliLang): string {
	const lines = [
		t(lang, 'lineEndings.title'),
		`${t(lang, 'label.mode')}: ${report.mode}`,
		`${t(lang, 'label.scope')}: ${report.scope}`,
		`${t(lang, 'lineEndings.label.policy')}: ${report.policy}`,
		`${t(lang, 'lineEndings.label.checkedFiles')}: ${report.checked_files}`,
		`${t(lang, 'lineEndings.label.nonCompliantFiles')}: ${report.non_compliant_files.length}`,
		`${t(lang, 'label.wroteFiles')}: ${report.wrote_files ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
	];

	if (report.issues.length > 0) {
		lines.push(t(lang, 'lineEndings.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.non_compliant_files.length > 0) {
		lines.push(t(lang, 'lineEndings.label.files'));
		for (const file of report.non_compliant_files) {
			const action = file.changed ? t(lang, 'lineEndings.value.changed') : t(lang, 'lineEndings.value.wouldChange');
			lines.push(`- ${file.path} [${file.lineEnding}] ${action}`);
		}
	}

	if (report.non_compliant_files.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'lineEndings.clean'));
	}

	return lines.join('\n');
}

export function runLineEndings(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getLineEndingsHelp(lang));
		return 0;
	}

	const options = parseLineEndingOptions(args, lang);

	if (options.error) {
		printUsageError(reporter, options.error, 'mf line-endings --help', getLineEndingsHelp(lang), lang);
		return 1;
	}

	const mode = options.action === 'check' ? 'check' : 'normalize';
	const report = inspectLineEndings(resolveMustflowRoot(), mode, {
		apply: options.action === 'normalize' && options.apply,
		scope: options.all ? 'tracked' : 'changed',
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderLineEndingSummary(report, lang));
	return report.ok ? 0 : 1;
}
