import { lstatSync } from 'node:fs';
import path from 'node:path';

import { ensureInside } from './safe-filesystem.js';

const SOURCE_EXTENSION_FALLBACKS: Readonly<Record<string, readonly string[]>> = {
	'.js': ['.ts', '.tsx'],
	'.jsx': ['.tsx'],
	'.mjs': ['.mts'],
	'.cjs': ['.cts'],
};

export function resolveRelativeImport(
	projectRoot: string,
	sourceAbsolutePath: string,
	specifier: string,
	extensions: readonly string[],
): string | null {
	if (!specifier.startsWith('./') && !specifier.startsWith('../')) {
		return null;
	}

	const base = path.resolve(path.dirname(sourceAbsolutePath), specifier);
	const extension = path.extname(base);
	const candidates = [
		base,
		...(SOURCE_EXTENSION_FALLBACKS[extension] ?? []).map((sourceExtension) =>
			`${base.slice(0, -extension.length)}${sourceExtension}`,
		),
		...extensions.map((suffix) => `${base}${suffix}`),
		...extensions.map((suffix) => path.join(base, `index${suffix}`)),
	];

	for (const candidate of candidates) {
		try {
			ensureInside(projectRoot, candidate);
		} catch {
			return null;
		}
		try {
			if (lstatSync(candidate).isFile()) {
				return path.relative(projectRoot, candidate).replace(/\\/gu, '/') || '.';
			}
		} catch {
			// Missing or unreadable candidates do not resolve an import.
		}
	}

	return null;
}
