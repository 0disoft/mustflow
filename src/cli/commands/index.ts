import { printUsageError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import { createLocalIndex } from '../lib/local-index.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

export function getIndexHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf index [options]',
			summary:
				lang === 'ko'
					? 'mustflow 문서 흐름을 재생성 가능한 SQLite 색인으로 만듭니다.'
					: 'Build a regenerable SQLite index for the mustflow document flow.',
			options: [
				{
					label: '--dry-run',
					description:
						lang === 'ko' ? '색인 대상만 계산하고 파일을 쓰지 않습니다' : 'Calculate index targets without writing files',
				},
				{ label: '--json', description: lang === 'ko' ? '기계가 읽기 쉬운 JSON을 출력합니다' : 'Print machine-readable JSON' },
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf index --dry-run --json', 'mf index', 'mf index --json'],
			exitCodes: [
				{
					label: '0',
					description:
						lang === 'ko' ? '색인 대상을 계산했고 선택적으로 SQLite 파일을 썼습니다' : 'Index targets were calculated and optionally written',
				},
				{ label: '1', description: lang === 'ko' ? '잘못된 입력이 있었습니다' : 'The command received invalid input' },
			],
		},
		lang,
	);
}

function renderIndexSummary(result: Awaited<ReturnType<typeof createLocalIndex>>, lang: CliLang): string {
	const lines = [
		lang === 'ko' ? 'mustflow 색인' : 'mustflow index',
		`${lang === 'ko' ? 'mustflow 루트' : 'mustflow root'}: ${result.mustflow_root}`,
		`${lang === 'ko' ? '데이터베이스' : 'Database'}: ${result.database_path}`,
		`${lang === 'ko' ? '문서' : 'Documents'}: ${result.document_count}`,
		`${lang === 'ko' ? '스킬' : 'Skills'}: ${result.skill_count}`,
		`${lang === 'ko' ? '명령 의도' : 'Command intents'}: ${result.command_intent_count}`,
		`${lang === 'ko' ? '파일 쓰기' : 'Wrote files'}: ${result.wrote_files ? 'yes' : 'no'}`,
	];

	if (result.dry_run) {
		lines.push(lang === 'ko' ? '드라이런: 파일을 쓰지 않았습니다.' : 'Dry run: no files were written.');
	}

	return lines.join('\n');
}

export async function runIndex(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getIndexHelp(lang));
		return 0;
	}

	const supported = new Set(['--dry-run', '--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, `Unknown option: ${unsupported[0]}`, 'mf index --help', getIndexHelp(lang), lang);
		return 1;
	}

	const result = await createLocalIndex(resolveMustflowRoot(), { dryRun: args.includes('--dry-run') });

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(result, null, 2));
		return 0;
	}

	reporter.stdout(renderIndexSummary(result, lang));
	return 0;
}
