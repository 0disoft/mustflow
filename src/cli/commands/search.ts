import { printUsageError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import { searchLocalIndex, type LocalSearchResult } from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

interface ParsedSearchOptions {
	readonly query: string;
	readonly limit: number;
	readonly json: boolean;
	readonly error?: string;
}

export function getSearchHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf search <query> [options]',
			summary:
				lang === 'ko'
					? '로컬 SQLite 색인에서 mustflow 문서 흐름을 검색합니다.'
					: 'Search the local SQLite index for the mustflow document flow.',
			options: [
				{
					label: '--limit <number>',
					description:
						lang === 'ko' ? '출력할 검색 결과 수를 설정합니다. 기본값: 10, 최대: 50' : 'Set the number of results to print. Default: 10, max: 50',
				},
				{ label: '--json', description: lang === 'ko' ? '기계가 읽기 쉬운 JSON을 출력합니다' : 'Print machine-readable JSON' },
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf index', 'mf search mustflow_check', 'mf search "code review" --json', 'mf search test --limit 5'],
			exitCodes: [
				{
					label: '0',
					description: lang === 'ko' ? '검색을 완료했습니다' : 'Search completed',
				},
				{
					label: '1',
					description: lang === 'ko' ? '잘못된 입력이 있거나 로컬 색인이 없습니다' : 'Invalid input or missing local index',
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
				return { query: '', limit, json, error: 'Missing value for --limit' };
			}

			const parsedLimit = Number.parseInt(rawLimit, 10);

			if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
				return { query: '', limit, json, error: '--limit must be an integer between 1 and 50' };
			}

			limit = parsedLimit;
			index += 1;
			continue;
		}

		if (arg.startsWith('--limit=')) {
			const rawLimit = arg.slice('--limit='.length);
			const parsedLimit = Number.parseInt(rawLimit, 10);

			if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
				return { query: '', limit, json, error: '--limit must be an integer between 1 and 50' };
			}

			limit = parsedLimit;
			continue;
		}

		if (arg.startsWith('-')) {
			return { query: '', limit, json, error: `Unknown option: ${arg}` };
		}

		queryParts.push(arg);
	}

	const query = queryParts.join(' ').trim();

	if (query.length === 0) {
		return { query, limit, json, error: 'Search query is required' };
	}

	return { query, limit, json };
}

function renderSearchSummary(result: LocalSearchResult, lang: CliLang): string {
	const lines = [
		lang === 'ko' ? 'mustflow 검색' : 'mustflow search',
		`${lang === 'ko' ? '검색어' : 'Query'}: ${result.query}`,
		`${lang === 'ko' ? '결과' : 'Results'}: ${result.result_count}`,
	];

	for (const item of result.results) {
		const target = item.path ?? item.name ?? item.title ?? item.kind;
		const title = item.title && item.title !== target ? ` — ${item.title}` : '';
		lines.push(`- [${item.kind}] ${target}${title}`);
		lines.push(`  ${item.match}`);
	}

	if (result.result_count === 0) {
		lines.push(lang === 'ko' ? '일치하는 항목이 없습니다.' : 'No matching entries.');
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
		printUsageError(reporter, options.error, 'mf search --help', getSearchHelp(lang), lang);
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
		reporter.stderr(lang === 'ko' ? `오류: ${message}` : `Error: ${message}`);
		return 1;
	}
}
