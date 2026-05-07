import { enMessages, type MessageKey } from '../i18n/en.js';
import { esMessages } from '../i18n/es.js';
import { frMessages } from '../i18n/fr.js';
import { hiMessages } from '../i18n/hi.js';
import { koMessages } from '../i18n/ko.js';
import { zhMessages } from '../i18n/zh.js';

export type { MessageKey } from '../i18n/en.js';

export type MessageParams = Record<string, string | number | boolean | null | undefined>;
type MessageCatalog = Record<MessageKey, string>;

export const MESSAGE_CATALOGS = {
	en: enMessages,
	ko: koMessages,
	zh: zhMessages,
	es: esMessages,
	fr: frMessages,
	hi: hiMessages,
} satisfies Record<string, MessageCatalog>;

export type CliLang = keyof typeof MESSAGE_CATALOGS;

export const DEFAULT_CLI_LANG: CliLang = 'en';
export const SUPPORTED_CLI_LANGS = Object.keys(MESSAGE_CATALOGS) as CliLang[];

export interface MessageCatalogReport {
	readonly source: CliLang;
	readonly languages: readonly CliLang[];
	readonly missing: Record<string, readonly MessageKey[]>;
	readonly extra: Record<string, readonly string[]>;
}

export function isCliLang(value: string): value is CliLang {
	return value in MESSAGE_CATALOGS;
}

function interpolate(template: string, params: MessageParams): string {
	return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => {
		const value = params[key];
		return value === undefined || value === null ? match : String(value);
	});
}

export function t(lang: CliLang, key: MessageKey, params: MessageParams = {}): string {
	return interpolate(MESSAGE_CATALOGS[lang][key] ?? enMessages[key], params);
}

export function localeMessage(locale: string, key: MessageKey, params: MessageParams = {}): string {
	return t(isCliLang(locale) ? locale : DEFAULT_CLI_LANG, key, params);
}

export function getMessageCatalogReport(): MessageCatalogReport {
	const sourceKeys = Object.keys(enMessages) as MessageKey[];
	const sourceKeySet = new Set<string>(sourceKeys);
	const missing: Record<string, MessageKey[]> = {};
	const extra: Record<string, string[]> = {};

	for (const [lang, catalog] of Object.entries(MESSAGE_CATALOGS)) {
		const catalogKeys = Object.keys(catalog);
		const catalogKeySet = new Set(catalogKeys);
		const missingKeys = sourceKeys.filter((key) => !catalogKeySet.has(key));
		const extraKeys = catalogKeys.filter((key) => !sourceKeySet.has(key));

		if (missingKeys.length > 0) {
			missing[lang] = missingKeys;
		}

		if (extraKeys.length > 0) {
			extra[lang] = extraKeys;
		}
	}

	return {
		source: DEFAULT_CLI_LANG,
		languages: SUPPORTED_CLI_LANGS,
		missing,
		extra,
	};
}
