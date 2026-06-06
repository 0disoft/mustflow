import { readFileSync } from 'node:fs';
import { request } from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const packageJson = JSON.parse(readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
const args = new Set(process.argv.slice(2));
const expectAvailable = args.has('--expect-available');
const expectPublished = args.has('--expect-published');

if (expectAvailable === expectPublished) {
	console.error('Use exactly one expectation: --expect-available or --expect-published.');
	process.exit(2);
}

if (typeof packageJson.name !== 'string' || packageJson.name.length === 0) {
	console.error('package.json must define a package name.');
	process.exit(2);
}

if (typeof packageJson.version !== 'string' || packageJson.version.length === 0) {
	console.error('package.json must define a package version.');
	process.exit(2);
}

function encodeRegistryPackagePath(packageName) {
	const encoded = encodeURIComponent(packageName);
	const encodedScopedMarker = '%40';
	return packageName.startsWith('@') && encoded.startsWith(encodedScopedMarker)
		? `@${encoded.slice(encodedScopedMarker.length)}`
		: encoded;
}

const registryUrl = new URL(process.env.MUSTFLOW_NPM_REGISTRY_URL || 'https://registry.npmjs.org/');
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
