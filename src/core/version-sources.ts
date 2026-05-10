import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from './config-loading.js';
import { readTomlFile } from './toml.js';

const RELEASE_VERSIONING_ACTIVE_FIELDS = [
	'impact_check',
	'suggest_bump',
	'auto_bump',
	'sync_template_version',
	'sync_docs_examples',
	'sync_tests',
] as const;

export const VERSIONING_CONFIG_PATH = '.mustflow/config/versioning.toml';
export const VERSION_SOURCE_KINDS = ['template_lock', 'template_manifest', 'package_manifest'] as const;
export const VERSION_SOURCE_AUTHORITIES = ['source', 'derived'] as const;

const VERSION_SOURCE_CANDIDATE_FILES = [
	{
		relativePath: '.mustflow/config/manifest.lock.toml',
		kind: 'template_lock',
		pattern: /^\s*version\s*=\s*["'][^"']+["']/mu,
	},
	{
		relativePath: 'templates/default/manifest.toml',
		kind: 'template_manifest',
		pattern: /^\s*version\s*=\s*["'][^"']+["']/mu,
	},
	{ relativePath: 'package.json', kind: 'package_manifest', mode: 'json' },
	{ relativePath: 'pyproject.toml', kind: 'package_manifest', pattern: /^\s*version\s*=\s*["'][^"']+["']/mu },
	{ relativePath: 'Cargo.toml', kind: 'package_manifest', pattern: /^\s*version\s*=\s*["'][^"']+["']/mu },
	{ relativePath: 'deno.json', kind: 'package_manifest', mode: 'json' },
	{ relativePath: 'deno.jsonc', kind: 'package_manifest', pattern: /"version"\s*:\s*"[^"]+"/u },
	{ relativePath: 'jsr.json', kind: 'package_manifest', mode: 'json' },
	{ relativePath: 'jsr.jsonc', kind: 'package_manifest', pattern: /"version"\s*:\s*"[^"]+"/u },
	{ relativePath: 'composer.json', kind: 'package_manifest', mode: 'json' },
	{ relativePath: 'pom.xml', kind: 'package_manifest', pattern: /<version>[^<]+<\/version>/u },
	{ relativePath: 'build.gradle', kind: 'package_manifest', pattern: /^\s*version\s*=/mu },
	{ relativePath: 'build.gradle.kts', kind: 'package_manifest', pattern: /^\s*version\s*=/mu },
	{ relativePath: 'pubspec.yaml', kind: 'package_manifest', pattern: /^\s*version\s*:\s*\S+/mu },
	{ relativePath: 'Chart.yaml', kind: 'package_manifest', pattern: /^\s*version\s*:\s*\S+/mu },
] as const;

const GO_RELEASE_TAG_PATTERN = /^v\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/u;

const VERSION_SOURCE_ROOT_FILE_PATTERNS = [
	{
		suffix: '.csproj',
		kind: 'package_manifest',
		pattern: /<(?:Version|PackageVersion)>[^<]+<\/(?:Version|PackageVersion)>/u,
	},
	{
		suffix: '.fsproj',
		kind: 'package_manifest',
		pattern: /<(?:Version|PackageVersion)>[^<]+<\/(?:Version|PackageVersion)>/u,
	},
	{
		suffix: '.vbproj',
		kind: 'package_manifest',
		pattern: /<(?:Version|PackageVersion)>[^<]+<\/(?:Version|PackageVersion)>/u,
	},
	{ suffix: '.gemspec', kind: 'package_manifest', pattern: /\.version\s*=/u },
] as const;

export type VersionSourceKind = (typeof VERSION_SOURCE_KINDS)[number];
export type VersionSourceAuthority = (typeof VERSION_SOURCE_AUTHORITIES)[number];

export interface VersionSource {
	readonly path: string;
	readonly kind: VersionSourceKind;
	readonly declared?: boolean;
	readonly authority?: VersionSourceAuthority;
}

function isSafeRelativePath(value: unknown): value is string {
	if (typeof value !== 'string' || value.trim().length === 0) {
		return false;
	}

	const normalized = value.replace(/\\/g, '/');
	const segments = normalized.split('/').filter(Boolean);

	if (path.posix.isAbsolute(normalized) || path.win32.isAbsolute(value)) {
		return false;
	}

	return segments.length > 0 && segments.every((segment) => segment !== '.' && segment !== '..');
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function isVersionSourceKind(value: unknown): value is VersionSourceKind {
	return typeof value === 'string' && VERSION_SOURCE_KINDS.includes(value as VersionSourceKind);
}

function isVersionSourceAuthority(value: unknown): value is VersionSourceAuthority {
	return typeof value === 'string' && VERSION_SOURCE_AUTHORITIES.includes(value as VersionSourceAuthority);
}

function hasJsonVersion(filePath: string): boolean {
	try {
		const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
		return isRecord(parsed) && typeof parsed.version === 'string' && parsed.version.trim().length > 0;
	} catch {
		return false;
	}
}

function hasVersionPattern(filePath: string, pattern: RegExp): boolean {
	try {
		return pattern.test(readFileSync(filePath, 'utf8'));
	} catch {
		return false;
	}
}

function hasVersionSourceCandidate(projectRoot: string, candidate: (typeof VERSION_SOURCE_CANDIDATE_FILES)[number]): boolean {
	const filePath = path.join(projectRoot, candidate.relativePath);

	if (!existsSync(filePath)) {
		return false;
	}

	if ('mode' in candidate && candidate.mode === 'json') {
		return hasJsonVersion(filePath);
	}

	return 'pattern' in candidate && hasVersionPattern(filePath, candidate.pattern);
}

function resolveGitDirectory(projectRoot: string): string | undefined {
	const gitPath = path.join(projectRoot, '.git');

	if (!existsSync(gitPath)) {
		return undefined;
	}

	try {
		if (statSync(gitPath).isDirectory()) {
			return gitPath;
		}

		const match = /^gitdir:\s*(.+)$/imu.exec(readFileSync(gitPath, 'utf8'));
		if (!match) {
			return undefined;
		}

		const gitDirectory = match[1].trim();
		return path.resolve(projectRoot, gitDirectory);
	} catch {
		return undefined;
	}
}

function hasSemverReleaseTag(projectRoot: string): boolean {
	const gitDirectory = resolveGitDirectory(projectRoot);

	if (!gitDirectory) {
		return false;
	}

	const tagRoot = path.join(gitDirectory, 'refs', 'tags');

	try {
		for (const entry of readdirSync(tagRoot, { withFileTypes: true })) {
			if (entry.isFile() && GO_RELEASE_TAG_PATTERN.test(entry.name)) {
				return true;
			}
		}
	} catch {
		// Packed tags are checked below.
	}

	try {
		const packedRefs = readFileSync(path.join(gitDirectory, 'packed-refs'), 'utf8');
		return packedRefs
			.split(/\r?\n/u)
			.some((line) => GO_RELEASE_TAG_PATTERN.test(line.replace(/^.*\srefs\/tags\//u, '').trim()));
	} catch {
		return false;
	}
}

function hasGoModuleVersionSource(projectRoot: string): boolean {
	return existsSync(path.join(projectRoot, 'go.mod')) && hasSemverReleaseTag(projectRoot);
}

export function readDeclaredVersionSources(projectRoot: string): VersionSource[] {
	try {
		const versioningConfig = readTomlFile(path.join(projectRoot, VERSIONING_CONFIG_PATH));

		if (!isRecord(versioningConfig) || !Array.isArray(versioningConfig.sources)) {
			return [];
		}

		return versioningConfig.sources.flatMap((source): VersionSource[] => {
			if (!isRecord(source) || !isSafeRelativePath(source.path) || !isVersionSourceKind(source.kind)) {
				return [];
			}

			const versionSource: VersionSource = {
				path: toPosixPath(source.path),
				kind: source.kind,
				declared: true,
			};

			return isVersionSourceAuthority(source.authority)
				? [{ ...versionSource, authority: source.authority }]
				: [versionSource];
		});
	} catch {
		return [];
	}
}

/**
 * mf:anchor core.version.sources.detect
 * purpose: Detect repository version sources before suggesting or applying version changes.
 * search: version source, package metadata, template version, release tag, auto bump
 * invariant: Declared version sources are preferred before fallback candidate detection.
 * risk: config, data_consistency
 */
export function detectVersionSources(projectRoot: string): VersionSource[] {
	const sources: VersionSource[] = readDeclaredVersionSources(projectRoot);

	sources.push(...VERSION_SOURCE_CANDIDATE_FILES.filter((candidate) =>
		hasVersionSourceCandidate(projectRoot, candidate),
	).map((candidate) => ({
		path: toPosixPath(candidate.relativePath),
		kind: candidate.kind,
	})));

	if (hasGoModuleVersionSource(projectRoot)) {
		sources.push({ path: 'go.mod', kind: 'package_manifest' });
	}

	try {
		for (const entry of readdirSync(projectRoot, { withFileTypes: true })) {
			if (!entry.isFile()) {
				continue;
			}

			const match = VERSION_SOURCE_ROOT_FILE_PATTERNS.find((candidate) => entry.name.endsWith(candidate.suffix));

			if (match && hasVersionPattern(path.join(projectRoot, entry.name), match.pattern)) {
				sources.push({ path: toPosixPath(entry.name), kind: match.kind });
			}
		}
	} catch {
		return uniqueVersionSources(sources);
	}

	return uniqueVersionSources(sources);
}

function uniqueVersionSources(sources: readonly VersionSource[]): VersionSource[] {
	const byKey = new Map<string, VersionSource>();

	for (const source of sources) {
		const key = `${source.kind}:${source.path}`;
		const existing = byKey.get(key);

		if (!existing || source.declared === true) {
			byKey.set(key, source);
		}
	}

	return [...byKey.values()].sort((left, right) => left.path.localeCompare(right.path));
}

export function detectVersionSourcePaths(projectRoot: string): string[] {
	return detectVersionSources(projectRoot).map((source) => source.path);
}

export function releaseVersioningIsEnabled(preferencesToml: TomlTable | undefined): boolean {
	if (!preferencesToml || !isRecord(preferencesToml.release)) {
		return false;
	}

	const { versioning } = preferencesToml.release;

	if (!isRecord(versioning)) {
		return false;
	}

	return RELEASE_VERSIONING_ACTIVE_FIELDS.some((field) => versioning[field] === true);
}
