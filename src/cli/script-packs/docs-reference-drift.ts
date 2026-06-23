import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { COMMAND_DEFINITIONS } from '../lib/command-registry.js';
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
import { listScriptPackScripts } from '../lib/script-pack-registry.js';
import {
	checkReferenceDrift,
	REFERENCE_DRIFT_SCRIPT_REF,
	type ReferenceDriftReport,
} from '../../core/reference-drift.js';
import { getPublicJsonSchemaFiles } from '../../core/public-json-contracts.js';

const REFERENCE_DRIFT_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedReferenceDriftOptions {
	readonly action: 'check';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly error?: string;
}

function parsePositiveInteger(
	value: string | null,
	option: string,
	lang: CliLang,
): { readonly value: number | null; readonly error?: string } {
	if (value === null) {
		return { value: null };
	}
	if (!/^[1-9]\d*$/u.test(value)) {
		return { value: null, error: t(lang, 'referenceDrift.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'referenceDrift.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getDocsReferenceDriftHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run docs/reference-drift check [path...] [options]',
			summary: t(lang, 'referenceDrift.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'referenceDrift.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'referenceDrift.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run docs/reference-drift check --json',
				'mf script-pack run docs/reference-drift check README.md schemas/README.md --json',
				'mf script-pack run docs/reference-drift check docs-site/src/content/docs --max-files 80 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'referenceDrift.help.exit.ok') },
				{ label: '1', description: t(lang, 'referenceDrift.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseReferenceDriftOptions(args: readonly string[], lang: CliLang): ParsedReferenceDriftOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, REFERENCE_DRIFT_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);

	if (action !== 'check') {
		return {
			action: 'check',
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			error: action
				? t(lang, 'referenceDrift.error.unknownAction', { action })
				: t(lang, 'referenceDrift.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [maxFiles, maxFileBytes]) {
		if (candidate.error) {
			return {
				action,
				json,
				paths: parsed.positionals,
				maxFiles: maxFiles.value,
				maxFileBytes: maxFileBytes.value,
				error: candidate.error,
			};
		}
	}

	return {
		action,
		json,
		paths: parsed.positionals,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
	};
}

function renderReferenceDriftSummary(report: ReferenceDriftReport, lang: CliLang): string {
	const lines = [
		t(lang, 'referenceDrift.title'),
		`${t(lang, 'scriptPack.label.script')}: ${REFERENCE_DRIFT_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'referenceDrift.label.files')}: ${report.files.length}`,
		`${t(lang, 'referenceDrift.label.references')}: ${report.references.length}`,
		`${t(lang, 'referenceDrift.label.findings')}: ${report.findings.length}`,
	];

	if (report.references.length > 0) {
		lines.push(t(lang, 'referenceDrift.label.references'));
		for (const reference of report.references.slice(0, 40)) {
			lines.push(`- ${reference.path}:${reference.line}: ${reference.kind} ${reference.target} (${reference.status})`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'referenceDrift.label.findings'));
		for (const finding of report.findings) {
			const line = finding.line === undefined ? '' : `:${finding.line}`;
			lines.push(`- ${finding.path}${line}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'referenceDrift.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.references.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'referenceDrift.clean'));
	}

	return lines.join('\n');
}

export function runDocsReferenceDriftScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getDocsReferenceDriftHelp(lang));
		return 0;
	}

	const options = parseReferenceDriftOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run docs/reference-drift --help',
			getDocsReferenceDriftHelp(lang),
			lang,
		);
		return 1;
	}

	const report = checkReferenceDrift(resolveMustflowRoot(), {
		paths: options.paths,
		commandNames: COMMAND_DEFINITIONS.map((definition) => definition.id),
		scriptRefs: listScriptPackScripts().map((script) => script.ref),
		schemaFiles: getPublicJsonSchemaFiles(),
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderReferenceDriftSummary(report, lang));
	return report.ok ? 0 : 1;
}
