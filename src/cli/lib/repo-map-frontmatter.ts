import { createHash } from 'node:crypto';

const REPO_MAP_DOC_ID = 'repo-map';
const REPO_MAP_LIFECYCLE = 'generated';
const REPO_MAP_GENERATOR = 'mustflow';
const REPO_MAP_RELATIVE_ROOT = '.';
const REPO_MAP_SOURCE_POLICY = 'anchors_only';
const REPO_MAP_PRIVACY_MODE = 'minimal';

export type RepoMapGitLsFilesStatus = 'ok' | 'timeout' | 'max_buffer' | 'error';

export interface RepoMapSourceFingerprintAnchor {
	readonly relativePath: string;
}

export interface RepoMapSourceFingerprintNestedDocument {
	readonly relativePath: string;
}

export interface RepoMapSourceFingerprintNestedCount {
	readonly name: string;
	readonly count: number;
}

export interface RepoMapSourceFingerprintSsealedScaffold {
	readonly manifestPath: string;
	readonly version?: string;
	readonly scope?: string;
	readonly profile?: string;
	readonly density?: string;
	readonly runner?: string;
	readonly fileCount: number;
	readonly fileKinds: readonly RepoMapSourceFingerprintNestedCount[];
}

export interface RepoMapSourceFingerprintNestedRepository {
	readonly relativePath: string;
	readonly mustflow: boolean;
	readonly agentRules?: string;
	readonly repoMap?: string;
	readonly mustflowConfig?: string;
	readonly commandContract?: string;
	readonly contextIndex?: string;
	readonly skillIndex?: string;
	readonly rootDocuments: readonly RepoMapSourceFingerprintNestedDocument[];
	readonly machineContracts: readonly string[];
	readonly manifests: readonly string[];
	readonly commandAdapters: readonly string[];
	readonly editingPolicies: readonly string[];
	readonly agentScaffolds?: readonly string[];
	readonly validationGuides?: readonly string[];
	readonly diagrams?: readonly string[];
	readonly githubTemplates?: readonly string[];
	readonly ssealedScaffold?: RepoMapSourceFingerprintSsealedScaffold;
}

export interface RepoMapSourceFingerprintInput {
	readonly depth: number;
	readonly includeNested: boolean;
	readonly configuredPriorityPaths: readonly string[];
	readonly gitLsFilesStatus: RepoMapGitLsFilesStatus;
	readonly anchors: readonly RepoMapSourceFingerprintAnchor[];
	readonly nestedRepositories: readonly RepoMapSourceFingerprintNestedRepository[];
}

export function getRepoMapSourceFingerprint(input: RepoMapSourceFingerprintInput): string {
	const payload = {
		depth: input.depth,
		includeNested: input.includeNested,
		gitLsFilesStatus: input.gitLsFilesStatus,
		priorityPaths: [...input.configuredPriorityPaths].sort(),
		anchors: input.anchors.map((anchor) => anchor.relativePath).sort(),
		nestedRepositories: input.nestedRepositories
			.map((repository) => ({
				relativePath: repository.relativePath,
				mustflow: repository.mustflow,
				agentRules: repository.agentRules,
				repoMap: repository.repoMap,
				mustflowConfig: repository.mustflowConfig,
				commandContract: repository.commandContract,
				contextIndex: repository.contextIndex,
				skillIndex: repository.skillIndex,
				rootDocuments: repository.rootDocuments.map((document) => document.relativePath).sort(),
				machineContracts: [...repository.machineContracts].sort(),
				manifests: [...repository.manifests].sort(),
				commandAdapters: [...repository.commandAdapters].sort(),
				editingPolicies: [...repository.editingPolicies].sort(),
				agentScaffolds: [...(repository.agentScaffolds ?? [])].sort(),
				validationGuides: [...(repository.validationGuides ?? [])].sort(),
				diagrams: [...(repository.diagrams ?? [])].sort(),
				githubTemplates: [...(repository.githubTemplates ?? [])].sort(),
				ssealedScaffold: repository.ssealedScaffold
					? {
							manifestPath: repository.ssealedScaffold.manifestPath,
							version: repository.ssealedScaffold.version,
							scope: repository.ssealedScaffold.scope,
							profile: repository.ssealedScaffold.profile,
							density: repository.ssealedScaffold.density,
							runner: repository.ssealedScaffold.runner,
							fileCount: repository.ssealedScaffold.fileCount,
							fileKinds: repository.ssealedScaffold.fileKinds
								.map((kind) => ({ name: kind.name, count: kind.count }))
								.sort((left, right) => left.name.localeCompare(right.name)),
						}
					: undefined,
			}))
			.sort((left, right) => left.relativePath.localeCompare(right.relativePath)),
	};
	const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
	return `sha256:${digest}`;
}

export function renderRepoMapFrontmatter(
	anchorCount: number,
	sourceFingerprint: string,
	gitLsFilesStatus: RepoMapGitLsFilesStatus,
): string[] {
	const degraded = gitLsFilesStatus !== 'ok';

	return [
		'---',
		`mustflow_doc: ${REPO_MAP_DOC_ID}`,
		`lifecycle: ${REPO_MAP_LIFECYCLE}`,
		`generated_by: ${REPO_MAP_GENERATOR}`,
		`relative_root: "${REPO_MAP_RELATIVE_ROOT}"`,
		`source_policy: ${REPO_MAP_SOURCE_POLICY}`,
		`privacy_mode: ${REPO_MAP_PRIVACY_MODE}`,
		`anchor_count: ${anchorCount}`,
		`degraded: ${degraded ? 'true' : 'false'}`,
		`git_ls_files_status: ${gitLsFilesStatus}`,
		`source_fingerprint: "${sourceFingerprint}"`,
		'---',
		'',
	];
}
