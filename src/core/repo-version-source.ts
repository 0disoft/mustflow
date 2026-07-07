import { createHash } from 'node:crypto';
import path from 'node:path';

import { readEffectivePreferencesToml } from './preferences.js';
import type { ScriptCheckFinding, ScriptCheckStatus } from './script-check-result.js';
import {
	detectVersionSources,
	releaseVersioningIsEnabled,
	VERSIONING_CONFIG_PATH,
	type VersionSource,
} from './version-sources.js';

export const REPO_VERSION_SOURCE_PACK_ID = 'repo';
export const REPO_VERSION_SOURCE_SCRIPT_ID = 'version-source';
export const REPO_VERSION_SOURCE_SCRIPT_REF = `${REPO_VERSION_SOURCE_PACK_ID}/${REPO_VERSION_SOURCE_SCRIPT_ID}`;
export const REPO_VERSION_SOURCE_PREFERENCES_PATH = '.mustflow/config/preferences.toml';

export type RepoVersionSourceFindingCode = 'versioning_enabled_without_sources';

export interface RepoVersionSourceInput {
	readonly preferences_path: typeof REPO_VERSION_SOURCE_PREFERENCES_PATH;
	readonly declared_sources_path: typeof VERSIONING_CONFIG_PATH;
}

export interface RepoVersionSourceCounts {
	readonly sources: number;
	readonly declared_sources: number;
	readonly source_authority_sources: number;
	readonly derived_authority_sources: number;
	readonly unclassified_authority_sources: number;
}

export interface RepoVersionSourceFinding extends ScriptCheckFinding {
	readonly code: RepoVersionSourceFindingCode;
	readonly path: string;
}

export interface RepoVersionSourceReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_VERSION_SOURCE_PACK_ID;
	readonly script_id: typeof REPO_VERSION_SOURCE_SCRIPT_ID;
	readonly script_ref: typeof REPO_VERSION_SOURCE_SCRIPT_REF;
	readonly action: 'inspect';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: RepoVersionSourceInput;
	readonly input_hash: string;
	readonly versioning_enabled: boolean;
	readonly counts: RepoVersionSourceCounts;
	readonly sources: readonly VersionSource[];
	readonly findings: readonly RepoVersionSourceFinding[];
	readonly issues: readonly string[];
}

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function countSources(sources: readonly VersionSource[]): RepoVersionSourceCounts {
	return {
		sources: sources.length,
		declared_sources: sources.filter((source) => source.declared === true).length,
		source_authority_sources: sources.filter((source) => source.authority === 'source').length,
		derived_authority_sources: sources.filter((source) => source.authority === 'derived').length,
		unclassified_authority_sources: sources.filter((source) => source.authority === undefined).length,
	};
}

function createInputHash(reportInput: {
	readonly versioningEnabled: boolean;
	readonly counts: RepoVersionSourceCounts;
	readonly sources: readonly VersionSource[];
	readonly findings: readonly RepoVersionSourceFinding[];
	readonly issues: readonly string[];
}): string {
	return sha256(JSON.stringify(reportInput));
}

export function inspectRepoVersionSource(projectRoot: string): RepoVersionSourceReport {
	const root = path.resolve(projectRoot);
	const issues: string[] = [];
	let preferences;
	try {
		preferences = readEffectivePreferencesToml(root);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read local or inherited ${REPO_VERSION_SOURCE_PREFERENCES_PATH}: ${message}`);
	}
	const versioningEnabled = releaseVersioningIsEnabled(preferences);
	const sources = detectVersionSources(root);
	const findings: RepoVersionSourceFinding[] = [];

	if (versioningEnabled && sources.length === 0) {
		findings.push({
			code: 'versioning_enabled_without_sources',
			severity: 'high',
			path: REPO_VERSION_SOURCE_PREFERENCES_PATH,
			message: 'Release versioning preferences are enabled, but no version source was detected.',
			json_pointer: null,
			metric: null,
			actual: 0,
			expected: 1,
		});
	}

	const counts = countSources(sources);
	const status: ScriptCheckStatus = issues.length > 0 ? 'error' : findings.length > 0 ? 'failed' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_VERSION_SOURCE_PACK_ID,
		script_id: REPO_VERSION_SOURCE_SCRIPT_ID,
		script_ref: REPO_VERSION_SOURCE_SCRIPT_REF,
		action: 'inspect',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			preferences_path: REPO_VERSION_SOURCE_PREFERENCES_PATH,
			declared_sources_path: VERSIONING_CONFIG_PATH,
		},
		input_hash: createInputHash({ versioningEnabled, counts, sources, findings, issues }),
		versioning_enabled: versioningEnabled,
		counts,
		sources,
		findings,
		issues,
	};
}
