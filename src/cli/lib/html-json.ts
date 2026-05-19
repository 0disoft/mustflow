const INLINE_SCRIPT_JSON_ESCAPES: Record<string, string> = {
	'<': '\\u003C',
	'>': '\\u003E',
	'&': '\\u0026',
	'\u2028': '\\u2028',
	'\u2029': '\\u2029',
};

export function safeJsonForInlineScript(value: unknown): string {
	const json = JSON.stringify(value);
	return (json ?? 'null').replace(/[<>&\u2028\u2029]/gu, (character) => INLINE_SCRIPT_JSON_ESCAPES[character]);
}
