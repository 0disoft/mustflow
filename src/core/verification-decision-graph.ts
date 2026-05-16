import type { PublicSurfaceUpdatePolicy } from './change-classification.js';
import {
	isRecord,
	readString,
	readStringArray,
	type CommandContract,
	type TomlTable,
} from './config-loading.js';
import type {
	VerificationRunnableStatus,
	VerificationSkipReason,
} from './verification-plan.js';
import type { VerificationSchedule } from './verification-scheduler.js';

export const VERIFICATION_DECISION_GRAPH_SCHEMA_VERSION = '1';

export type VerificationDecisionNodeKind =
	| 'changed_surface'
	| 'classification_reason'
	| 'command_candidate'
	| 'eligibility'
	| 'effect'
	| 'gap'
	| 'receipt';

export type VerificationDecisionStatus =
	| 'runnable'
	| 'skipped'
	| 'blocked'
	| 'manual_only'
	| 'unknown'
	| 'not_applicable';

export interface VerificationDecisionRequirementInput {
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly affectedContracts: readonly string[];
	readonly driftChecks: readonly string[];
	readonly updatePolicies: readonly PublicSurfaceUpdatePolicy[];
	readonly source: 'change_classification';
}

export interface VerificationDecisionCandidateInput {
	readonly reason: string;
	readonly intent: string | null;
	readonly status: VerificationRunnableStatus;
	readonly skipReason: VerificationSkipReason | null;
	readonly detail: string | null;
	readonly candidateState?: string;
	readonly eligibilityState?: string;
	readonly selectionState?: string;
}

export interface VerificationDecisionGapInput {
	readonly reason: string;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
	readonly detail: string;
}

export interface VerificationDecisionCommandEffectMetadata {
	readonly type: string | null;
	readonly mode: string | null;
	readonly path: string | null;
	readonly paths: readonly string[];
	readonly lock: string | null;
	readonly concurrency: string | null;
}

export interface VerificationDecisionCoverageHints {
	readonly reasons: readonly string[];
	readonly surfaces: readonly string[];
	readonly paths: readonly string[];
	readonly contracts: readonly string[];
}

export interface VerificationDecisionSelectionHints {
	readonly coverage_level: string | null;
	readonly coverage_confidence: string | null;
	readonly accepts_changed_files: string | null;
	readonly fallback_intents: readonly string[];
	readonly escalate_to: readonly string[];
}

export interface VerificationDecisionCostHints {
	readonly expected_seconds: number | null;
	readonly cold_start_seconds: number | null;
	readonly timeout_ratio_expectation: number | null;
	readonly cost_tier: string | null;
}

export interface VerificationDecisionRelationHints {
	readonly subsumes: readonly string[];
	readonly subsumed_by: readonly string[];
	readonly requires_with: readonly string[];
	readonly escalate_to: readonly string[];
}

export interface VerificationDecisionCommandMetadata {
	readonly status: string | null;
	readonly lifecycle: string | null;
	readonly run_policy: string | null;
	readonly stdin: string | null;
	readonly timeout_seconds: number | null;
	readonly writes: readonly string[];
	readonly effects: readonly VerificationDecisionCommandEffectMetadata[];
	readonly required_after: readonly string[];
	readonly network: boolean | null;
	readonly destructive: boolean | null;
	readonly covers: VerificationDecisionCoverageHints | null;
	readonly selection: VerificationDecisionSelectionHints | null;
	readonly cost: VerificationDecisionCostHints | null;
	readonly relations: VerificationDecisionRelationHints | null;
}

export interface VerificationDecisionGraphNode {
	readonly id: string;
	readonly kind: VerificationDecisionNodeKind;
	readonly label: string;
	readonly status: VerificationDecisionStatus | null;
	readonly reason: string | null;
	readonly intent: string | null;
	readonly data: Record<string, unknown>;
}

export interface VerificationDecisionGraphEdge {
	readonly from: string;
	readonly to: string;
	readonly kind: 'supports' | 'requires' | 'evaluates' | 'has_effect' | 'has_gap';
}

export interface VerificationDecisionGraphSummary {
	readonly nodeCount: number;
	readonly edgeCount: number;
	readonly runnable: number;
	readonly skipped: number;
	readonly blocked: number;
	readonly manual_only: number;
	readonly unknown: number;
	readonly selected: number;
	readonly not_selected: number;
	readonly gapCount: number;
}

export interface VerificationDecisionGraph {
	readonly schema_version: typeof VERIFICATION_DECISION_GRAPH_SCHEMA_VERSION;
	readonly root: 'verification_decision';
	readonly summary: VerificationDecisionGraphSummary;
	readonly nodes: readonly VerificationDecisionGraphNode[];
	readonly edges: readonly VerificationDecisionGraphEdge[];
}

function stableIdPart(value: string): string {
	return value.trim().replace(/[^A-Za-z0-9_.-]+/gu, '_') || 'none';
}

function readBoolean(table: TomlTable, key: string): boolean | null {
	const value = table[key];
	return typeof value === 'boolean' ? value : null;
}

function readTimeoutSeconds(table: TomlTable): number | null {
	const value = table.timeout_seconds;
	return Number.isInteger(value) ? Number(value) : null;
}

function readCommandEffects(rawIntent: TomlTable): VerificationDecisionCommandEffectMetadata[] {
	const effects = rawIntent.effects;

	if (!Array.isArray(effects)) {
		return [];
	}

	return effects.filter(isRecord).map((effect) => ({
		type: readString(effect, 'type') ?? null,
		mode: readString(effect, 'mode') ?? null,
		path: readString(effect, 'path') ?? null,
		paths: readStringArray(effect, 'paths') ?? [],
		lock: readString(effect, 'lock') ?? null,
		concurrency: readString(effect, 'concurrency') ?? null,
	}));
}

function readNonNegativeNumber(table: TomlTable, key: string): number | null {
	const value = table[key];
	return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
}

function readNonNegativeInteger(table: TomlTable, key: string): number | null {
	const value = table[key];
	return Number.isInteger(value) && Number(value) >= 0 ? Number(value) : null;
}

function readCoverageHints(rawIntent: TomlTable): VerificationDecisionCoverageHints | null {
	const covers = rawIntent.covers;
	if (!isRecord(covers)) {
		return null;
	}

	return {
		reasons: readStringArray(covers, 'reasons') ?? [],
		surfaces: readStringArray(covers, 'surfaces') ?? [],
		paths: readStringArray(covers, 'paths') ?? [],
		contracts: readStringArray(covers, 'contracts') ?? [],
	};
}

function readSelectionHints(rawIntent: TomlTable): VerificationDecisionSelectionHints | null {
	const selection = rawIntent.selection;
	if (!isRecord(selection)) {
		return null;
	}

	return {
		coverage_level: readString(selection, 'coverage_level') ?? null,
		coverage_confidence: readString(selection, 'coverage_confidence') ?? null,
		accepts_changed_files: readString(selection, 'accepts_changed_files') ?? null,
		fallback_intents: readStringArray(selection, 'fallback_intents') ?? [],
		escalate_to: readStringArray(selection, 'escalate_to') ?? [],
	};
}

function readCostHints(rawIntent: TomlTable): VerificationDecisionCostHints | null {
	const cost = rawIntent.cost;
	if (!isRecord(cost)) {
		return null;
	}

	return {
		expected_seconds: readNonNegativeInteger(cost, 'expected_seconds'),
		cold_start_seconds: readNonNegativeInteger(cost, 'cold_start_seconds'),
		timeout_ratio_expectation: readNonNegativeNumber(cost, 'timeout_ratio_expectation'),
		cost_tier: readString(cost, 'cost_tier') ?? null,
	};
}

function readRelationHints(rawIntent: TomlTable): VerificationDecisionRelationHints | null {
	const relations = rawIntent.relations;
	if (!isRecord(relations)) {
		return null;
	}

	return {
		subsumes: readStringArray(relations, 'subsumes') ?? [],
		subsumed_by: readStringArray(relations, 'subsumed_by') ?? [],
		requires_with: readStringArray(relations, 'requires_with') ?? [],
		escalate_to: readStringArray(relations, 'escalate_to') ?? [],
	};
}

function readCommandMetadata(commandContract: CommandContract, intent: string | null): VerificationDecisionCommandMetadata | null {
	if (!intent) {
		return null;
	}

	const rawIntent = commandContract.intents[intent];
	if (!isRecord(rawIntent)) {
		return null;
	}

	return {
		status: readString(rawIntent, 'status') ?? null,
		lifecycle: readString(rawIntent, 'lifecycle') ?? null,
		run_policy: readString(rawIntent, 'run_policy') ?? null,
		stdin: readString(rawIntent, 'stdin') ?? null,
		timeout_seconds: readTimeoutSeconds(rawIntent),
		writes: readStringArray(rawIntent, 'writes') ?? [],
		effects: readCommandEffects(rawIntent),
		required_after: readStringArray(rawIntent, 'required_after') ?? [],
		network: readBoolean(rawIntent, 'network'),
		destructive: readBoolean(rawIntent, 'destructive'),
		covers: readCoverageHints(rawIntent),
		selection: readSelectionHints(rawIntent),
		cost: readCostHints(rawIntent),
		relations: readRelationHints(rawIntent),
	};
}

function candidateDecisionStatus(
	commandContract: CommandContract,
	candidate: VerificationDecisionCandidateInput,
): VerificationDecisionStatus {
	if (candidate.status === 'runnable') {
		return 'runnable';
	}

	if (!candidate.intent || candidate.skipReason === 'no_matching_intents') {
		return 'unknown';
	}

	const rawIntent = commandContract.intents[candidate.intent];
	if (!isRecord(rawIntent)) {
		return 'blocked';
	}

	const status = readString(rawIntent, 'status') ?? 'unknown';
	if (status === 'manual_only') {
		return 'manual_only';
	}

	if (status === 'unknown') {
		return 'unknown';
	}

	return candidate.skipReason ? 'blocked' : 'skipped';
}

function addNode(nodes: Map<string, VerificationDecisionGraphNode>, node: VerificationDecisionGraphNode): void {
	if (!nodes.has(node.id)) {
		nodes.set(node.id, node);
	}
}

function addEdge(edges: VerificationDecisionGraphEdge[], edge: VerificationDecisionGraphEdge): void {
	if (!edges.some((item) => item.from === edge.from && item.to === edge.to && item.kind === edge.kind)) {
		edges.push(edge);
	}
}

function summarize(nodes: readonly VerificationDecisionGraphNode[], edgeCount: number): VerificationDecisionGraphSummary {
	return {
		nodeCount: nodes.length,
		edgeCount,
		runnable: nodes.filter((node) => node.status === 'runnable').length,
		skipped: nodes.filter((node) => node.status === 'skipped').length,
		blocked: nodes.filter((node) => node.status === 'blocked').length,
		manual_only: nodes.filter((node) => node.status === 'manual_only').length,
		unknown: nodes.filter((node) => node.status === 'unknown').length,
		selected: nodes.filter((node) => node.kind === 'command_candidate' && node.data.selectionState === 'selected').length,
		not_selected: nodes.filter((node) => node.kind === 'command_candidate' && node.data.selectionState === 'not_selected')
			.length,
		gapCount: nodes.filter((node) => node.kind === 'gap').length,
	};
}

export function createVerificationDecisionGraph(
	commandContract: CommandContract,
	requirements: readonly VerificationDecisionRequirementInput[],
	candidates: readonly VerificationDecisionCandidateInput[],
	gaps: readonly VerificationDecisionGapInput[],
	schedule: VerificationSchedule,
): VerificationDecisionGraph {
	const nodes = new Map<string, VerificationDecisionGraphNode>();
	const edges: VerificationDecisionGraphEdge[] = [];
	const candidateNodeByReasonAndIntent = new Map<string, string[]>();

	for (const requirement of requirements) {
		const reasonNodeId = `classification_reason:${stableIdPart(requirement.reason)}`;
		addNode(nodes, {
			id: reasonNodeId,
			kind: 'classification_reason',
			label: requirement.reason,
			status: 'not_applicable',
			reason: requirement.reason,
			intent: null,
			data: {
				files: requirement.files,
				surfaces: requirement.surfaces,
				affectedContracts: requirement.affectedContracts,
				driftChecks: requirement.driftChecks,
				updatePolicies: requirement.updatePolicies,
				source: requirement.source,
			},
		});

		for (const surface of requirement.surfaces) {
			const surfaceNodeId = `changed_surface:${stableIdPart(requirement.reason)}:${stableIdPart(surface)}`;
			addNode(nodes, {
				id: surfaceNodeId,
				kind: 'changed_surface',
				label: surface,
				status: 'not_applicable',
				reason: requirement.reason,
				intent: null,
				data: {
					files: requirement.files,
				},
			});
			addEdge(edges, { from: surfaceNodeId, to: reasonNodeId, kind: 'supports' });
		}
	}

	for (const [index, candidate] of candidates.entries()) {
		const reasonNodeId = `classification_reason:${stableIdPart(candidate.reason)}`;
		const intentPart = stableIdPart(candidate.intent ?? 'missing_intent');
		const candidateNodeId = `command_candidate:${stableIdPart(candidate.reason)}:${intentPart}:${index + 1}`;
		const eligibilityNodeId = `eligibility:${stableIdPart(candidate.reason)}:${intentPart}:${index + 1}`;
		const status = candidateDecisionStatus(commandContract, candidate);
		const command = readCommandMetadata(commandContract, candidate.intent);
		const key = `${candidate.reason}\0${candidate.intent ?? ''}`;

		candidateNodeByReasonAndIntent.set(key, [...(candidateNodeByReasonAndIntent.get(key) ?? []), candidateNodeId]);
		addNode(nodes, {
			id: candidateNodeId,
			kind: 'command_candidate',
			label: candidate.intent ?? 'missing intent',
			status,
			reason: candidate.reason,
			intent: candidate.intent,
			data: {
				candidateStatus: candidate.status,
				skipReason: candidate.skipReason,
				detail: candidate.detail,
				candidateState: candidate.candidateState ?? null,
				eligibilityState: candidate.eligibilityState ?? null,
				selectionState: candidate.selectionState ?? null,
				command,
			},
		});
		addNode(nodes, {
			id: eligibilityNodeId,
			kind: 'eligibility',
			label: candidate.skipReason ?? 'ok',
			status,
			reason: candidate.reason,
			intent: candidate.intent,
			data: {
				code: candidate.skipReason ?? 'ok',
				detail: candidate.detail,
			},
		});
		addEdge(edges, { from: reasonNodeId, to: candidateNodeId, kind: 'requires' });
		addEdge(edges, { from: candidateNodeId, to: eligibilityNodeId, kind: 'evaluates' });
	}

	for (const entry of schedule.entries) {
		for (const [index, effect] of entry.effects.entries()) {
			const effectNodeId = `effect:${stableIdPart(entry.intent)}:${index + 1}`;
			addNode(nodes, {
				id: effectNodeId,
				kind: 'effect',
				label: effect.lock,
				status: 'runnable',
				reason: null,
				intent: entry.intent,
				data: {
					source: effect.source,
					access: effect.access,
					mode: effect.mode,
					path: effect.path,
					lock: effect.lock,
					concurrency: effect.concurrency,
				},
			});

			for (const [key, candidateNodeIds] of candidateNodeByReasonAndIntent.entries()) {
				if (!key.endsWith(`\0${entry.intent}`)) {
					continue;
				}

				for (const candidateNodeId of candidateNodeIds) {
					addEdge(edges, { from: candidateNodeId, to: effectNodeId, kind: 'has_effect' });
				}
			}
		}
	}

	for (const gap of gaps) {
		const reasonNodeId = `classification_reason:${stableIdPart(gap.reason)}`;
		const gapNodeId = `gap:${stableIdPart(gap.reason)}`;
		addNode(nodes, {
			id: gapNodeId,
			kind: 'gap',
			label: gap.reason,
			status: 'unknown',
			reason: gap.reason,
			intent: null,
			data: {
				files: gap.files,
				surfaces: gap.surfaces,
				detail: gap.detail,
			},
		});
		addEdge(edges, { from: reasonNodeId, to: gapNodeId, kind: 'has_gap' });
	}

	const sortedNodes = [...nodes.values()].sort((left, right) => left.id.localeCompare(right.id));
	const sortedEdges = [...edges].sort(
		(left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to) || left.kind.localeCompare(right.kind),
	);

	return {
		schema_version: VERIFICATION_DECISION_GRAPH_SCHEMA_VERSION,
		root: 'verification_decision',
		summary: summarize(sortedNodes, sortedEdges.length),
		nodes: sortedNodes,
		edges: sortedEdges,
	};
}
