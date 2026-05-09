import { readFileSync } from 'node:fs';

export interface PackageMetadata {
	readonly name: string;
	readonly version: string;
}

export function readPackageMetadata(): PackageMetadata {
	const packageUrl = new URL('../../../package.json', import.meta.url);
	const rawPackageJson = readFileSync(packageUrl, 'utf8');
	const parsed = JSON.parse(rawPackageJson) as { name?: unknown; version?: unknown };

	return {
		name: typeof parsed.name === 'string' ? parsed.name : 'mustflow',
		version: typeof parsed.version === 'string' ? parsed.version : '0.0.0',
	};
}

export function getPackageVersion(): string {
	return readPackageMetadata().version;
}
