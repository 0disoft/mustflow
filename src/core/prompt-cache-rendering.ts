function toPromptCachePosixPath(relativePath: string): string {
	return relativePath.replace(/\\/gu, '/');
}

export function isPromptCacheStableLeafSkillSurface(relativePath: string): boolean {
	const normalized = toPromptCachePosixPath(relativePath);
	return normalized === '.mustflow/skills/INDEX.md'
		|| normalized === '.mustflow/skills/routes.toml'
		|| /^\.mustflow\/skills\/[^/]+\/.+/u.test(normalized);
}

export function normalizePromptCacheBlockContent(content: string): string {
	const normalized = content.replace(/\r\n?/gu, '\n').replace(/\n*$/u, '');
	return `${normalized}\n`;
}

export function renderPromptCacheReferenceBlock(relativePath: string, content: string): string {
	return `--- mustflow-cache-block: ${toPromptCachePosixPath(relativePath)} ---\n${normalizePromptCacheBlockContent(content)}`;
}

export function measurePromptCacheReferenceBlockBytes(relativePath: string, content: string): number {
	return Buffer.byteLength(renderPromptCacheReferenceBlock(relativePath, content), 'utf8');
}
