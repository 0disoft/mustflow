import {
	languagePreference,
	languageSelectorOptions,
	routedLanguageCodes,
	unsupportedLanguageCodes,
} from './locales.mjs';

const supportedLanguageCodes = languageSelectorOptions.map(({ code }) => code);
const unprefixedContentRootSegments = ['commands', 'design', 'files'];

const languagePreferenceScript = `
(() => {
	const storageKey = ${JSON.stringify(languagePreference.storageKey)};
	const defaultLocale = ${JSON.stringify(languagePreference.defaultLocale)};
	const supportedLocales = new Set(${JSON.stringify(supportedLanguageCodes)});
	const unsupportedLocales = new Set(${JSON.stringify(unsupportedLanguageCodes)});
	const routedLocales = new Set(${JSON.stringify(routedLanguageCodes)});
	const unprefixedContentRoots = new Set(${JSON.stringify(unprefixedContentRootSegments)});

	const normalizeLocale = (value) => {
		if (!value || typeof value !== 'string') return undefined;
		const normalized = value.toLowerCase();
		if (normalized.startsWith('zh')) return 'zh';
		const base = normalized.split('-')[0];
		return supportedLocales.has(base) ? base : undefined;
	};

	const preferredBrowserLocale = () => {
		const languages = Array.isArray(navigator.languages) && navigator.languages.length > 0
			? navigator.languages
			: [navigator.language];

		for (const language of languages) {
			const locale = normalizeLocale(language);
			if (locale) return locale;
		}

		return defaultLocale;
	};

	const storedLocale = () => {
		try {
			return normalizeLocale(localStorage.getItem(storageKey));
		} catch {
			return undefined;
		}
	};

	const storeLocale = (locale) => {
		try {
			localStorage.setItem(storageKey, locale);
		} catch {}
	};

	const localeFromOption = (option) => {
		return normalizeLocale(option.dataset.locale) || defaultLocale;
	};

	const optionForLocale = (select, locale) =>
		Array.from(select.options).find((option) => localeFromOption(option) === locale);

	const redirectUnsupportedRoute = () => {
		const segments = window.location.pathname.split('/').filter(Boolean);
		const firstSegment = normalizeLocale(segments[0]);
		if (!firstSegment || !unsupportedLocales.has(firstSegment)) return false;

		segments[0] = defaultLocale;
		storeLocale(firstSegment);
		window.location.replace('/' + segments.join('/') + window.location.search + window.location.hash);
		return true;
	};

	const redirectUnprefixedContentRoute = () => {
		const segments = window.location.pathname.split('/').filter(Boolean);
		const firstSegment = segments[0];
		if (!firstSegment || routedLocales.has(firstSegment) || unsupportedLocales.has(firstSegment)) return false;
		if (!unprefixedContentRoots.has(firstSegment)) return false;

		const preferred = storedLocale() || preferredBrowserLocale();
		const routeLocale = unsupportedLocales.has(preferred) ? defaultLocale : preferred;
		storeLocale(preferred);
		window.location.replace('/' + [routeLocale, ...segments].join('/') + window.location.search + window.location.hash);
		return true;
	};

	const applyLocale = (select, locale, shouldRedirect) => {
		const option = optionForLocale(select, locale) || optionForLocale(select, defaultLocale);
		if (!option) return;

		select.selectedIndex = option.index;

		if (!shouldRedirect) return;

		const target = new URL(option.value, window.location.href);
		target.search = window.location.search;
		target.hash = window.location.hash;

		if (target.pathname !== window.location.pathname) {
			window.location.replace(target.href);
		}
	};

	const initLanguagePreference = () => {
		const select = document.querySelector('starlight-lang-select select');
		if (!(select instanceof HTMLSelectElement)) return;

		const stored = storedLocale();
		const preferred = stored || preferredBrowserLocale();
		if (!stored) storeLocale(preferred);

		applyLocale(select, preferred, true);
	};

	document.addEventListener(
		'change',
		(event) => {
			const target = event.target;
			if (!(target instanceof HTMLSelectElement)) return;
			if (!target.matches('starlight-lang-select select')) return;

			const option = target.selectedOptions[0];
			if (!option) return;

			storeLocale(localeFromOption(option));
		},
		true
	);

	if (redirectUnsupportedRoute() || redirectUnprefixedContentRoute()) return;

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', initLanguagePreference, { once: true });
	} else {
		initLanguagePreference();
	}
})();
`.trim();

/** @type {import('@astrojs/starlight/types').StarlightUserConfig['head']} */
export const head = [
	{
		tag: 'script',
		content: languagePreferenceScript,
	},
	{
		tag: 'script',
		attrs: {
			type: 'module',
			src: '/keyboard-navigation.js',
		},
	},
];
