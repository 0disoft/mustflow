import type { PackageMetadata } from './package-info.js';

const DEFAULT_NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const DEFAULT_VERSION_CHECK_TIMEOUT_MS = 3_000;

export interface PackageVersionCheck {
	readonly packageName: string;
	readonly currentVersion: string;
	readonly latestVersion: string;
	readonly updateAvailable: boolean;
	readonly registryUrl: string;
	readonly updateCommand: string;
}

interface ParsedSemver {
	readonly major: number;
	readonly minor: number;
	readonly patch: number;
	readonly prerelease: readonly string[] | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseSemver(version: string): ParsedSemver | null {
	const match = /^v?(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?(?:\+[-0-9A-Za-z.]+)?$/u.exec(version.trim());

	if (!match) {
		return null;
	}

	return {
		major: Number(match[1]),
		minor: Number(match[2]),
		patch: Number(match[3]),
		prerelease: match[4] ? match[4].split('.') : null,
	};
}

function comparePrerelease(left: readonly string[] | null, right: readonly string[] | null): number {
	if (!left && !right) return 0;
	if (!left) return 1;
	if (!right) return -1;

	const length = Math.max(left.length, right.length);
	for (let index = 0; index < length; index += 1) {
		const leftPart = left[index];
		const rightPart = right[index];

		if (leftPart === undefined) return -1;
		if (rightPart === undefined) return 1;
		if (leftPart === rightPart) continue;

		const leftNumber = /^\d+$/u.test(leftPart) ? Number(leftPart) : null;
		const rightNumber = /^\d+$/u.test(rightPart) ? Number(rightPart) : null;

		if (leftNumber !== null && rightNumber !== null) return Math.sign(leftNumber - rightNumber);
		if (leftNumber !== null) return -1;
		if (rightNumber !== null) return 1;

		return leftPart.localeCompare(rightPart);
	}

	return 0;
}

export function comparePackageVersions(left: string, right: string): number {
	const leftSemver = parseSemver(left);
	const rightSemver = parseSemver(right);

	if (!leftSemver || !rightSemver) {
		return left.localeCompare(right);
	}

	for (const key of ['major', 'minor', 'patch'] as const) {
		const diff = leftSemver[key] - rightSemver[key];
		if (diff !== 0) return Math.sign(diff);
	}

	return comparePrerelease(leftSemver.prerelease, rightSemver.prerelease);
}

function getRegistryUrl(): string {
	return process.env.MUSTFLOW_NPM_REGISTRY_URL?.trim() || DEFAULT_NPM_REGISTRY_URL;
}

function getTimeoutMs(): number {
	const rawValue = process.env.MUSTFLOW_VERSION_CHECK_TIMEOUT_MS;
	const parsed = rawValue ? Number(rawValue) : DEFAULT_VERSION_CHECK_TIMEOUT_MS;

	return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : DEFAULT_VERSION_CHECK_TIMEOUT_MS;
}

function buildLatestPackageUrl(registryUrl: string, packageName: string): string {
	const trimmedRegistryUrl = registryUrl.replace(/\/+$/u, '');
	const encodedPackageName = packageName.startsWith('@')
		? `@${encodeURIComponent(packageName.slice(1))}`
		: encodeURIComponent(packageName);

	return `${trimmedRegistryUrl}/${encodedPackageName}/latest`;
}

export async function checkNpmLatestVersion(metadata: PackageMetadata): Promise<PackageVersionCheck> {
	const registryUrl = getRegistryUrl();
	const response = await fetch(buildLatestPackageUrl(registryUrl, metadata.name), {
		headers: { accept: 'application/json' },
		signal: AbortSignal.timeout(getTimeoutMs()),
	});

	if (!response.ok) {
		throw new Error(`npm registry returned HTTP ${response.status}`);
	}

	const body: unknown = await response.json();
	const latestVersion = isRecord(body) && typeof body.version === 'string' ? body.version : '';

	if (!latestVersion) {
		throw new Error('npm registry response did not include a version');
	}

	return {
		packageName: metadata.name,
		currentVersion: metadata.version,
		latestVersion,
		updateAvailable: comparePackageVersions(metadata.version, latestVersion) < 0,
		registryUrl,
		updateCommand: `npm install -g ${metadata.name}@latest`,
	};
}
