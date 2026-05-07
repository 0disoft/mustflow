import { printUsageError, renderHelp } from '../lib/cli-output.js';
import type { CliLang } from '../lib/i18n.js';
import type { Reporter } from '../lib/reporter.js';

export function getDashboardHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf dashboard [options]',
			summary:
				lang === 'ko'
					? '로컬 mustflow 대시보드 명령을 예약합니다. 이 기능은 아직 구현되지 않았습니다.'
					: 'Reserve the local mustflow dashboard command. This feature is not implemented yet.',
			options: [{ label: '-h, --help', description: lang === 'ko' ? '이 도움말을 보여줍니다' : 'Show this help message' }],
			examples: ['mf dashboard'],
			exitCodes: [
				{
					label: '0',
					description: lang === 'ko' ? '도움말을 출력했습니다' : 'Help was printed',
				},
				{
					label: '1',
					description: lang === 'ko' ? '대시보드 기능이 아직 구현되지 않았습니다' : 'Dashboard is not implemented yet',
				},
			],
		},
		lang,
	);
}

function getNotImplementedMessage(lang: CliLang): string {
	return lang === 'ko' ? 'mf dashboard는 아직 구현되지 않은 기능입니다' : 'mf dashboard is not implemented yet';
}

export function runDashboard(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getDashboardHelp(lang));
		return 0;
	}

	const unsupported = args.find((arg) => arg.startsWith('-'));

	if (unsupported) {
		printUsageError(reporter, `Unknown option: ${unsupported}`, 'mf dashboard --help', getDashboardHelp(lang), lang);
		return 1;
	}

	if (args.length > 0) {
		printUsageError(reporter, `Unexpected argument: ${args[0]}`, 'mf dashboard --help', getDashboardHelp(lang), lang);
		return 1;
	}

	reporter.stderr(getNotImplementedMessage(lang));
	return 1;
}
