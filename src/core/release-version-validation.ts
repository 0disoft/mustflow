import { readFileSync } from 'node:fs';
import path from 'node:path';

import { isRecord, type TomlTable } from './config-loading.js';
import { readTomlFile } from './toml.js';
import { evaluateVersionSync, type VersionSyncIssueSeverity } from './version-sync-policy.js';

export interface ReleaseVersionValidationIssue {
	readonly message: string;
	readonly severity: VersionSyncIssueSeverity;
}

export const PACKAGE_JSON_VERSION_SOURCE_PATH = 'package.json';
export const DEFAULT_TEMPLATE_MANIFEST_PATH = 'templates/default/manifest.toml';

function releaseVersioningSyncsTemplateVersion(preferencesToml: TomlTable | undefined): boolean {
	if (!preferencesToml || !isRecord(preferencesToml.release)) {
		return false;
	}

	const { versioning } = preferencesToml.release;
	return isRecord(versioning) && versioning.sync_template_version === true;
}

function readPackageJsonVersion(filePath: string): string | undefined {
	try {
		const parsed = JSON.parse(readFileSync(filePath, 'utf8')) as unknown;
		return isRecord(parsed) && typeof parsed.version === 'string' ? parsed.version : undefined;
	} catch {
		return undefined;
	}
}

function readTomlRootVersion(filePath: string): string | undefined {
	try {
		const parsed = readTomlFile(filePath);
		return isRecord(parsed) && typeof parsed.version === 'string' ? parsed.version : undefined;
	} catch {
		return undefined;
	}
}

/**
 * mf:anchor core.release-version-validation
 * purpose: Validate release version synchronization between package and installed template metadata.
 * search: sync_template_version, package.json version, template manifest version
 * invariant: Template version synchronization is checked only when the repository preference enables it.
 * risk: dependency, data_consistency
 */
export function validateTemplateVersionSync(
	projectRoot: string,
	preferencesToml: TomlTable | undefined,
	changedPaths?: readonly string[],
): ReleaseVersionValidationIssue[] {
	const packageVersion = readPackageJsonVersion(path.join(projectRoot, PACKAGE_JSON_VERSION_SOURCE_PATH));
	const templateVersion = readTomlRootVersion(path.join(projectRoot, DEFAULT_TEMPLATE_MANIFEST_PATH));
	const syncTemplateVersion = releaseVersioningSyncsTemplateVersion(preferencesToml);

	return evaluateVersionSync({
		packageVersion,
		templateVersion,
		syncTemplateVersion,
		changedPaths,
	}).issues.map((issue) => ({
		message: issue.message,
		severity: issue.severity,
	}));
}
