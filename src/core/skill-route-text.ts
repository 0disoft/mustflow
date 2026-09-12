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
