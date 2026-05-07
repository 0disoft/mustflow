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
		starlightLocale: 'zh',
		hasContent: true,
	},
	{
		code: 'es',
		label: 'Español',
		lang: 'es',
		starlightLocale: 'es',
		hasContent: true,
	},
	{
		code: 'fr',
		label: 'Français',
		lang: 'fr',
		starlightLocale: 'fr',
		hasContent: true,
	},
	{
		code: 'hi',
		label: 'हिन्दी',
		lang: 'hi',
		starlightLocale: 'hi',
		hasContent: true,
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
	zh: {
		label: '中文',
		lang: 'zh-CN',
	},
	es: {
		label: 'Español',
		lang: 'es',
	},
	fr: {
		label: 'Français',
		lang: 'fr',
	},
	hi: {
		label: 'हिन्दी',
		lang: 'hi',
	},
};
