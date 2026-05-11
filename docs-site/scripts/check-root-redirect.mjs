import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { site } from '../src/config/site.mjs';

const docsRoot = fileURLToPath(new URL('..', import.meta.url));
const indexHtml = readFileSync(join(docsRoot, 'dist', 'index.html'), 'utf8');
const basePath = site.base.replace(/\/$/, '');
const defaultLocaleUrl = `${basePath}/en/`;

const failures = [];

if (!indexHtml.includes(`url=${defaultLocaleUrl}`)) {
	failures.push(`root meta refresh must point to ${defaultLocaleUrl}`);
}

if (!indexHtml.includes(`const basePath = "${basePath}"`)) {
	failures.push(`root redirect script must preserve base path ${basePath}`);
}

if (indexHtml.includes('url=/en/')) {
	failures.push('root meta refresh must not drop the configured base path');
}

if (indexHtml.includes("window.location.replace('/' + routeLocale")) {
	failures.push('root redirect script must not construct root-absolute locale paths');
}

if (failures.length > 0) {
	console.error(`root redirect check failed (${failures.length})`);
	for (const failure of failures) {
		console.error(`- ${failure}`);
	}
	process.exitCode = 1;
} else {
	console.log(`root redirect ok (${defaultLocaleUrl})`);
}
