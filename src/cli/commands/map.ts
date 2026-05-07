import type { Reporter } from '../lib/reporter.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import { generateRepoMap, writeRepoMap } from '../lib/repo-map.js';

export function getMapHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf map [options]',
			summary:
				lang === 'ko'
					? '저장소 앵커 파일을 기준으로 에이전트 탐색 지도를 생성합니다.'
					: 'Generate an agent navigation map from repository anchor files.',
			options: [
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
				{ label: '--stdout', description: lang === 'ko' ? '생성한 지도를 출력합니다' : 'Print the generated map' },
				{ label: '--write', description: lang === 'ko' ? 'REPO_MAP.md를 씁니다' : 'Write REPO_MAP.md' },
				{
					label: '--depth <level>',
					description:
						lang === 'ko' ? '우선순위가 낮은 앵커 디렉터리 깊이를 제한합니다' : 'Limit non-priority anchor directory depth',
				},
				{
					label: '--include-nested',
					description:
						lang === 'ko'
							? '설정된 작업대 루트의 하위 저장소를 포함합니다'
							: 'Include nested repositories from configured workspace roots',
				},
				{
					label: '--root-only',
					description:
						lang === 'ko' ? '설정이 있어도 하위 저장소를 무시합니다' : 'Ignore nested repositories even when configured',
				},
			],
			examples: ['mf map --stdout', 'mf map --write', 'mf map --write --include-nested'],
			exitCodes: [
				{ label: '0', description: lang === 'ko' ? '지도를 생성하고 선택적으로 썼습니다' : 'Map was generated and optionally written' },
				{ label: '1', description: lang === 'ko' ? '잘못된 입력이 있었습니다' : 'The command received invalid input' },
			],
		},
		lang,
	);
}

export function runMap(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getMapHelp(lang));
		return 0;
	}

	let shouldPrint = false;
	let shouldWrite = false;
	let depth = 3;
	let includeNested: boolean | undefined;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (arg === '--stdout') {
			shouldPrint = true;
			continue;
		}

		if (arg === '--write') {
			shouldWrite = true;
			continue;
		}

		if (arg === '--include-nested') {
			if (includeNested === false) {
				printUsageError(reporter, 'Cannot combine --include-nested and --root-only', 'mf map --help', getMapHelp(lang), lang);
				return 1;
			}

			includeNested = true;
			continue;
		}

		if (arg === '--root-only') {
			if (includeNested === true) {
				printUsageError(reporter, 'Cannot combine --include-nested and --root-only', 'mf map --help', getMapHelp(lang), lang);
				return 1;
			}

			includeNested = false;
			continue;
		}

		if (arg === '--depth') {
			const rawDepth = args[index + 1];
			const parsedDepth = Number.parseInt(rawDepth ?? '', 10);

			if (!Number.isInteger(parsedDepth) || parsedDepth < 1) {
				printUsageError(reporter, 'Invalid value for --depth', 'mf map --help', getMapHelp(lang), lang);
				return 1;
			}

			depth = parsedDepth;
			index += 1;
			continue;
		}

		printUsageError(reporter, `Unknown option: ${arg}`, 'mf map --help', getMapHelp(lang), lang);
		return 1;
	}

	if (!shouldPrint && !shouldWrite) {
		shouldPrint = true;
	}

	const projectRoot = resolveMustflowRoot();
	const content = generateRepoMap(projectRoot, { depth, includeNested });

	if (shouldWrite) {
		writeRepoMap(projectRoot, content);
		reporter.stdout(lang === 'ko' ? 'REPO_MAP.md를 썼습니다' : 'Wrote REPO_MAP.md');
	}

	if (shouldPrint) {
		reporter.stdout(content);
	}

	return 0;
}
