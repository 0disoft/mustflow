import { languageSelectorOptions, routedLanguageCodes } from './locales.mjs';
import { pages } from './navigation.mjs';
import { site } from './site.mjs';

const pageLink = (id, note) => ({
	label: pages[id].translations?.en ?? pages[id].label,
	path: pages[id].link,
	note,
});

export const machineReadable = {
	contentType: 'text/plain; charset=utf-8',
	cacheControl: 'public, max-age=3600',
	preferredLocale: 'en',
	sitemapPath: '/sitemap-index.xml',
	maxFullTextCharacters: 80_000,
	maxSnapshotCharacters: 2_400,
	site,
	languages: languageSelectorOptions.map(({ code, label, lang, hasContent }) => ({
		code,
		label,
		lang,
		hasContent,
	})),
	routedLanguageCodes,
	coreLinks: [
		pageLink('overview', 'Project overview and reading order'),
		pageLink('rootAgents', 'Root instruction file for coding agents'),
		pageLink('repoMap', 'Optional generated repository navigation map for agents'),
		{ label: 'mf init', path: '/commands/init/', note: 'CLI command that installs the workflow' },
		{ label: 'mf check', path: '/commands/check/', note: 'CLI command that validates installed mustflow files' },
		{ label: 'mf map', path: '/commands/map/', note: 'CLI command that generates REPO_MAP.md' },
		pageLink('mustflowToml', 'Agent reading boundaries and reporting rules'),
		pageLink('commandsToml', 'Command contract for tests, builds, linting, and checks'),
		pageLink('skillsIndex', 'Skill catalog for repeatable agent procedures'),
		pageLink('localIndex', 'Design note for the local SQLite index direction'),
	],
	policy: {
		allowed: [
			'Summarize public mustflow documentation with attribution.',
			'Use llms.txt and llms-full.txt as preferred discovery indexes.',
			'Reference public documentation URLs when explaining mustflow structure.',
		],
		restricted: [
			'Do not present generated summaries as official project policy.',
			'Do not imply endorsement, certification, or partnership without explicit permission.',
			'Do not treat template examples as security, legal, or compliance guarantees.',
		],
	},
};
