import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	formatSmokeError,
	smokePublishedPackage,
} from './lib/npm-release-install-smoke.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));

try {
	await smokePublishedPackage({ packageJson });
} catch (error) {
	console.error(formatSmokeError(error));
	process.exitCode = 1;
}
