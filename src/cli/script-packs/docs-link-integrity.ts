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
	checkLinkIntegrity,
	LINK_INTEGRITY_SCRIPT_REF,
	type LinkIntegrityReport,
} from '../../core/docs-link-integrity.js';

const LINK_INTEGRITY_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedLinkIntegrityOptions {
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
		return { value: null, error: t(lang, 'linkIntegrity.error.invalidPositiveInteger', { option, value }) };
	}
	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'linkIntegrity.error.invalidPositiveInteger', { option, value }) };
	}
	return { value: parsed };
}

export function getDocsLinkIntegrityHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run docs/link-integrity check [path...] [options]',
			summary: t(lang, 'linkIntegrity.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'linkIntegrity.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'linkIntegrity.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run docs/link-integrity check --json',
				'mf script-pack run docs/link-integrity check README.md schemas/README.md --json',
				'mf script-pack run docs/link-integrity check docs-site/src/content/docs --max-files 80 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'linkIntegrity.help.exit.ok') },
				{ label: '1', description: t(lang, 'linkIntegrity.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseLinkIntegrityOptions(args: readonly string[], lang: CliLang): ParsedLinkIntegrityOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, LINK_INTEGRITY_OPTIONS, { allowPositionals: true });
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
				? t(lang, 'linkIntegrity.error.unknownAction', { action })
				: t(lang, 'linkIntegrity.error.missingAction'),
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

function renderLinkIntegritySummary(report: LinkIntegrityReport, lang: CliLang): string {
	const lines = [
		t(lang, 'linkIntegrity.title'),
		`${t(lang, 'scriptPack.label.script')}: ${LINK_INTEGRITY_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'linkIntegrity.label.files')}: ${report.files.length}`,
		`${t(lang, 'linkIntegrity.label.links')}: ${report.links.length}`,
		`${t(lang, 'linkIntegrity.label.findings')}: ${report.findings.length}`,
	];

	if (report.links.length > 0) {
		lines.push(t(lang, 'linkIntegrity.label.links'));
		for (const link of report.links.slice(0, 40)) {
			const resolved = link.resolved_path === null ? link.target : link.resolved_path;
			lines.push(`- ${link.path}:${link.line}: ${link.kind} ${resolved} (${link.status})`);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'linkIntegrity.label.findings'));
		for (const finding of report.findings) {
			const line = finding.line === undefined ? '' : `:${finding.line}`;
			lines.push(`- ${finding.path}${line}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'linkIntegrity.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.links.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'linkIntegrity.clean'));
	}

	return lines.join('\n');
}

export function runDocsLinkIntegrityScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getDocsLinkIntegrityHelp(lang));
		return 0;
	}

	const options = parseLinkIntegrityOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run docs/link-integrity --help',
			getDocsLinkIntegrityHelp(lang),
			lang,
		);
		return 1;
	}

	const report = checkLinkIntegrity(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderLinkIntegritySummary(report, lang));
	return report.ok ? 0 : 1;
}
