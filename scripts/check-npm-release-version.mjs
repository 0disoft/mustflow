import { request } from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
	readCommittedReleasePackageJson,
	readWorkingTreeReleasePackageJson,
} from './lib/release-package-identity.mjs';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const rawArgs = process.argv.slice(2);
const args = new Set(rawArgs);
const expectAvailable = args.has('--expect-available');
const expectPublished = args.has('--expect-published');
const fromHead = args.has('--from-head');

function readOptionValue(optionName) {
	const optionIndex = rawArgs.indexOf(optionName);
	if (optionIndex < 0) {
		return undefined;
	}

	const value = rawArgs[optionIndex + 1];
	if (!value || value.startsWith('--')) {
		console.error(`${optionName} requires a value.`);
		process.exit(2);
	}

	return value;
}

const explicitPackageName = readOptionValue('--package-name');
const explicitPackageVersion = readOptionValue('--package-version');

if (expectAvailable === expectPublished) {
	console.error('Use exactly one expectation: --expect-available or --expect-published.');
	process.exit(2);
}

if ((explicitPackageName === undefined) !== (explicitPackageVersion === undefined)) {
	console.error('Use --package-name and --package-version together.');
	process.exit(2);
}

if (fromHead && explicitPackageName !== undefined) {
	console.error('Do not combine --from-head with explicit package identity options.');
	process.exit(2);
}

const packageJson = explicitPackageName !== undefined
	? { name: explicitPackageName, version: explicitPackageVersion }
	: fromHead
		? readCommittedReleasePackageJson(projectRoot)
		: readWorkingTreeReleasePackageJson(projectRoot);

function encodeRegistryPackagePath(packageName) {
	const encoded = encodeURIComponent(packageName);
	const encodedScopedMarker = '%40';
	return packageName.startsWith('@') && encoded.startsWith(encodedScopedMarker)
		? `@${encoded.slice(encodedScopedMarker.length)}`
		: encoded;
}

function normalizeRegistryBaseUrl(value) {
	const registryUrl = new URL(value);
	if (!registryUrl.pathname.endsWith('/')) {
		registryUrl.pathname = `${registryUrl.pathname}/`;
	}
	return registryUrl;
}

const registryUrl = normalizeRegistryBaseUrl(process.env.MUSTFLOW_NPM_REGISTRY_URL || 'https://registry.npmjs.org/');
const packagePath = encodeRegistryPackagePath(packageJson.name);
const metadataUrl = new URL(packagePath, registryUrl);

function readRegistryMetadata() {
	return new Promise((resolve, reject) => {
		const registryRequest = request(
			metadataUrl,
			{
				headers: {
					accept: 'application/vnd.npm.install-v1+json, application/json',
					connection: 'close',
				},
			},
			(response) => {
				let body = '';
				response.setEncoding('utf8');
				response.on('data', (chunk) => {
					body += chunk;
				});
				response.on('end', () => {
					if (response.statusCode === 404) {
						resolve({ exists: false, versions: {} });
						return;
					}

					if (!response.statusCode || response.statusCode < 200 || response.statusCode >= 300) {
						reject(new Error(`npm registry returned HTTP ${response.statusCode ?? 'unknown'} for ${metadataUrl.href}`));
						return;
					}

					try {
						const metadata = JSON.parse(body);
						const versions =
							metadata && typeof metadata === 'object' && metadata.versions && typeof metadata.versions === 'object'
								? metadata.versions
								: {};
						resolve({ exists: true, versions });
					} catch (error) {
						reject(error);
					}
				});
			},
		);

		registryRequest.on('error', reject);
		registryRequest.setTimeout(30_000, () => {
			registryRequest.destroy(new Error(`npm registry request timed out for ${metadataUrl.href}`));
		});
		registryRequest.end();
	});
}

async function main() {
	const { exists, versions } = await readRegistryMetadata();
	const published = exists && Object.prototype.hasOwnProperty.call(versions, packageJson.version);
	const label = `${packageJson.name}@${packageJson.version}`;

	if (expectAvailable) {
		if (published) {
			console.error(`${label} already exists in ${registryUrl.href}`);
			process.exit(1);
		}

		console.log(`${label} is available in ${registryUrl.href}`);
		process.exit(0);
	}

	if (!published) {
		console.error(`${label} is not published in ${registryUrl.href}`);
		process.exit(1);
	}

	console.log(`${label} is published in ${registryUrl.href}`);
}

try {
	await main();
} catch (error) {
	console.error(error instanceof Error ? error.message : String(error));
	process.exit(1);
}
