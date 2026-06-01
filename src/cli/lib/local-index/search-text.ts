import {
	MAX_SEARCH_MATCH_SNIPPET_CHARS,
	SEARCH_MATCH_CONTEXT_AFTER_CHARS,
	SEARCH_MATCH_CONTEXT_BEFORE_CHARS,
	SEARCH_MATCH_TRUNCATION_MARKER,
	SEARCH_NGRAM_MAX_GRAMS_PER_TARGET,
	SEARCH_NGRAM_MAX_LENGTH,
	SEARCH_NGRAM_MAX_TOKEN_CHARS,
	SEARCH_NGRAM_MIN_LENGTH,
} from './constants.js';

export function normalizeSearchText(value: string): string {
	return value.trim().replace(/\s+/g, ' ');
}

export function normalizeSearchTokenText(value: string): string {
	return normalizeSearchText(value).normalize('NFKC').toLowerCase();
}

export function extractSearchTokens(value: string): string[] {
	return [...normalizeSearchTokenText(value).matchAll(/[\p{L}\p{N}]+/gu)]
		.map((match) => match[0])
		.filter((token): token is string => Boolean(token));
}

export function buildSearchNgrams(values: readonly string[]): string[] {
	const grams = new Set<string>();

	for (const value of values) {
		for (const token of extractSearchTokens(value)) {
			const boundedToken = token.slice(0, SEARCH_NGRAM_MAX_TOKEN_CHARS);
			const maxLength = Math.min(SEARCH_NGRAM_MAX_LENGTH, boundedToken.length);

			for (let length = SEARCH_NGRAM_MIN_LENGTH; length <= maxLength; length += 1) {
				for (let index = 0; index <= boundedToken.length - length; index += 1) {
					grams.add(boundedToken.slice(index, index + length));

					if (grams.size >= SEARCH_NGRAM_MAX_GRAMS_PER_TARGET) {
						return [...grams].sort((left, right) => left.localeCompare(right));
					}
				}
			}
		}
	}

	return [...grams].sort((left, right) => left.localeCompare(right));
}

export function getMatchSnippet(fields: readonly string[], query: string): string {
	const normalized = normalizeSearchText(fields.join(' '));
	const lower = normalized.toLowerCase();
	let start = lower.indexOf(query.toLowerCase());
	let matchLength = query.length;

	if (start === -1) {
		const [firstGram] = buildSearchNgrams([query]).filter((gram) => lower.includes(gram));

		if (!firstGram) {
			return truncateSearchMatchSnippet(normalized);
		}

		start = lower.indexOf(firstGram);
		matchLength = firstGram.length;
	}

	const from = Math.max(0, start - SEARCH_MATCH_CONTEXT_BEFORE_CHARS);
	const to = Math.min(normalized.length, start + matchLength + SEARCH_MATCH_CONTEXT_AFTER_CHARS);
	const prefix = from > 0 ? SEARCH_MATCH_TRUNCATION_MARKER : '';
	const suffix = to < normalized.length ? SEARCH_MATCH_TRUNCATION_MARKER : '';

	return truncateSearchMatchSnippet(`${prefix}${normalized.slice(from, to)}${suffix}`);
}

export function truncateSearchMatchSnippet(value: string): string {
	if (value.length <= MAX_SEARCH_MATCH_SNIPPET_CHARS) {
		return value;
	}

	return `${value.slice(0, MAX_SEARCH_MATCH_SNIPPET_CHARS - SEARCH_MATCH_TRUNCATION_MARKER.length)}${SEARCH_MATCH_TRUNCATION_MARKER}`;
}

export function scoreMatch(primaryFields: readonly string[], secondaryFields: readonly string[], query: string): number {
	const lowerQuery = query.toLowerCase();

	if (primaryFields.some((field) => field.toLowerCase() === lowerQuery)) {
		return 100;
	}

	if (primaryFields.some((field) => field.toLowerCase().includes(lowerQuery))) {
		return 80;
	}

	if (secondaryFields.some((field) => field.toLowerCase().includes(lowerQuery))) {
		return 40;
	}

	return 0;
}

export function isMatched(fields: readonly string[], query: string): boolean {
	const lowerQuery = query.toLowerCase();

	return fields.some((field) => field.toLowerCase().includes(lowerQuery));
}

export function buildFtsQuery(query: string): string | null {
	const tokens = extractSearchTokens(query);

	if (tokens.length === 0) {
		return null;
	}

	return [...new Set(tokens)].map((token) => `"${token.replaceAll('"', '""')}"`).join(' AND ');
}
