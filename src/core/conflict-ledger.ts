import { createHash } from 'node:crypto';

import type { CompletionVerdict } from './completion-verdict.js';

export type ConflictLedgerStatus = 'clear' | 'open';
export type ConflictLedgerItemKind = 'blocker' | 'contradiction' | 'verification_gap' | 'remaining_risk';
export type ConflictLedgerSeverity = 'info' | 'warning' | 'error' | 'critical';
export type ConflictLedgerSourceKind = 'completion_verdict' | 'verification_gap' | 'remaining_risk';
export type ConflictLedgerAuthority = 'verdict' | 'verification_plan' | 'evidence_model';

export interface ConflictLedgerSource {
	readonly kind: ConflictLedgerSourceKind;
	readonly authority: ConflictLedgerAuthority;
	readonly key: string | null;
	readonly paths: readonly string[];
	readonly surfaces: readonly string[];
}

export interface ConflictLedgerItem {
	readonly id: string;
	readonly kind: ConflictLedgerItemKind;
	readonly status: 'open';
	readonly severity: ConflictLedgerSeverity;
	readonly summary: string;
	readonly detail: string;
	readonly sources: readonly ConflictLedgerSource[];
	readonly affected_paths: readonly string[];
	readonly affected_surfaces: readonly string[];
	readonly blocks_completion: boolean;
	readonly resolution: string;
	readonly owner: 'user_or_maintainer';
	readonly expires_at: null;
}

export interface ConflictLedger {
	readonly schema_version: '1';
	readonly source: 'verification_evidence_model';
	readonly status: ConflictLedgerStatus;
	readonly item_count: number;
	readonly blocking_count: number;
	readonly contradiction_count: number;
	readonly items: readonly ConflictLedgerItem[];
}

export interface ConflictLedgerGapInput {
	readonly reason: string | null;
	readonly intent: string | null;
	readonly status: string | null;
	readonly detail: string | null;
	readonly files: readonly string[];
	readonly surfaces: readonly string[];
}

export interface ConflictLedgerRemainingRiskInput {
	readonly code: string;
	readonly severity: string;
	readonly detail: string;
}

export interface CreateConflictLedgerInput {
	readonly verdict: CompletionVerdict;
	readonly gaps: readonly ConflictLedgerGapInput[];
	readonly remainingRisks: readonly ConflictLedgerRemainingRiskInput[];
}

function hashConflictIdentity(value: unknown): string {
	return `conflict:${createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 16)}`;
}

function uniqueSorted(values: Iterable<string | null | undefined>): readonly string[] {
	return [...new Set([...values].filter((value): value is string => typeof value === 'string' && value.length > 0))].sort(
		(left, right) => left.localeCompare(right),
	);
}

function remainingRiskSeverity(severity: string): ConflictLedgerSeverity {
	if (severity === 'critical') {
		return 'critical';
	}
	if (severity === 'high' || severity === 'error') {
		return 'error';
	}
	if (severity === 'medium' || severity === 'warning') {
		return 'warning';
	}
	return 'info';
}

function createConflictItem(input: Omit<ConflictLedgerItem, 'id' | 'status' | 'owner' | 'expires_at'>): ConflictLedgerItem {
	return {
		id: hashConflictIdentity({
			kind: input.kind,
			summary: input.summary,
			detail: input.detail,
			sources: input.sources,
		}),
		status: 'open',
		owner: 'user_or_maintainer',
		expires_at: null,
		...input,
	};
}

function verdictItem(kind: 'blocker' | 'contradiction', key: string): ConflictLedgerItem {
	const contradiction = kind === 'contradiction';
	return createConflictItem({
		kind,
		severity: contradiction ? 'critical' : 'error',
		summary: key,
		detail: contradiction
			? `Completion evidence is contradicted by ${key}.`
			: `Completion is blocked by ${key}.`,
		sources: [
			{
				kind: 'completion_verdict',
				authority: 'verdict',
				key,
				paths: [],
				surfaces: [],
			},
		],
		affected_paths: [],
		affected_surfaces: [],
		blocks_completion: true,
		resolution: contradiction
			? 'Resolve the contradictory evidence and rerun verification before claiming completion.'
			: 'Resolve the blocker and provide fresh verification evidence before claiming completion.',
	});
}

function gapItem(gap: ConflictLedgerGapInput): ConflictLedgerItem {
	const key = gap.reason ?? gap.intent ?? gap.status ?? 'verification_gap';
	return createConflictItem({
		kind: 'verification_gap',
		severity: 'error',
		summary: key,
		detail: gap.detail ?? 'Verification coverage is missing for this requirement.',
		sources: [
			{
				kind: 'verification_gap',
				authority: 'verification_plan',
				key,
				paths: uniqueSorted(gap.files),
				surfaces: uniqueSorted(gap.surfaces),
			},
		],
		affected_paths: uniqueSorted(gap.files),
		affected_surfaces: uniqueSorted(gap.surfaces),
		blocks_completion: true,
		resolution: 'Add or run an allowed verification intent that covers this gap, then refresh the evidence model.',
	});
}

function riskItem(risk: ConflictLedgerRemainingRiskInput): ConflictLedgerItem {
	const severity = remainingRiskSeverity(risk.severity);
	return createConflictItem({
		kind: 'remaining_risk',
		severity,
		summary: risk.code,
		detail: risk.detail,
		sources: [
			{
				kind: 'remaining_risk',
				authority: 'evidence_model',
				key: risk.code,
				paths: [],
				surfaces: [],
			},
		],
		affected_paths: [],
		affected_surfaces: [],
		blocks_completion: severity === 'error' || severity === 'critical',
		resolution: 'Review the remaining risk and attach stronger evidence or an explicit acceptance decision.',
	});
}

export function createConflictLedger(input: CreateConflictLedgerInput): ConflictLedger {
	const items = [
		...input.verdict.blockers.map((blocker) => verdictItem('blocker', blocker)),
		...input.verdict.contradictions.map((contradiction) => verdictItem('contradiction', contradiction)),
		...input.gaps.map(gapItem),
		...input.remainingRisks.map(riskItem),
	];
	const blockingCount = items.filter((item) => item.blocks_completion).length;
	const contradictionCount = items.filter((item) => item.kind === 'contradiction').length;

	return {
		schema_version: '1',
		source: 'verification_evidence_model',
		status: items.length > 0 ? 'open' : 'clear',
		item_count: items.length,
		blocking_count: blockingCount,
		contradiction_count: contradictionCount,
		items,
	};
}
