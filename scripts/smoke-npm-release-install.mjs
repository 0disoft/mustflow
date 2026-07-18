import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	formatSmokeError,
	smokePublishedPackage,
} from './lib/npm-release-install-smoke.mjs';
import {
	readCommittedReleasePackageJson,
	readWorkingTreeReleasePackageJson,
} from './lib/release-package-identity.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = new Set(process.argv.slice(2));
const packageJson = args.has('--from-head')
	? readCommittedReleasePackageJson(projectRoot)
	: readWorkingTreeReleasePackageJson(projectRoot);

try {
	await smokePublishedPackage({ packageJson });
} catch (error) {
	console.error(formatSmokeError(error));
	process.exitCode = 1;
}
