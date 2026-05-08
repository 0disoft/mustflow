const LOCALE_TAG_PATTERN = /^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})*$/u;

export function isLocaleTag(value: string): boolean {
	return LOCALE_TAG_PATTERN.test(value);
}
