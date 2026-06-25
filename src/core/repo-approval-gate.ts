import { createHash } from 'node:crypto';
import path from 'node:path';

import {
	isRecord,
	MUSTFLOW_CONFIG_RELATIVE_PATH,
	readMustflowConfigIfExists,
	readStringArray,
	type TomlTable,
} from './config-loading.js';
import type { ScriptCheckFinding, ScriptCheckStatus } from './script-check-result.js';

export const REPO_APPROVAL_GATE_PACK_ID = 'repo';
export const REPO_APPROVAL_GATE_SCRIPT_ID = 'approval-gate';
export const REPO_APPROVAL_GATE_SCRIPT_REF = `${REPO_APPROVAL_GATE_PACK_ID}/${REPO_APPROVAL_GATE_SCRIPT_ID}`;
export const REPO_APPROVAL_GATE_POLICY_PATH = MUSTFLOW_CONFIG_RELATIVE_PATH;

export type RepoApprovalGateFindingCode = 'approval_required_for_action';

export interface RepoApprovalGateInput {
	readonly action_types: readonly string[];
	readonly policy_path: typeof REPO_APPROVAL_GATE_POLICY_PATH;
}

export interface RepoApprovalGatePolicy {
	readonly required_for: readonly string[];
	readonly on_required: string | null;
}

export interface RepoApprovalGateDecision {
	readonly action_type: string;
	readonly approval_required: boolean;
	readonly policy_source: string | null;
	readonly reason: string;
}

export interface RepoApprovalGateFinding extends ScriptCheckFinding {
	readonly code: RepoApprovalGateFindingCode;
	readonly path: typeof REPO_APPROVAL_GATE_POLICY_PATH;
}

export interface RepoApprovalGateReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof REPO_APPROVAL_GATE_PACK_ID;
	readonly script_id: typeof REPO_APPROVAL_GATE_SCRIPT_ID;
	readonly script_ref: typeof REPO_APPROVAL_GATE_SCRIPT_REF;
	readonly action: 'check';
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly input: RepoApprovalGateInput;
	readonly input_hash: string;
	readonly approval_required: boolean;
	readonly policy: RepoApprovalGatePolicy;
	readonly decisions: readonly RepoApprovalGateDecision[];
	readonly findings: readonly RepoApprovalGateFinding[];
	readonly issues: readonly string[];
}

function sha256(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function uniqueActions(actions: readonly string[]): readonly string[] {
	const normalized: string[] = [];
	const seen = new Set<string>();

	for (const action of actions) {
		const trimmed = action.trim();
		if (trimmed.length === 0 || seen.has(trimmed)) {
			continue;
		}

		seen.add(trimmed);
		normalized.push(trimmed);
	}

	return normalized;
}

function readApprovalPolicy(projectRoot: string, issues: string[]): RepoApprovalGatePolicy {
	let config: TomlTable | undefined;
	try {
		config = readMustflowConfigIfExists(projectRoot);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		issues.push(`Could not read ${REPO_APPROVAL_GATE_POLICY_PATH}: ${message}`);
	}

	if (!config) {
		issues.push(`${REPO_APPROVAL_GATE_POLICY_PATH} is missing.`);
		return { required_for: [], on_required: null };
	}

	if (!isRecord(config.approval)) {
		issues.push(`[approval] in ${REPO_APPROVAL_GATE_POLICY_PATH} must be a TOML table.`);
		return { required_for: [], on_required: null };
	}

	const approval = config.approval;
	const requiredFor = readStringArray(approval, 'required_for');
	if (!requiredFor) {
		issues.push(`[approval].required_for in ${REPO_APPROVAL_GATE_POLICY_PATH} must be a string array.`);
	}

	const onRequired = approval.on_required;
	if (onRequired !== undefined && typeof onRequired !== 'string') {
		issues.push(`[approval].on_required in ${REPO_APPROVAL_GATE_POLICY_PATH} must be a string.`);
	}

	return {
		required_for: requiredFor ?? [],
		on_required: typeof onRequired === 'string' ? onRequired : null,
	};
}

function createDecisions(
	actionTypes: readonly string[],
	policy: RepoApprovalGatePolicy,
): readonly RepoApprovalGateDecision[] {
	const required = new Set(policy.required_for);

	return actionTypes.map((actionType) => {
		const approvalRequired = required.has(actionType);
		return {
			action_type: actionType,
			approval_required: approvalRequired,
			policy_source: approvalRequired ? `${REPO_APPROVAL_GATE_POLICY_PATH}#[approval].required_for` : null,
			reason: approvalRequired
				? `Action "${actionType}" is listed in [approval].required_for.`
				: `Action "${actionType}" is not listed in [approval].required_for.`,
		};
	});
}

function createFindings(decisions: readonly RepoApprovalGateDecision[]): readonly RepoApprovalGateFinding[] {
	return decisions
		.filter((decision) => decision.approval_required)
		.map((decision) => ({
			code: 'approval_required_for_action',
			severity: 'high',
			path: REPO_APPROVAL_GATE_POLICY_PATH,
			message: `Action "${decision.action_type}" requires explicit approval before proceeding.`,
			json_pointer: '/approval/required_for',
			metric: null,
			actual: null,
			expected: null,
		}));
}

function createInputHash(reportInput: {
	readonly actionTypes: readonly string[];
	readonly policy: RepoApprovalGatePolicy;
	readonly decisions: readonly RepoApprovalGateDecision[];
	readonly findings: readonly RepoApprovalGateFinding[];
	readonly issues: readonly string[];
}): string {
	return sha256(JSON.stringify(reportInput));
}

export function checkRepoApprovalGate(
	projectRoot: string,
	actionTypes: readonly string[],
): RepoApprovalGateReport {
	const root = path.resolve(projectRoot);
	const actions = uniqueActions(actionTypes);
	const issues: string[] = [];
	const policy = readApprovalPolicy(root, issues);
	const decisions = issues.length > 0 ? [] : createDecisions(actions, policy);
	const findings = createFindings(decisions);
	const approvalRequired = findings.length > 0;
	const status: ScriptCheckStatus = issues.length > 0 ? 'error' : approvalRequired ? 'failed' : 'passed';

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: REPO_APPROVAL_GATE_PACK_ID,
		script_id: REPO_APPROVAL_GATE_SCRIPT_ID,
		script_ref: REPO_APPROVAL_GATE_SCRIPT_REF,
		action: 'check',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		input: {
			action_types: actions,
			policy_path: REPO_APPROVAL_GATE_POLICY_PATH,
		},
		input_hash: createInputHash({ actionTypes: actions, policy, decisions, findings, issues }),
		approval_required: approvalRequired,
		policy,
		decisions,
		findings,
		issues,
	};
}
