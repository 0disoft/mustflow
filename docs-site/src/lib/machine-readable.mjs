import { machineReadable } from '../config/machine-readable.mjs';

const ENGLISH_DOCS = import.meta.glob('/src/content/docs/en/**/*.md', {
	query: '?raw',
	import: 'default',
	eager: true,
});

const FRONTMATTER_PATTERN = /^---\n([\s\S]*?)\n---\n?/;

const normalizePath = (path) => {
	if (!path || path === '/') return '/';
	return path.startsWith('/') ? path : `/${path}`;
};

const siteOrigin = () => machineReadable.site.url.replace(/\/$/, '');

const absoluteUrl = (path) => `${siteOrigin()}${normalizePath(path)}`;

const localizedPath = (path, locale = machineReadable.preferredLocale) => {
	const normalizedPath = normalizePath(path);
	if (normalizedPath === '/') return `/${locale}/`;
	return `/${locale}${normalizedPath}`;
};

const markdownRoute = (filePath) => {
	const relativePath = filePath
		.replace(/^\/src\/content\/docs\/en\//, '')
		.replace(/\.md$/, '')
		.replace(/\\/g, '/');

	if (relativePath === 'index') return `/${machineReadable.preferredLocale}/`;
	return `/${machineReadable.preferredLocale}/${relativePath}/`;
};

const parseFrontmatter = (rawMarkdown) => {
	const match = rawMarkdown.match(FRONTMATTER_PATTERN);
	if (!match) return { frontmatter: {}, body: rawMarkdown.trim() };

	const frontmatter = Object.fromEntries(
		match[1]
			.split('\n')
			.map((line) => line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/))
			.filter(Boolean)
			.map(([, key, value]) => [key, value.replace(/^['"]|['"]$/g, '').trim()])
	);

	return {
		frontmatter,
		body: rawMarkdown.slice(match[0].length).trim(),
	};
};

const truncate = (value, maxCharacters) => {
	const normalized = value.replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
	if (normalized.length <= maxCharacters) return normalized;
	return `${normalized.slice(0, Math.max(0, maxCharacters - 32)).trimEnd()}\n\n...[truncated]`;
};

const englishDocs = () =>
	Object.entries(ENGLISH_DOCS)
		.map(([filePath, rawMarkdown]) => {
			const { frontmatter, body } = parseFrontmatter(rawMarkdown);
			return {
				path: markdownRoute(filePath),
				title: frontmatter.title || markdownRoute(filePath),
				description: frontmatter.description || '',
				body,
			};
		})
		.toSorted((left, right) => left.path.localeCompare(right.path));

const formatLink = ({ label, path, note }) =>
	`- [${label}](${absoluteUrl(localizedPath(path))}): ${note}`;

const formatDocSummary = ({ title, path, description }) => {
	const suffix = description ? `: ${description}` : '';
	return `- [${title}](${absoluteUrl(path)})${suffix}`;
};

export const createTextResponse = (content, cacheControl = machineReadable.cacheControl) =>
	new Response(content, {
		headers: {
			'content-type': machineReadable.contentType,
			'cache-control': cacheControl,
		},
	});

export const buildRobotsText = () =>
	[
		'# robots.txt',
		`# Canonical origin: ${siteOrigin()}`,
		'User-agent: *',
		'Allow: /',
		'',
		`Sitemap: ${absoluteUrl(machineReadable.sitemapPath)}`,
		`# AI usage policy: ${absoluteUrl('/ai.txt')}`,
		`# LLM index: ${absoluteUrl('/llms.txt')}`,
		'',
	].join('\n');

export const buildAiText = () =>
	[
		'# ai.txt',
		`# ${absoluteUrl('/ai.txt')}`,
		'',
		'[identity]',
		`name: ${machineReadable.site.title}`,
		`url: ${siteOrigin()}`,
		`package: ${machineReadable.site.packageName}`,
		`description: ${machineReadable.site.description}`,
		`preferred_locale: ${machineReadable.preferredLocale}`,
		`available_content_locales: ${machineReadable.routedLanguageCodes.join(', ')}`,
		'',
		'[permissions]',
		...machineReadable.policy.allowed.map((item) => `- ${item}`),
		'',
		'[restrictions]',
		...machineReadable.policy.restricted.map((item) => `- ${item}`),
		'',
		'[indexes]',
		`llms: ${absoluteUrl('/llms.txt')}`,
		`llms_full: ${absoluteUrl('/llms-full.txt')}`,
		`sitemap: ${absoluteUrl(machineReadable.sitemapPath)}`,
		'',
	].join('\n');

export const buildLlmsText = () => {
	const docs = englishDocs();
	return [
		`# ${machineReadable.site.title}`,
		'',
		`> ${machineReadable.site.description}`,
		'',
		'This file lists high-signal pages for AI assistants and retrieval systems.',
		'',
		'## Core',
		...machineReadable.coreLinks.map(formatLink),
		'',
		'## Documents',
		...docs.map(formatDocSummary),
		'',
		'## Machine-readable',
		`- [ai.txt](${absoluteUrl('/ai.txt')}): AI usage policy`,
		`- [llms-full.txt](${absoluteUrl('/llms-full.txt')}): Expanded document index with bounded excerpts`,
		`- [robots.txt](${absoluteUrl('/robots.txt')}): Crawler policy and sitemap pointer`,
		`- [sitemap](${absoluteUrl(machineReadable.sitemapPath)}): Search engine sitemap index`,
		'',
	].join('\n');
};

export const buildLlmsFullText = () => {
	const docs = englishDocs();
	const snapshots = docs.map((doc) =>
		[
			`## ${doc.title}`,
			`- URL: ${absoluteUrl(doc.path)}`,
			doc.description ? `- Description: ${doc.description}` : undefined,
			'',
			truncate(doc.body, machineReadable.maxSnapshotCharacters),
			'',
		]
			.filter((line) => line !== undefined)
			.join('\n')
	);

	const content = [
		`# ${machineReadable.site.title} (llms-full)`,
		'',
		'> Expanded machine-readable index for assistants and agent workflows.',
		'',
		'## Site Profile',
		`- Name: ${machineReadable.site.title}`,
		`- Origin: ${siteOrigin()}`,
		`- Package: ${machineReadable.site.packageName}`,
		`- Description: ${machineReadable.site.description}`,
		`- Preferred locale: ${machineReadable.preferredLocale}`,
		`- Content locales: ${machineReadable.routedLanguageCodes.join(', ')}`,
		'',
		'## Core Links',
		...machineReadable.coreLinks.map(formatLink),
		'',
		'## Document Snapshots',
		`- Per-document cap: ${machineReadable.maxSnapshotCharacters} characters`,
		`- Total file cap: ${machineReadable.maxFullTextCharacters} characters`,
		'',
		...snapshots,
		'## Notes',
		'- This file is generated from docs-site configuration and English documentation files.',
		'- Use canonical URLs above for indexing and citation.',
		'',
	].join('\n');

	return truncate(content, machineReadable.maxFullTextCharacters);
};
