import { printUsageError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { checkMustflowProject } from '../lib/validation.js';

export function getCheckHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf check [options]',
			summary:
				lang === 'ko'
					? '현재 저장소의 mustflow 파일을 검사합니다.'
					: 'Validate the mustflow files in the current repository.',
			options: [
				{ label: '--json', description: lang === 'ko' ? '기계가 읽기 쉬운 JSON을 출력합니다' : 'Print machine-readable JSON' },
				{
					label: '--strict',
					description:
						lang === 'ko'
							? '에이전트 안전성에 대한 추가 엄격 검사를 실행합니다'
							: 'Run additional strict checks for agent safety',
				},
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf check', 'mf check --strict', 'mf check --strict --json'],
			exitCodes: [
				{
					label: '0',
					description:
						lang === 'ko' ? '필수 mustflow 파일과 설정이 모두 유효합니다' : 'All required mustflow files and settings are valid',
				},
				{
					label: '1',
					description:
						lang === 'ko' ? '검증 실패 또는 잘못된 입력이 있었습니다' : 'Validation failed or the command received invalid input',
				},
			],
		},
		lang,
	);
}

export function runCheck(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getCheckHelp(lang));
		return 0;
	}

	const supported = new Set(['--json', '--strict']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, `Unknown option: ${unsupported[0]}`, 'mf check --help', getCheckHelp(lang), lang);
		return 1;
	}

	const strict = args.includes('--strict');
	const issues = checkMustflowProject(resolveMustflowRoot(), { strict });
	const ok = issues.length === 0;

	if (args.includes('--json')) {
		reporter.stdout(
			JSON.stringify(
				{
					ok,
					strict,
					issueCount: issues.length,
					issues,
				},
				null,
				2,
			),
		);
		return ok ? 0 : 1;
	}

	if (ok) {
		if (strict) {
			reporter.stdout(lang === 'ko' ? 'mustflow 엄격 검사 통과' : 'mustflow strict check passed');
			return 0;
		}

		reporter.stdout(lang === 'ko' ? 'mustflow 검사 통과' : 'mustflow check passed');
		return 0;
	}

	for (const issue of issues) {
		reporter.stderr(issue);
	}

	return 1;
}
