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
	CODE_OUTLINE_SCRIPT_REF,
	CODE_SYMBOL_READ_SCRIPT_REF,
	inspectCodeOutline,
	readCodeSymbol,
	type CodeOutlineReport,
	type CodeSymbolReadReport,
} from '../../core/code-outline.js';

const CODE_OUTLINE_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

const CODE_SYMBOL_READ_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--start-line', kind: 'string' },
	{ name: '--end-line', kind: 'string' },
	{ name: '--context-lines', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
	{ name: '--max-snippet-lines', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedCodeOutlineOptions {
	readonly action: 'scan';
	readonly json: boolean;
	readonly paths: readonly string[];
	readonly maxFiles: number | null;
	readonly maxFileBytes: number | null;
	readonly error?: string;
}

interface ParsedCodeSymbolReadOptions {
	readonly action: 'read';
	readonly json: boolean;
	readonly path: string | null;
	readonly startLine: number | null;
	readonly endLine: number | null;
	readonly contextLines: number | null;
	readonly maxFileBytes: number | null;
	readonly maxSnippetLines: number | null;
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
		return { value: null, error: t(lang, 'codeOutline.error.invalidPositiveInteger', { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'codeOutline.error.invalidPositiveInteger', { option, value }) };
	}

	return { value: parsed };
}

function parseNonNegativeInteger(
	value: string | null,
	option: string,
	lang: CliLang,
): { readonly value: number | null; readonly error?: string } {
	if (value === null) {
		return { value: null };
	}

	if (!/^(?:0|[1-9]\d*)$/u.test(value)) {
		return { value: null, error: t(lang, 'codeOutline.error.invalidNonNegativeInteger', { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'codeOutline.error.invalidNonNegativeInteger', { option, value }) };
	}

	return { value: parsed };
}

export function getCodeOutlineHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/outline scan <path...> [options]',
			summary: t(lang, 'codeOutline.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'codeOutline.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'codeOutline.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/outline scan src --json',
				'mf script-pack run code/outline scan src/cli/commands/script-pack.ts --max-files 20',
				'mf script-pack run code/outline scan src tests --max-file-bytes 262144 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'codeOutline.help.exit.ok') },
				{ label: '1', description: t(lang, 'codeOutline.help.exit.fail') },
			],
		},
		lang,
	);
}

export function getCodeSymbolReadHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/symbol-read read <path> --start-line <line> [options]',
			summary: t(lang, 'codeSymbolRead.help.summary'),
			options: [
				{ label: '--start-line <line>', description: t(lang, 'codeSymbolRead.help.option.startLine') },
				{ label: '--end-line <line>', description: t(lang, 'codeSymbolRead.help.option.endLine') },
				{ label: '--context-lines <count>', description: t(lang, 'codeSymbolRead.help.option.contextLines') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'codeOutline.help.option.maxFileBytes') },
				{ label: '--max-snippet-lines <count>', description: t(lang, 'codeSymbolRead.help.option.maxSnippetLines') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/symbol-read read src/cli/commands/script-pack.ts --start-line 100',
				'mf script-pack run code/symbol-read read src/core/code-outline.ts --start-line 320 --context-lines 2 --json',
				'mf script-pack run code/symbol-read read src/core/code-outline.ts --start-line 1 --end-line 40 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'codeSymbolRead.help.exit.ok') },
				{ label: '1', description: t(lang, 'codeSymbolRead.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseCodeOutlineOptions(args: readonly string[], lang: CliLang): ParsedCodeOutlineOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, CODE_OUTLINE_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const maxFiles = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-files'), '--max-files', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);

	if (action !== 'scan') {
		return {
			action: 'scan',
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			error: action ? t(lang, 'codeOutline.error.unknownAction', { action }) : t(lang, 'codeOutline.error.missingAction'),
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

	if (parsed.positionals.length === 0) {
		return {
			action,
			json,
			paths: parsed.positionals,
			maxFiles: maxFiles.value,
			maxFileBytes: maxFileBytes.value,
			error: t(lang, 'codeOutline.error.missingPath'),
		};
	}

	return {
		action,
		json,
		paths: parsed.positionals,
		maxFiles: maxFiles.value,
		maxFileBytes: maxFileBytes.value,
	};
}

function parseCodeSymbolReadOptions(args: readonly string[], lang: CliLang): ParsedCodeSymbolReadOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, CODE_SYMBOL_READ_OPTIONS, { allowPositionals: true });
	const json = hasParsedCliOption(parsed, '--json');
	const startLine = parsePositiveInteger(getParsedCliStringOption(parsed, '--start-line'), '--start-line', lang);
	const endLine = parsePositiveInteger(getParsedCliStringOption(parsed, '--end-line'), '--end-line', lang);
	const contextLines = parseNonNegativeInteger(getParsedCliStringOption(parsed, '--context-lines'), '--context-lines', lang);
	const maxFileBytes = parsePositiveInteger(getParsedCliStringOption(parsed, '--max-file-bytes'), '--max-file-bytes', lang);
	const maxSnippetLines = parsePositiveInteger(
		getParsedCliStringOption(parsed, '--max-snippet-lines'),
		'--max-snippet-lines',
		lang,
	);
	const inputPath = parsed.positionals[0] ?? null;

	if (action !== 'read') {
		return {
			action: 'read',
			json,
			path: inputPath,
			startLine: startLine.value,
			endLine: endLine.value,
			contextLines: contextLines.value,
			maxFileBytes: maxFileBytes.value,
			maxSnippetLines: maxSnippetLines.value,
			error: action ? t(lang, 'codeSymbolRead.error.unknownAction', { action }) : t(lang, 'codeSymbolRead.error.missingAction'),
		};
	}

	if (parsed.error) {
		return {
			action,
			json,
			path: inputPath,
			startLine: startLine.value,
			endLine: endLine.value,
			contextLines: contextLines.value,
			maxFileBytes: maxFileBytes.value,
			maxSnippetLines: maxSnippetLines.value,
			error: formatCliOptionParseError(parsed.error, lang),
		};
	}

	for (const candidate of [startLine, endLine, contextLines, maxFileBytes, maxSnippetLines]) {
		if (candidate.error) {
			return {
				action,
				json,
				path: inputPath,
				startLine: startLine.value,
				endLine: endLine.value,
				contextLines: contextLines.value,
				maxFileBytes: maxFileBytes.value,
				maxSnippetLines: maxSnippetLines.value,
				error: candidate.error,
			};
		}
	}

	if (parsed.positionals.length === 0) {
		return {
			action,
			json,
			path: null,
			startLine: startLine.value,
			endLine: endLine.value,
			contextLines: contextLines.value,
			maxFileBytes: maxFileBytes.value,
			maxSnippetLines: maxSnippetLines.value,
			error: t(lang, 'codeSymbolRead.error.missingPath'),
		};
	}

	if (parsed.positionals.length > 1) {
		return {
			action,
			json,
			path: inputPath,
			startLine: startLine.value,
			endLine: endLine.value,
			contextLines: contextLines.value,
			maxFileBytes: maxFileBytes.value,
			maxSnippetLines: maxSnippetLines.value,
			error: t(lang, 'codeSymbolRead.error.tooManyPaths'),
		};
	}

	if (startLine.value === null) {
		return {
			action,
			json,
			path: inputPath,
			startLine: null,
			endLine: endLine.value,
			contextLines: contextLines.value,
			maxFileBytes: maxFileBytes.value,
			maxSnippetLines: maxSnippetLines.value,
			error: t(lang, 'codeSymbolRead.error.missingStartLine'),
		};
	}

	return {
		action,
		json,
		path: inputPath,
		startLine: startLine.value,
		endLine: endLine.value,
		contextLines: contextLines.value,
		maxFileBytes: maxFileBytes.value,
		maxSnippetLines: maxSnippetLines.value,
	};
}

function renderCodeOutlineSummary(report: CodeOutlineReport, lang: CliLang): string {
	const lines = [
		t(lang, 'codeOutline.title'),
		`${t(lang, 'scriptPack.label.script')}: ${CODE_OUTLINE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'codeOutline.label.files')}: ${report.files.length}`,
		`${t(lang, 'codeOutline.label.symbols')}: ${report.symbols.length}`,
		`${t(lang, 'codeOutline.label.findings')}: ${report.findings.length}`,
	];

	if (report.symbols.length > 0) {
		lines.push(t(lang, 'codeOutline.label.outline'));
		for (const symbol of report.symbols) {
			const exported = symbol.exported ? ' export' : '';
			const asyncFlag = symbol.async ? ' async' : '';
			lines.push(
				`- ${symbol.path}:${symbol.start_line}-${symbol.end_line} ${symbol.kind}${exported}${asyncFlag} ${symbol.name}: ${symbol.signature}`,
			);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'codeOutline.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'codeOutline.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'codeOutline.clean'));
	}

	return lines.join('\n');
}

function renderCodeSymbolReadSummary(report: CodeSymbolReadReport, lang: CliLang): string {
	const target = report.target;
	const targetLabel =
		target === null || target.resolved_start_line === null || target.resolved_end_line === null
			? t(lang, 'value.none')
			: `${target.path}:${target.resolved_start_line}-${target.resolved_end_line}`;
	const lines = [
		t(lang, 'codeSymbolRead.title'),
		`${t(lang, 'scriptPack.label.script')}: ${CODE_SYMBOL_READ_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'codeSymbolRead.label.target')}: ${targetLabel}`,
		`${t(lang, 'codeSymbolRead.label.findings')}: ${report.findings.length}`,
	];

	if (target?.symbol) {
		lines.push(
			`${t(lang, 'codeSymbolRead.label.symbol')}: ${target.symbol.kind} ${target.symbol.name} (${target.symbol.start_line}-${target.symbol.end_line})`,
		);
	}

	if (report.snippet) {
		lines.push(t(lang, 'codeSymbolRead.label.snippet'));
		lines.push(report.snippet.text);
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'codeSymbolRead.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'codeOutline.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	return lines.join('\n');
}

export function runCodeOutlineScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeOutlineHelp(lang));
		return 0;
	}

	const options = parseCodeOutlineOptions(args, lang);
	if (options.error) {
		printUsageError(reporter, options.error, 'mf script-pack run code/outline --help', getCodeOutlineHelp(lang), lang);
		return 1;
	}

	const report = inspectCodeOutline(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderCodeOutlineSummary(report, lang));
	return report.ok ? 0 : 1;
}

export function runCodeSymbolReadScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeSymbolReadHelp(lang));
		return 0;
	}

	const options = parseCodeSymbolReadOptions(args, lang);
	if (options.error || options.path === null || options.startLine === null) {
		printUsageError(
			reporter,
			options.error ?? t(lang, 'cli.common.invalidInput'),
			'mf script-pack run code/symbol-read --help',
			getCodeSymbolReadHelp(lang),
			lang,
		);
		return 1;
	}

	const report = readCodeSymbol(resolveMustflowRoot(), {
		path: options.path,
		startLine: options.startLine,
		endLine: options.endLine,
		contextLines: options.contextLines ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
		maxSnippetLines: options.maxSnippetLines ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderCodeSymbolReadSummary(report, lang));
	return report.ok ? 0 : 1;
}
