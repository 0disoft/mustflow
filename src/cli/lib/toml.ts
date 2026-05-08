import { readFileSync } from 'node:fs';

import { parse, stringify } from 'smol-toml';

export function readTomlFile(filePath: string): unknown {
	return parse(readFileSync(filePath, 'utf8'));
}

export function stringifyToml(value: Record<string, unknown>): string {
	return `${stringify(value).trimEnd()}\n`;
}
