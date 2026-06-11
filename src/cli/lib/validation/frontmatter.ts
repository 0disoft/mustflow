import { SKILL_SECTION_MARKER_PATTERN } from './constants.js';

export function readSkillSectionIds(content: string): Set<string> {
	return new Set([...content.matchAll(SKILL_SECTION_MARKER_PATTERN)].map((match) => match[1]));
}

function findFrontmatterEnd(content: string): number {
	const match = /\n---(?:\r?\n|$)/u.exec(content.slice(3));
	return match ? 3 + match.index : -1;
}

export function parseSimpleFrontmatter(content: string): Record<string, string> {
	if (!content.startsWith('---')) {
		return {};
	}

	const end = findFrontmatterEnd(content);
	if (end === -1) {
		return {};
	}

	const frontmatter: Record<string, string> = {};

	for (const line of content.slice(3, end).split(/\r?\n/)) {
		const separatorIndex = line.indexOf(':');
		if (separatorIndex === -1) {
			continue;
		}

		const key = line.slice(0, separatorIndex).trim();
		const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, '');

		if (key.length > 0 && value.length > 0) {
			frontmatter[key] = value;
		}
	}

	return frontmatter;
}

function readFrontmatterLines(content: string): string[] {
	if (!content.startsWith('---')) {
		return [];
	}

	const end = findFrontmatterEnd(content);
	if (end === -1) {
		return [];
	}

	return content
		.slice(3, end)
		.split(/\n/u)
		.map((line) => line.replace(/\r$/u, ''));
}

function stripScalarMarkers(value: string): string {
	return value.trim().replace(/^["'`]|["'`]$/g, '').trim();
}

export function readFrontmatterList(content: string, key: string): string[] {
	const lines = readFrontmatterLines(content);
	const values: string[] = [];
	let keyIndent: number | undefined;

	for (const line of lines) {
		const keyMatch = line.match(new RegExp(`^(\\s*)${key}:\\s*$`, 'u'));

		if (keyIndent === undefined) {
			if (keyMatch) {
				keyIndent = keyMatch[1].length;
			}

			continue;
		}

		if (line.trim().length === 0) {
			continue;
		}

		const lineIndent = line.match(/^\s*/u)?.[0].length ?? 0;
		const itemMatch = line.match(/^\s*-\s+(.+)$/u);

		if (lineIndent <= keyIndent && !itemMatch) {
			break;
		}

		if (itemMatch) {
			const value = stripScalarMarkers(itemMatch[1]);

			if (value.length > 0) {
				values.push(value);
			}
		}
	}

	return values;
}
