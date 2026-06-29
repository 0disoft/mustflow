import { createHash } from 'node:crypto';

const REPO_FLOW_DOC_ID = 'repo-flow';
const REPO_FLOW_LIFECYCLE = 'generated';
const REPO_FLOW_GENERATOR = 'mustflow';
const REPO_FLOW_RELATIVE_ROOT = '.';
const REPO_FLOW_SOURCE_POLICY = 'flow_contract';
const REPO_FLOW_PRIVACY_MODE = 'minimal';

export interface RepoFlowSourceFingerprintInput {
	readonly presentInputs: readonly string[];
	readonly configuredCommandIntents: readonly string[];
	readonly configuredReadOrder: readonly string[];
	readonly configuredOptionalReadOrder: readonly string[];
	readonly generatedDocuments: readonly string[];
	readonly flowIds: readonly string[];
}

export function getRepoFlowSourceFingerprint(input: RepoFlowSourceFingerprintInput): string {
	const payload = {
		presentInputs: [...input.presentInputs].sort(),
		configuredCommandIntents: [...input.configuredCommandIntents].sort(),
		configuredReadOrder: [...input.configuredReadOrder].sort(),
		configuredOptionalReadOrder: [...input.configuredOptionalReadOrder].sort(),
		generatedDocuments: [...input.generatedDocuments].sort(),
		flowIds: [...input.flowIds].sort(),
	};
	const digest = createHash('sha256').update(JSON.stringify(payload)).digest('hex');
	return `sha256:${digest}`;
}

export function renderRepoFlowFrontmatter(flowCount: number, sourceFingerprint: string): string[] {
	return [
		'---',
		`mustflow_doc: ${REPO_FLOW_DOC_ID}`,
		`lifecycle: ${REPO_FLOW_LIFECYCLE}`,
		`generated_by: ${REPO_FLOW_GENERATOR}`,
		`relative_root: "${REPO_FLOW_RELATIVE_ROOT}"`,
		`source_policy: ${REPO_FLOW_SOURCE_POLICY}`,
		`privacy_mode: ${REPO_FLOW_PRIVACY_MODE}`,
		`flow_count: ${flowCount}`,
		'degraded: false',
		`source_fingerprint: "${sourceFingerprint}"`,
		'---',
		'',
	];
}
