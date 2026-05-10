import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'smol-toml';

export interface TemplateManifest {
	readonly id: string;
	readonly version: string;
	readonly commonRoot: string;
	readonly localesRoot?: string;
	readonly creates: string[];
	readonly defaultProfile: string;
	readonly profiles: string[];
	readonly defaultLocale: string;
	readonly locales: string[];
}

export interface TemplatePaths {
	readonly manifestPath: string;
	readonly templateRoot: string;
	readonly manifest: TemplateManifest;
}

export interface TemplateFileSource {
	readonly relativePath: string;
	readonly sourcePath: string;
	readonly sourceKind: 'common' | 'locale' | 'legacy';
}

interface RawManifest {
	readonly id?: unknown;
	readonly version?: unknown;
	readonly files_root?: unknown;
	readonly common_root?: unknown;
	readonly locales_root?: unknown;
	readonly creates?: unknown;
	readonly profiles?: unknown;
	readonly locales?: unknown;
}

interface RawManifestGroup {
	readonly default?: unknown;
	readonly available?: unknown;
}

function readStringGroup(raw: unknown, label: string): { defaultValue: string; available: string[] } {
	if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
		throw new Error(`Template manifest is missing table: ${label}`);
	}

	const group = raw as RawManifestGroup;

	if (typeof group.default !== 'string') {
		throw new Error(`Template manifest is missing string field: ${label}.default`);
	}

	if (!Array.isArray(group.available) || group.available.some((entry) => typeof entry !== 'string')) {
		throw new Error(`Template manifest is missing string array field: ${label}.available`);
	}

	if (!group.available.includes(group.default)) {
		throw new Error(`Template manifest ${label}.available must include ${label}.default`);
	}

	return {
		defaultValue: group.default,
		available: group.available as string[],
	};
}

function normalizeTemplateTargetPath(relativePath: string): string {
	return relativePath.replaceAll('\\', '/');
}

function isAllowedTemplateCreateTarget(relativePath: string): boolean {
	const normalizedPath = normalizeTemplateTargetPath(relativePath);

	if (
		normalizedPath.startsWith('/') ||
		normalizedPath.startsWith('../') ||
		normalizedPath.includes('/../') ||
		normalizedPath.endsWith('/..')
	) {
		return false;
	}

	return normalizedPath === 'AGENTS.md' || normalizedPath.startsWith('.mustflow/');
}

/**
 * mf:anchor cli.templates.install-surface
 * purpose: Keep template installation and update targets inside the mustflow-managed surface.
 * search: template manifest, creates, AGENTS.md, .mustflow, install surface
 * invariant: Template creates targets are limited to AGENTS.md and .mustflow paths.
 * risk: config, security
 */
function validateTemplateCreateTargets(creates: readonly string[]): void {
	const invalidTarget = creates.find((relativePath) => !isAllowedTemplateCreateTarget(relativePath));

	if (!invalidTarget) {
		return;
	}

	throw new Error(
		`Template manifest creates target "${invalidTarget}" outside the mustflow-managed install surface. ` +
			'Template installation and updates may write only AGENTS.md and .mustflow/**.',
	);
}

function readManifest(manifestPath: string): TemplateManifest {
	const raw = parse(readFileSync(manifestPath, 'utf8')) as RawManifest;

	if (typeof raw.id !== 'string') {
		throw new Error(`Template manifest is missing string field: id`);
	}

	if (typeof raw.version !== 'string') {
		throw new Error(`Template manifest is missing string field: version`);
	}

	if (!Array.isArray(raw.creates) || raw.creates.some((entry) => typeof entry !== 'string')) {
		throw new Error(`Template manifest is missing string array field: creates`);
	}

	validateTemplateCreateTargets(raw.creates as string[]);

	const profiles = readStringGroup(raw.profiles, 'profiles');
	const locales = readStringGroup(raw.locales, 'locales');
	const commonRoot = typeof raw.common_root === 'string' ? raw.common_root : raw.files_root;

	if (typeof commonRoot !== 'string') {
		throw new Error(`Template manifest is missing string field: common_root`);
	}

	if (raw.locales_root !== undefined && typeof raw.locales_root !== 'string') {
		throw new Error(`Template manifest locales_root must be a string when present`);
	}

	return {
		id: raw.id,
		version: raw.version,
		commonRoot,
		localesRoot: raw.locales_root as string | undefined,
		creates: raw.creates as string[],
		defaultProfile: profiles.defaultValue,
		profiles: profiles.available,
		defaultLocale: locales.defaultValue,
		locales: locales.available,
	};
}

export function getDefaultTemplate(): TemplatePaths {
	const templateRoot = path.resolve(
		process.env.MUSTFLOW_DEV_TEMPLATE_ROOT ?? fileURLToPath(new URL('../../../templates/default', import.meta.url)),
	);
	const manifestPath = path.join(templateRoot, 'manifest.toml');
	const manifest = readManifest(manifestPath);

	return {
		manifestPath,
		templateRoot,
		manifest,
	};
}

export function getTemplateFiles(template: TemplatePaths, locale: string = template.manifest.defaultLocale): TemplateFileSource[] {
	const commonRoot = path.join(template.templateRoot, template.manifest.commonRoot);
	const localeRoot = template.manifest.localesRoot ? path.join(template.templateRoot, template.manifest.localesRoot, locale) : undefined;

	return template.manifest.creates.map((relativePath) => {
		const localePath = localeRoot ? path.join(localeRoot, ...relativePath.split('/')) : undefined;
		const commonPath = path.join(commonRoot, ...relativePath.split('/'));

		if (localePath && existsSync(localePath)) {
			return {
				relativePath,
				sourcePath: localePath,
				sourceKind: 'locale',
			};
		}

		if (existsSync(commonPath)) {
			return {
				relativePath,
				sourcePath: commonPath,
				sourceKind: template.manifest.localesRoot ? 'common' : 'legacy',
			};
		}

		throw new Error(`Template source missing for ${relativePath} in locale ${locale}`);
	});
}
