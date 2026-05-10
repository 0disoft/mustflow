import { readFileSync } from 'node:fs';

import { parse, stringify } from 'smol-toml';

export function parseTomlText(value: string): unknown {
	return parse(value);
}

export function readTomlFile(filePath: string): unknown {
	return parseTomlText(readFileSync(filePath, 'utf8'));
}

export function stringifyToml(value: Record<string, unknown>): string {
	return `${stringify(value).trimEnd()}\n`;
}
