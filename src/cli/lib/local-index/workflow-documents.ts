import { existsSync } from 'node:fs';
import path from 'node:path';

import { listFilesRecursive, toPosixPath } from '../filesystem.js';
import { readMustflowTextFile } from '../mustflow-read.js';
import { MAX_SNIPPET_BYTES_PER_DOCUMENT } from './constants.js';
import { sha256Text } from './hashing.js';
import type { IndexDocument, IndexSkill, IndexSkillRoute } from './types.js';

export function getExistingIndexablePaths(projectRoot: string): string[] {
	const paths = new Set<string>();
	const addIfExists = (relativePath: string) => {
		if (existsSync(path.join(projectRoot, ...relativePath.split('/')))) {
			paths.add(relativePath);
		}
	};

	addIfExists('AGENTS.md');

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'docs'))) {
		if (relativePath.endsWith('.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'docs', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'context'))) {
		if (relativePath.endsWith('.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'context', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'skills'))) {
		if (relativePath === 'INDEX.md' || relativePath.endsWith('/SKILL.md')) {
			paths.add(toPosixPath(path.join('.mustflow', 'skills', relativePath)));
		}
	}

	for (const relativePath of listFilesRecursive(path.join(projectRoot, '.mustflow', 'config'))) {
		if (relativePath.endsWith('.toml')) {
			paths.add(toPosixPath(path.join('.mustflow', 'config', relativePath)));
		}
	}

	return Array.from(paths).sort((left, right) => left.localeCompare(right));
}

export function readText(projectRoot: string, relativePath: string): string {
	return readMustflowTextFile(projectRoot, relativePath);
}

function getDocumentType(relativePath: string): string {
	if (relativePath === 'AGENTS.md') {
		return 'agent_rules';
	}

	if (relativePath.startsWith('.mustflow/config/')) {
		return 'config';
	}

	if (relativePath === '.mustflow/skills/INDEX.md') {
		return 'skill_index';
	}

	if (relativePath === '.mustflow/context/INDEX.md') {
		return 'context_index';
	}

	if (relativePath.startsWith('.mustflow/context/')) {
		return 'context';
	}

	if (relativePath.endsWith('/SKILL.md')) {
		return 'skill';
	}

	if (relativePath.startsWith('.mustflow/docs/')) {
		return 'workflow_doc';
	}

	return 'document';
}

function parseFrontmatter(content: string): Record<string, string> {
	if (!content.startsWith('---')) {
		return {};
	}

	const firstLineEnd = content.indexOf('\n');
	if (firstLineEnd === -1) {
		return {};
	}

	let end = -1;
	let lineStart = firstLineEnd + 1;
	while (lineStart < content.length) {
		const lineEnd = content.indexOf('\n', lineStart);
		const nextLineStart = lineEnd === -1 ? content.length : lineEnd + 1;
		const line = content.slice(lineStart, lineEnd === -1 ? content.length : lineEnd).replace(/\r$/u, '');

		if (line.trim() === '---') {
			end = lineStart;
			break;
		}

		lineStart = nextLineStart;
	}

	if (end === -1) {
		return {};
	}

	const result: Record<string, string> = {};
	const rawFrontmatter = content.slice(firstLineEnd + 1, end);

	for (const line of rawFrontmatter.split(/\r?\n/)) {
		const separatorIndex = line.indexOf(':');

		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim();

		if (key.length > 0 && value.length > 0) {
			result[key] = value;
		}
	}

	return result;
}

function getTitle(relativePath: string, content: string): string {
	const heading = content.match(/^#\s+(.+)$/mu)?.[1]?.trim();
	return heading && heading.length > 0 ? heading : path.posix.basename(relativePath);
}

function getSections(content: string): string[] {
	return [...content.matchAll(/^##\s+(.+)$/gmu)].map((match) => match[1]?.trim()).filter((value): value is string => Boolean(value));
}

function truncateUtf8(value: string, maxBytes: number): string {
	const buffer = Buffer.from(value, 'utf8');

	if (buffer.byteLength <= maxBytes) {
		return value;
	}

	return buffer.subarray(0, maxBytes).toString('utf8').replace(/\uFFFD$/u, '');
}

export function collectDocumentsFromPaths(projectRoot: string, relativePaths: readonly string[]): IndexDocument[] {
	return relativePaths.map((relativePath) => {
		const content = readText(projectRoot, relativePath);
		const frontmatter = parseFrontmatter(content);
		const revision = Number.parseInt(frontmatter.revision ?? '', 10);

		return {
			path: relativePath,
			type: getDocumentType(relativePath),
			title: getTitle(relativePath, content),
			locale: frontmatter.locale ?? null,
			revision: Number.isInteger(revision) ? revision : null,
			contentHash: sha256Text(content),
			contentSnippet: truncateUtf8(content, MAX_SNIPPET_BYTES_PER_DOCUMENT),
			sections: getSections(content),
		};
	});
}

export function collectDocuments(projectRoot: string): IndexDocument[] {
	return collectDocumentsFromPaths(projectRoot, getExistingIndexablePaths(projectRoot));
}

export function collectSkills(documents: readonly IndexDocument[]): IndexSkill[] {
	return documents
		.filter((document) => document.type === 'skill')
		.map((document) => ({
			name: document.path.split('/').at(-2) ?? document.title,
			path: document.path,
			title: document.title,
		}))
		.sort((left, right) => left.name.localeCompare(right.name));
}

function normalizeMarkdownCell(value: string): string {
	return value
		.replace(/<br\s*\/?>/giu, ' ')
		.replace(/`([^`]+)`/gu, '$1')
		.replace(/\s+/gu, ' ')
		.trim();
}

function parseMarkdownTableRow(line: string): string[] {
	return line
		.trim()
		.replace(/^\|/u, '')
		.replace(/\|$/u, '')
		.split('|')
		.map((cell) => normalizeMarkdownCell(cell));
}

function isMarkdownSeparatorRow(cells: readonly string[]): boolean {
	return cells.length > 0 && cells.every((cell) => /^:?-{3,}:?$/u.test(cell));
}

function skillNameFromPath(skillPath: string): string {
	return skillPath.split('/').at(-2) ?? path.posix.basename(skillPath, '.md');
}

export function splitVerificationIntents(value: string): string[] {
	return value
		.split(',')
		.map((item) => item.trim())
		.filter(Boolean)
		.sort((left, right) => left.localeCompare(right));
}

export function skillRouteKey(route: Pick<IndexSkillRoute, 'skillName' | 'trigger'>): string {
	return `${route.skillName}\u0000${route.trigger}`;
}

export function collectSkillRoutes(projectRoot: string): IndexSkillRoute[] {
	const indexPath = path.join(projectRoot, '.mustflow', 'skills', 'INDEX.md');

	if (!existsSync(indexPath)) {
		return [];
	}

	const content = readMustflowTextFile(projectRoot, '.mustflow/skills/INDEX.md');
	const routes: IndexSkillRoute[] = [];
	let inRouteTable = false;

	for (const line of content.split(/\r?\n/u)) {
		if (!line.trim().startsWith('|')) {
			if (inRouteTable && line.trim() === '') {
				inRouteTable = false;
			}

			continue;
		}

		const cells = parseMarkdownTableRow(line);

		if (cells.includes('Skill Document') && cells.includes('Trigger')) {
			inRouteTable = true;
			continue;
		}

		if (!inRouteTable || isMarkdownSeparatorRow(cells) || cells.length < 7) {
			continue;
		}

		const [trigger, skillPath, requiredInput, editScope, risk, verificationIntents, expectedOutput] = cells;

		if (!skillPath?.startsWith('.mustflow/skills/') || !skillPath.endsWith('/SKILL.md')) {
			continue;
		}

		routes.push({
			skillName: skillNameFromPath(skillPath),
			skillPath,
			trigger: trigger ?? '',
			requiredInput: requiredInput ?? '',
			editScope: editScope ?? '',
			risk: risk ?? '',
			verificationIntents: splitVerificationIntents(verificationIntents ?? ''),
			expectedOutput: expectedOutput ?? '',
		});
	}

	return routes.sort((left, right) => {
		const skillOrder = left.skillName.localeCompare(right.skillName);
		return skillOrder === 0 ? left.trigger.localeCompare(right.trigger) : skillOrder;
	});
}
