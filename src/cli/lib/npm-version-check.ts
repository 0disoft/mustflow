import path from 'node:path';

import type { PackageMetadata } from './package-info.js';

const DEFAULT_NPM_REGISTRY_URL = 'https://registry.npmjs.org';
const DEFAULT_VERSION_CHECK_TIMEOUT_MS = 3_000;
const PACKAGE_MANAGER_COMMANDS = [
	{
		id: 'npm',
		label: 'npm',
		command(packageName: string) {
			return `npm install -g ${packageName}@latest`;
		},
	},
	{
		id: 'bun',
		label: 'bun',
		command(packageName: string) {
			return `bun add -g ${packageName}@latest`;
		},
	},
	{
		id: 'pnpm',
		label: 'pnpm',
		command(packageName: string) {
			return `pnpm add -g ${packageName}@latest`;
		},
	},
	{
		id: 'yarn',
		label: 'yarn',
		command(packageName: string) {
			return `yarn global add ${packageName}@latest`;
		},
	},
	{
		id: 'deno',
		label: 'deno',
		command(packageName: string) {
			return `deno install -g -A -n mf npm:${packageName}@latest`;
		},
	},
] as const;

type PackageManagerId = (typeof PACKAGE_MANAGER_COMMANDS)[number]['id'];
const PACKAGE_MANAGER_IDS = PACKAGE_MANAGER_COMMANDS.map((entry) => entry.id);

export interface PackageVersionCheck {
	readonly packageName: string;
	readonly currentVersion: string;
	readonly latestVersion: string;
	readonly updateAvailable: boolean;
	readonly registryUrl: string;
	readonly updateCommand: string;
	readonly updateCommands: readonly PackageInstallCommand[];
}

export interface PackageInstallCommand {
	readonly manager: string;
	readonly command: string;
	readonly recommended: boolean;
}

export interface NpmPackageRealityCheck {
	readonly packageName: string;
	readonly registryUrl: string;
	readonly exists: boolean;
	readonly resolvedName: string | null;
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

function packageManagerFromUserAgent(userAgent: string | undefined): PackageManagerId | null {
	const firstToken = userAgent?.trim().toLowerCase().split(/\s+/u)[0] ?? '';

	for (const id of PACKAGE_MANAGER_IDS) {
		if (firstToken === id || firstToken.startsWith(`${id}/`)) {
			return id;
		}
	}

	return null;
}

function packageManagerFromExecutablePath(executablePath: string | undefined): PackageManagerId | null {
	if (!executablePath) {
		return null;
	}

	const normalized = path
		.basename(executablePath)
		.toLowerCase()
		.replace(/\.(?:cmd|ps1|exe|cjs|mjs|js)$/u, '')
		.replace(/-cli$/u, '');

	return PACKAGE_MANAGER_IDS.find((id) => normalized === id) ?? null;
}

function detectPackageManagerId(): PackageManagerId | null {
	return (
		packageManagerFromUserAgent(process.env.npm_config_user_agent) ??
		packageManagerFromExecutablePath(process.env.npm_execpath) ??
		packageManagerFromExecutablePath(process.execPath)
	);
}

function getPackageInstallCommands(packageName: string): PackageInstallCommand[] {
	const detectedId = detectPackageManagerId();
	const commands = [...PACKAGE_MANAGER_COMMANDS];
	const recommendedIndex = detectedId ? commands.findIndex((entry) => entry.id === detectedId) : -1;

	if (recommendedIndex > 0) {
		const [recommended] = commands.splice(recommendedIndex, 1);
		commands.unshift(recommended);
	}

	return commands.map((entry, index) => ({
		manager: entry.label,
		command: entry.command(packageName),
		recommended: index === 0 && detectedId === entry.id,
	}));
}

function buildLatestPackageUrl(registryUrl: string, packageName: string): string {
	const trimmedRegistryUrl = registryUrl.replace(/\/+$/u, '');
	const encodedPackageName = packageName.startsWith('@')
		? `@${encodeURIComponent(packageName.slice(1))}`
		: encodeURIComponent(packageName);

	return `${trimmedRegistryUrl}/${encodedPackageName}/latest`;
}

function buildPackageMetadataUrl(registryUrl: string, packageName: string): string {
	const trimmedRegistryUrl = registryUrl.replace(/\/+$/u, '');
	const encodedPackageName = packageName.startsWith('@')
		? `@${encodeURIComponent(packageName.slice(1))}`
		: encodeURIComponent(packageName);

	return `${trimmedRegistryUrl}/${encodedPackageName}`;
}

export async function checkNpmPackageExists(packageName: string): Promise<NpmPackageRealityCheck> {
	const registryUrl = getRegistryUrl();
	const response = await fetch(buildPackageMetadataUrl(registryUrl, packageName), {
		headers: { accept: 'application/json' },
		signal: AbortSignal.timeout(getTimeoutMs()),
	});

	if (response.status === 404) {
		return {
			packageName,
			registryUrl,
			exists: false,
			resolvedName: null,
		};
	}

	if (!response.ok) {
		throw new Error(`npm registry returned HTTP ${response.status}`);
	}

	const body: unknown = await response.json();
	const resolvedName = isRecord(body) && typeof body.name === 'string' ? body.name : null;

	if (!resolvedName) {
		throw new Error('npm registry response did not include a package name');
	}

	return {
		packageName,
		registryUrl,
		exists: true,
		resolvedName,
	};
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

	const updateCommands = getPackageInstallCommands(metadata.name);

	return {
		packageName: metadata.name,
		currentVersion: metadata.version,
		latestVersion,
		updateAvailable: comparePackageVersions(metadata.version, latestVersion) < 0,
		registryUrl,
		updateCommand: updateCommands[0]?.command ?? `npm install -g ${metadata.name}@latest`,
		updateCommands,
	};
}
