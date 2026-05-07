import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { getAgentContext } from '../lib/agent-context.js';
import type { CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

export function getContextHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf context [options]',
			summary:
				lang === 'ko'
					? '현재 mustflow 루트의 에이전트 작업 맥락을 출력합니다.'
					: 'Print the agent work context for the current mustflow root.',
			options: [
				{
					label: '--json',
					description:
						lang === 'ko' ? '기계가 읽기 쉬운 JSON 맥락을 출력합니다' : 'Print machine-readable context JSON',
				},
				{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' },
			],
			examples: ['mf context --json'],
			exitCodes: [
				{
					label: '0',
					description: lang === 'ko' ? '맥락을 확인하고 출력했습니다' : 'Context was inspected and printed',
				},
				{ label: '1', description: lang === 'ko' ? '잘못된 입력이 있었습니다' : 'The command received invalid input' },
			],
		},
		lang,
	);
}

export function runContext(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getContextHelp(lang));
		return 0;
	}

	const supported = new Set(['--json']);
	const unsupported = args.filter((arg) => !supported.has(arg));

	if (unsupported.length > 0) {
		printUsageError(reporter, `Unknown option: ${unsupported[0]}`, 'mf context --help', getContextHelp(lang), lang);
		return 1;
	}

	const context = getAgentContext(resolveMustflowRoot());

	if (args.includes('--json')) {
		reporter.stdout(JSON.stringify(context, null, 2));
		return 0;
	}

	reporter.stdout(lang === 'ko' ? 'mustflow 맥락' : 'mustflow context');
	reporter.stdout(`${lang === 'ko' ? '설치됨' : 'Installed'}: ${context.installed ? 'yes' : 'no'}`);
	reporter.stdout(`${lang === 'ko' ? 'mustflow 루트' : 'mustflow root'}: ${context.mustflow_root}`);
	reporter.stdout(`${lang === 'ko' ? '명령 계약' : 'Command contract'}: ${context.command_contract.exists ? 'present' : 'missing'}`);
	reporter.stdout(`${lang === 'ko' ? '실행 가능한 의도' : 'Runnable intents'}: ${context.command_contract.runnable_intents.length}`);
	reporter.stdout(`${lang === 'ko' ? '마지막 실행' : 'Latest run'}: ${context.latest_run.exists ? 'present' : 'missing'}`);

	return 0;
}
