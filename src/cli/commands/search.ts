import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang, type MessageKey, type MessageParams } from '../lib/i18n.js';
import { searchLocalIndex, type LocalSearchResult, type LocalSearchScope } from '../lib/local-index.js';
import {
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionParseError,
	type CliOptionSpec,
} from '../lib/option-parser.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

const SEARCH_OPTIONS = [
	{ name: '--limit', kind: 'string' },
	{ name: '--scope', kind: 'string' },
	{ name: '--json', kind: 'boolean' },
] as const satisfies readonly CliOptionSpec[];

interface ParsedSearchOptions {
	readonly query: string;
	readonly limit: number;
	readonly scope: LocalSearchScope;
	readonly json: boolean;
	readonly error?: { readonly key: MessageKey; readonly params?: MessageParams };
}

export function getSearchHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf search <query> [options]',
			summary: t(lang, 'search.help.summary'),
			options: [
				{
					label: '--limit <number>',
					description: t(lang, 'search.help.option.limit'),
				},
				{
					label: '--scope <workflow|source|all>',
					description: t(lang, 'search.help.option.scope'),
				},
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf index',
				'mf index --source',
				'mf search mustflow_check',
				'mf search "role mapping" --scope source',
				'mf search test --limit 5',
			],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'search.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'search.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

function toSearchOptionError(error: CliOptionParseError): ParsedSearchOptions['error'] {
	if (error.kind === 'missing_value' && error.option === '--limit') {
		return { key: 'search.error.missingLimit' };
	}

	if (error.kind === 'missing_value' && error.option === '--scope') {
		return { key: 'search.error.missingScope' };
	}

	if (error.kind === 'missing_value') {
		return { key: 'cli.error.missingValue', params: { option: error.option } };
	}

	return { key: 'cli.error.unknownOption', params: { option: error.option } };
}

function parseSearchOptions(args: readonly string[]): ParsedSearchOptions {
	const parsed = parseCliOptions(args, SEARCH_OPTIONS, { allowPositionals: true });
	let limit = 10;
	let scope: LocalSearchScope = 'workflow';
	const json = hasParsedCliOption(parsed, '--json');

	if (parsed.error) {
		return { query: '', limit, scope, json, error: toSearchOptionError(parsed.error) };
	}

	const rawLimit = getParsedCliStringOption(parsed, '--limit');
	if (rawLimit !== null) {
		const parsedLimit = Number.parseInt(rawLimit, 10);

		if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
			return { query: '', limit, scope, json, error: { key: 'search.error.invalidLimit' } };
		}

		limit = parsedLimit;
	}

	const rawScope = getParsedCliStringOption(parsed, '--scope');
	if (rawScope !== null) {
		if (!isSearchScope(rawScope)) {
			return {
				query: '',
				limit,
				scope,
				json,
				error: { key: 'search.error.invalidScope', params: { scope: rawScope } },
			};
		}

		scope = rawScope;
	}

	const query = parsed.positionals.join(' ').trim();

	if (query.length === 0) {
		return { query, limit, scope, json, error: { key: 'search.error.missingQuery' } };
	}

	return { query, limit, scope, json };
}

function isSearchScope(value: string): value is LocalSearchScope {
	return value === 'workflow' || value === 'source' || value === 'all';
}

function renderSearchSummary(result: LocalSearchResult, lang: CliLang): string {
	const lines = [
		t(lang, 'search.title'),
		`${t(lang, 'label.query')}: ${result.query}`,
		`${t(lang, 'label.scope')}: ${result.scope}`,
		`${t(lang, 'label.results')}: ${result.result_count}`,
	];

	for (const item of result.results) {
		const target = item.path ?? item.name ?? item.title ?? item.kind;
		const title = item.title && item.title !== target ? ` — ${item.title}` : '';
		const line = item.line_start ? `${target}:${item.line_start}` : target;
		lines.push(`- [${item.kind}] ${line}${title}`);
		lines.push(`  ${item.authority_label}; navigation_only=${String(item.navigation_only)}`);
		lines.push(`  ${item.match}`);
	}

	if (result.result_count === 0) {
		lines.push(t(lang, 'search.noMatches'));
	}

	return lines.join('\n');
}

export async function runSearch(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (hasCliOptionToken(args, '--help', ['-h'])) {
		reporter.stdout(getSearchHelp(lang));
		return 0;
	}

	const options = parseSearchOptions(args);

	if (options.error) {
		printUsageError(reporter, t(lang, options.error.key, options.error.params), 'mf search --help', getSearchHelp(lang), lang);
		return 1;
	}

	try {
		const result = await searchLocalIndex(resolveMustflowRoot(), options.query, { limit: options.limit, scope: options.scope });

		if (options.json) {
			reporter.stdout(JSON.stringify(result, null, 2));
			return 0;
		}

		reporter.stdout(renderSearchSummary(result, lang));
		return 0;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		reporter.stderr(t(lang, 'cli.error.prefix', { message }));
		return 1;
	}
}
