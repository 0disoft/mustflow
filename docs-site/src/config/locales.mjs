export const fallbackLocale = 'en';

export const languagePreference = {
	storageKey: 'mustflow-docs-language',
	defaultLocale: fallbackLocale,
};

export const languageSelectorOptions = [
	{
		code: 'en',
		label: 'English',
		lang: 'en',
		starlightLocale: 'en',
		hasContent: true,
	},
	{
		code: 'ko',
		label: '한국어',
		lang: 'ko',
		starlightLocale: 'ko',
		hasContent: true,
	},
	{
		code: 'zh',
		label: '中文',
		lang: 'zh-CN',
		starlightLocale: 'en',
		hasContent: false,
	},
	{
		code: 'es',
		label: 'Español',
		lang: 'es',
		starlightLocale: 'en',
		hasContent: false,
	},
	{
		code: 'fr',
		label: 'Français',
		lang: 'fr',
		starlightLocale: 'en',
		hasContent: false,
	},
	{
		code: 'hi',
		label: 'हिन्दी',
		lang: 'hi',
		starlightLocale: 'en',
		hasContent: false,
	},
];

export const routedLanguageCodes = languageSelectorOptions
	.filter(({ hasContent }) => hasContent)
	.map(({ code }) => code);

export const unsupportedLanguageCodes = languageSelectorOptions
	.filter(({ hasContent }) => !hasContent)
	.map(({ code }) => code);

export const locales = {
	en: {
		label: 'English',
		lang: 'en',
	},
	ko: {
		label: '한국어',
		lang: 'ko',
	},
};
