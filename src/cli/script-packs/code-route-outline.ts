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
	CODE_ROUTE_OUTLINE_SCRIPT_REF,
	inspectRouteOutline,
	type RouteOutlineReport,
} from '../../core/route-outline.js';

const CODE_ROUTE_OUTLINE_OPTIONS = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--max-files', kind: 'string' },
	{ name: '--max-file-bytes', kind: 'string' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedCodeRouteOutlineOptions {
	readonly action: 'scan';
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
		return { value: null, error: t(lang, 'codeRouteOutline.error.invalidPositiveInteger', { option, value }) };
	}

	const parsed = Number(value);
	if (!Number.isSafeInteger(parsed)) {
		return { value: null, error: t(lang, 'codeRouteOutline.error.invalidPositiveInteger', { option, value }) };
	}

	return { value: parsed };
}

export function getCodeRouteOutlineHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf script-pack run code/route-outline scan <path...> [options]',
			summary: t(lang, 'codeRouteOutline.help.summary'),
			options: [
				{ label: '--max-files <count>', description: t(lang, 'codeRouteOutline.help.option.maxFiles') },
				{ label: '--max-file-bytes <bytes>', description: t(lang, 'codeRouteOutline.help.option.maxFileBytes') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf script-pack run code/route-outline scan src --json',
				'mf script-pack run code/route-outline scan src/server.ts --max-files 20',
				'mf script-pack run code/route-outline scan src apps/api --max-file-bytes 262144 --json',
			],
			exitCodes: [
				{ label: '0', description: t(lang, 'codeRouteOutline.help.exit.ok') },
				{ label: '1', description: t(lang, 'codeRouteOutline.help.exit.fail') },
			],
		},
		lang,
	);
}

function parseCodeRouteOutlineOptions(args: readonly string[], lang: CliLang): ParsedCodeRouteOutlineOptions {
	const [action, ...rest] = args;
	const parsed = parseCliOptions(rest, CODE_ROUTE_OUTLINE_OPTIONS, { allowPositionals: true });
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
			error: action
				? t(lang, 'codeRouteOutline.error.unknownAction', { action })
				: t(lang, 'codeRouteOutline.error.missingAction'),
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
			error: t(lang, 'codeRouteOutline.error.missingPath'),
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

function renderCodeRouteOutlineSummary(report: RouteOutlineReport, lang: CliLang): string {
	const lines = [
		t(lang, 'codeRouteOutline.title'),
		`${t(lang, 'scriptPack.label.script')}: ${CODE_ROUTE_OUTLINE_SCRIPT_REF}`,
		`${t(lang, 'label.status')}: ${report.status}`,
		`${t(lang, 'codeRouteOutline.label.files')}: ${report.files.length}`,
		`${t(lang, 'codeRouteOutline.label.routes')}: ${report.routes.length}`,
		`${t(lang, 'codeRouteOutline.label.findings')}: ${report.findings.length}`,
	];

	if (report.routes.length > 0) {
		lines.push(t(lang, 'codeRouteOutline.label.outline'));
		for (const route of report.routes) {
			const routePath = route.route_path ?? '<dynamic>';
			const lifecycle = route.lifecycle.length > 0 ? ` [${route.lifecycle.join(' > ')}]` : '';
			lines.push(
				`- ${route.path}:${route.line} ${route.framework} ${route.method.toUpperCase()} ${routePath}${lifecycle}: ${route.signature}`,
			);
		}
	}

	if (report.findings.length > 0) {
		lines.push(t(lang, 'codeRouteOutline.label.findings'));
		for (const finding of report.findings) {
			lines.push(`- ${finding.path}: ${finding.code} (${finding.message})`);
		}
	}

	if (report.issues.length > 0) {
		lines.push(t(lang, 'codeRouteOutline.label.issues'), ...report.issues.map((issue) => `- ${issue}`));
	}

	if (report.routes.length === 0 && report.findings.length === 0 && report.issues.length === 0) {
		lines.push(t(lang, 'codeRouteOutline.clean'));
	}

	return lines.join('\n');
}

export function runCodeRouteOutlineScript(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getCodeRouteOutlineHelp(lang));
		return 0;
	}

	const options = parseCodeRouteOutlineOptions(args, lang);
	if (options.error) {
		printUsageError(
			reporter,
			options.error,
			'mf script-pack run code/route-outline --help',
			getCodeRouteOutlineHelp(lang),
			lang,
		);
		return 1;
	}

	const report = inspectRouteOutline(resolveMustflowRoot(), {
		paths: options.paths,
		maxFiles: options.maxFiles ?? undefined,
		maxFileBytes: options.maxFileBytes ?? undefined,
	});

	if (options.json) {
		reporter.stdout(JSON.stringify(report, null, 2));
		return report.ok ? 0 : 1;
	}

	reporter.stdout(renderCodeRouteOutlineSummary(report, lang));
	return report.ok ? 0 : 1;
}
