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
