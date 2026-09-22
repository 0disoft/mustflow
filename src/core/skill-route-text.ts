export function normalizeSkillRouteText(value: string): string {
	return value
		.normalize('NFKC')
		.toLocaleLowerCase('en-US')
		.replace(/\.mustflow\/skills\/[^/\s]+\/skill\.md/giu, ' ')
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim()
		.replace(/\s+/gu, ' ');
}

export function isSkillRouteSearchTerm(value: string): boolean {
	const normalized = value.normalize('NFKC');
	return /^[\p{L}\p{N}][\p{L}\p{M}\p{N} _-]*$/u.test(normalized)
		&& normalized === normalized.toLocaleLowerCase('en-US')
		&& normalizeSkillRouteText(normalized).length > 0;
}

export function unquotedSkillRouteText(value: string): string {
	// Quoted examples and old messages are context, not current exclusion instructions.
	// Preserve line boundaries and unmatched quotes rather than swallowing the rest of a request.
	return value.replace(/"[^"\r\n]*"|“[^”\r\n]*”|「[^」\r\n]*」|\x60[^\x60\r\n]*\x60/gu, ' ');
}
