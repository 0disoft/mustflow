import { inspectAdapterCompatibility, type AdapterCompatibilityReport } from '../../core/adapter-compatibility.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

interface ParsedAdaptersArgs {
	readonly action: 'status';
	readonly json: boolean;
	readonly error?: string;
}

export function getAdaptersHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf adapters status [options]',
			summary: t(lang, 'adapters.help.summary'),
			options: [
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf adapters status', 'mf adapters status --json'],
			exitCodes: [
				{ label: '0', description: t(lang, 'adapters.help.exit.ok') },
				{ label: '1', description: t(lang, 'adapters.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseAdaptersArgs(args: readonly string[], lang: CliLang): ParsedAdaptersArgs {
	const [action, ...rest] = args;
	const json = rest.includes('--json');
	const supported = new Set(['--json']);
	const unsupported = rest.find((arg) => arg.startsWith('-') && !supported.has(arg));

	if (!action) {
		return {
			action: 'status',
			json,
			error: t(lang, 'adapters.error.missingAction'),
		};
	}

	if (action !== 'status') {
		return {
			action: 'status',
			json,
			error: t(lang, 'adapters.error.unknownAction', { action }),
		};
	}

	if (unsupported) {
		return { action, json, error: t(lang, 'cli.error.unknownOption', { option: unsupported }) };
	}

	if (rest.some((arg) => !arg.startsWith('-'))) {
		const unexpected = rest.find((arg) => !arg.startsWith('-')) as string;
		return { action, json, error: t(lang, 'cli.error.unexpectedArgument', { argument: unexpected }) };
	}

	return { action, json };
}

function renderAdapterReport(report: AdapterCompatibilityReport, lang: CliLang): string {
	const lines = [
		t(lang, 'adapters.title'),
		`${t(lang, 'label.mustflowRoot')}: ${report.mustflow_root}`,
		`${t(lang, 'adapters.label.agents')}: ${report.agents_file.present ? t(lang, 'value.yes') : t(lang, 'value.no')}`,
		`${t(lang, 'adapters.label.hostInstructionFiles')}: ${report.summary.host_instruction_files}`,
		`${t(lang, 'adapters.label.adapterSurfaces')}: ${report.summary.adapter_surfaces_present}`,
		`${t(lang, 'adapters.label.compatibilityNotes')}: ${report.summary.compatibility_notes}`,
		`${t(lang, 'adapters.label.requiredChanges')}: ${report.summary.required_changes}`,
		`${t(lang, 'adapters.label.commandAuthority')}: ${report.boundaries.command_authority}`,
	];

	if (report.required_changes.length > 0) {
		lines.push('', t(lang, 'adapters.label.requiredChanges'));
		for (const finding of report.required_changes) {
			lines.push(`- [${finding.severity}] ${finding.path ?? '-'}: ${finding.message}`);
		}
	}

	if (report.compatibility_notes.length > 0) {
		lines.push('', t(lang, 'adapters.label.compatibilityNotes'));
		for (const finding of report.compatibility_notes) {
			lines.push(`- [${finding.severity}] ${finding.path ?? '-'}: ${finding.message}`);
		}
	}

	return lines.join('\n');
}

export function runAdapters(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getAdaptersHelp(lang));
		return 0;
	}

	const options = parseAdaptersArgs(args, lang);

	if (options.error) {
		printUsageError(reporter, options.error, 'mf adapters --help', getAdaptersHelp(lang), lang);
		return 1;
	}

	const report = inspectAdapterCompatibility(resolveMustflowRoot());

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return 0;
	}

	reporter.stdout(renderAdapterReport(report, lang));
	return 0;
}
