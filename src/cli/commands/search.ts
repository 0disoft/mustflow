import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { t, type CliLang, type MessageKey, type MessageParams } from '../lib/i18n.js';
import { searchLocalIndex, type LocalSearchResult } from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

interface ParsedSearchOptions {
	readonly query: string;
	readonly limit: number;
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
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf index', 'mf search mustflow_check', 'mf search "code review" --json', 'mf search test --limit 5'],
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

function parseSearchOptions(args: readonly string[]): ParsedSearchOptions {
	const queryParts: string[] = [];
	let limit = 10;
	let json = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg) {
			continue;
		}

		if (arg === '--json') {
			json = true;
			continue;
		}

		if (arg === '--limit') {
			const rawLimit = args[index + 1];

			if (!rawLimit || rawLimit.startsWith('-')) {
				return { query: '', limit, json, error: { key: 'search.error.missingLimit' } };
			}

			const parsedLimit = Number.parseInt(rawLimit, 10);

			if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
				return { query: '', limit, json, error: { key: 'search.error.invalidLimit' } };
			}

			limit = parsedLimit;
			index += 1;
			continue;
		}

		if (arg.startsWith('--limit=')) {
			const rawLimit = arg.slice('--limit='.length);
			const parsedLimit = Number.parseInt(rawLimit, 10);

			if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
				return { query: '', limit, json, error: { key: 'search.error.invalidLimit' } };
			}

			limit = parsedLimit;
			continue;
		}

		if (arg.startsWith('-')) {
			return { query: '', limit, json, error: { key: 'cli.error.unknownOption', params: { option: arg } } };
		}

		queryParts.push(arg);
	}

	const query = queryParts.join(' ').trim();

	if (query.length === 0) {
		return { query, limit, json, error: { key: 'search.error.missingQuery' } };
	}

	return { query, limit, json };
}

function renderSearchSummary(result: LocalSearchResult, lang: CliLang): string {
	const lines = [
		t(lang, 'search.title'),
		`${t(lang, 'label.query')}: ${result.query}`,
		`${t(lang, 'label.results')}: ${result.result_count}`,
	];

	for (const item of result.results) {
		const target = item.path ?? item.name ?? item.title ?? item.kind;
		const title = item.title && item.title !== target ? ` — ${item.title}` : '';
		lines.push(`- [${item.kind}] ${target}${title}`);
		lines.push(`  ${item.match}`);
	}

	if (result.result_count === 0) {
		lines.push(t(lang, 'search.noMatches'));
	}

	return lines.join('\n');
}

export async function runSearch(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getSearchHelp(lang));
		return 0;
	}

	const options = parseSearchOptions(args);

	if (options.error) {
		printUsageError(reporter, t(lang, options.error.key, options.error.params), 'mf search --help', getSearchHelp(lang), lang);
		return 1;
	}

	try {
		const result = await searchLocalIndex(resolveMustflowRoot(), options.query, { limit: options.limit });

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
