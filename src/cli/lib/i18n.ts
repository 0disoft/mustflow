export type CliLang = 'en' | 'ko';

export interface LocalizedText {
	readonly en: string;
	readonly ko: string;
}

export const DEFAULT_CLI_LANG: CliLang = 'en';
export const SUPPORTED_CLI_LANGS: readonly CliLang[] = ['en', 'ko'];

export function isCliLang(value: string): value is CliLang {
	return SUPPORTED_CLI_LANGS.includes(value as CliLang);
}

export function text(value: LocalizedText, lang: CliLang): string {
	return value[lang];
}

export const HELP_HEADINGS: Record<CliLang, Record<string, string>> = {
	en: {
		usage: 'Usage',
		commands: 'Commands',
		topics: 'Topics',
		options: 'Options',
		examples: 'Examples',
		exitCodes: 'Exit codes',
	},
	ko: {
		usage: '사용법',
		commands: '명령어',
		topics: '주제',
		options: '선택지',
		examples: '예시',
		exitCodes: '종료 코드',
	},
};
