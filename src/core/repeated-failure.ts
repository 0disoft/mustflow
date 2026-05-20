import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { writeJsonFileInsideWithoutSymlinks } from './safe-filesystem.js';

export interface VerificationFailureFingerprint {
	readonly schema_version: '1';
	readonly fingerprint: string;
	readonly verification_plan_id: string;
	readonly failed_intents_hash: string;
	readonly exit_code_classes_hash: string;
	readonly timeout_flags_hash: string;
	readonly error_kinds_hash: string;
	readonly diagnostic_hash: string;
	readonly risk_codes_hash: string;
	readonly affected_surfaces_hash: string;
	readonly command_fingerprints_hash: string;
}

export interface RepeatedFailureSummary {
	readonly schema_version: '1';
	readonly fingerprint: string;
	readonly verification_plan_id: string;
	readonly status: string;
	readonly failed_intents_hash: string;
	readonly risk_codes_hash: string;
	readonly affected_surfaces_hash: string;
	readonly first_seen_at: string;
	readonly last_seen_at: string;
	readonly seen_count: number;
	readonly requires_new_evidence: boolean;
}

interface RepeatedFailureState {
	readonly schema_version: '1';
	readonly fingerprints: readonly RepeatedFailureSummary[];
}

export interface VerificationFailureFingerprintInput {
	readonly verificationPlanId: string;
	readonly failedIntents: readonly string[];
	readonly exitCodeClasses: readonly string[];
	readonly timeoutFlags: readonly boolean[];
	readonly errorKinds: readonly string[];
	readonly riskCodes: readonly string[];
	readonly affectedSurfaces: readonly string[];
	readonly commandFingerprints: readonly string[];
}

export type RepeatedFailureRiskCode =
	| 'repeated_verification_failure'
	| 'no_new_evidence_since_previous_failure'
	| 'repeated_failure_requires_new_evidence';

export interface RepeatedFailureRisk {
	readonly code: RepeatedFailureRiskCode;
	readonly severity: 'high';
	readonly verdict_effect: 'contradiction' | 'blocker';
	readonly detail: string;
	readonly previous_status: string;
	readonly verification_plan_id: string;
	readonly failure_fingerprint: string;
	readonly failed_intents_hash: string;
	readonly risk_codes_hash: string;
	readonly affected_surfaces_hash: string;
}

export interface RepeatedFailureRiskInput {
	readonly previousFailureFingerprint: VerificationFailureFingerprint | null;
	readonly previousStatus: string | null;
	readonly currentFailureFingerprint: VerificationFailureFingerprint | null;
	readonly currentStatus: string;
	readonly currentSummary?: RepeatedFailureSummary | null;
}

export const REPEATED_FAILURE_STATE_PATH = '.mustflow/state/repeated-failures.json';
export const REPEATED_FAILURE_STATE_LIMIT = 50;

const UNRESOLVED_VERIFY_STATUSES = new Set(['failed', 'blocked', 'partial']);

function sha256Json(value: unknown): string {
	return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function normalizeStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((value) => value.trim()).filter((value) => value.length > 0))].sort((left, right) =>
		left.localeCompare(right),
	);
}

function hashStrings(values: readonly string[]): string {
	return sha256Json(normalizeStrings(values));
}

function hashBooleans(values: readonly boolean[]): string {
	return sha256Json([...new Set(values)].sort((left, right) => Number(left) - Number(right)));
}

function isString(value: unknown): value is string {
	return typeof value === 'string' && value.length > 0;
}

function isRepeatedFailureSummary(value: unknown): value is RepeatedFailureSummary {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return false;
	}

	const record = value as Record<string, unknown>;
	return (
		record.schema_version === '1' &&
		isString(record.fingerprint) &&
		isString(record.verification_plan_id) &&
		isString(record.status) &&
		isString(record.failed_intents_hash) &&
		isString(record.risk_codes_hash) &&
		isString(record.affected_surfaces_hash) &&
		isString(record.first_seen_at) &&
		isString(record.last_seen_at) &&
		typeof record.seen_count === 'number' &&
		Number.isInteger(record.seen_count) &&
		record.seen_count > 0 &&
		typeof record.requires_new_evidence === 'boolean'
	);
}

function repeatedFailureStatePath(projectRoot: string): string {
	return path.join(projectRoot, ...REPEATED_FAILURE_STATE_PATH.split('/'));
}

function readRepeatedFailureState(projectRoot: string): RepeatedFailureState {
	const statePath = repeatedFailureStatePath(projectRoot);

	if (!existsSync(statePath)) {
		return { schema_version: '1', fingerprints: [] };
	}

	try {
		const parsed = JSON.parse(readFileSync(statePath, 'utf8')) as Record<string, unknown>;
		const fingerprints = Array.isArray(parsed.fingerprints)
			? parsed.fingerprints.filter(isRepeatedFailureSummary)
			: [];
		return { schema_version: '1', fingerprints };
	} catch {
		return { schema_version: '1', fingerprints: [] };
	}
}

function writeRepeatedFailureState(projectRoot: string, state: RepeatedFailureState): void {
	const statePath = repeatedFailureStatePath(projectRoot);
	writeJsonFileInsideWithoutSymlinks(projectRoot, statePath, state);
}

export function createVerificationFailureFingerprint(
	input: VerificationFailureFingerprintInput,
): VerificationFailureFingerprint | null {
	const failedIntents = normalizeStrings(input.failedIntents);
	const riskCodes = normalizeStrings(input.riskCodes);

	if (failedIntents.length === 0 && riskCodes.length === 0) {
		return null;
	}

	const exitCodeClasses = normalizeStrings(input.exitCodeClasses);
	const timeoutFlags = [...new Set(input.timeoutFlags)].sort((left, right) => Number(left) - Number(right));
	const errorKinds = normalizeStrings(input.errorKinds);
	const affectedSurfaces = normalizeStrings(input.affectedSurfaces);
	const commandFingerprints = normalizeStrings(input.commandFingerprints);
	const diagnosticSignals = {
		exit_code_classes: exitCodeClasses,
		timeout_flags: timeoutFlags,
		error_kinds: errorKinds,
	};
	const fingerprintSource = {
		schema_version: '1',
		verification_plan_id: input.verificationPlanId,
		failed_intents: failedIntents,
		diagnostic_signals: diagnosticSignals,
		risk_codes: riskCodes,
		affected_surfaces: affectedSurfaces,
		command_fingerprints: commandFingerprints,
	};

	return {
		schema_version: '1',
		fingerprint: sha256Json(fingerprintSource),
		verification_plan_id: input.verificationPlanId,
		failed_intents_hash: hashStrings(failedIntents),
		exit_code_classes_hash: hashStrings(exitCodeClasses),
		timeout_flags_hash: hashBooleans(timeoutFlags),
		error_kinds_hash: hashStrings(errorKinds),
		diagnostic_hash: sha256Json(diagnosticSignals),
		risk_codes_hash: hashStrings(riskCodes),
		affected_surfaces_hash: hashStrings(affectedSurfaces),
		command_fingerprints_hash: hashStrings(commandFingerprints),
	};
}

export function updateRepeatedFailureState(input: {
	readonly projectRoot: string;
	readonly failureFingerprint: VerificationFailureFingerprint | null;
	readonly status: string;
	readonly observedAt?: Date;
}): RepeatedFailureSummary | null {
	const failureFingerprint = input.failureFingerprint;

	if (!failureFingerprint) {
		return null;
	}

	const state = readRepeatedFailureState(input.projectRoot);
	const observedAt = (input.observedAt ?? new Date()).toISOString();
	const existing = state.fingerprints.find((entry) => entry.fingerprint === failureFingerprint.fingerprint);
	const seenCount = (existing?.seen_count ?? 0) + 1;
	const summary: RepeatedFailureSummary = {
		schema_version: '1',
		fingerprint: failureFingerprint.fingerprint,
		verification_plan_id: failureFingerprint.verification_plan_id,
		status: input.status,
		failed_intents_hash: failureFingerprint.failed_intents_hash,
		risk_codes_hash: failureFingerprint.risk_codes_hash,
		affected_surfaces_hash: failureFingerprint.affected_surfaces_hash,
		first_seen_at: existing?.first_seen_at ?? observedAt,
		last_seen_at: observedAt,
		seen_count: seenCount,
		requires_new_evidence: UNRESOLVED_VERIFY_STATUSES.has(input.status) && seenCount >= 2,
	};
	const nextFingerprints = [summary, ...state.fingerprints.filter((entry) => entry.fingerprint !== summary.fingerprint)]
		.sort((left, right) => right.last_seen_at.localeCompare(left.last_seen_at))
		.slice(0, REPEATED_FAILURE_STATE_LIMIT);

	writeRepeatedFailureState(input.projectRoot, {
		schema_version: '1',
		fingerprints: nextFingerprints,
	});

	return summary;
}

function createRepeatedFailureRisk(
	code: RepeatedFailureRiskCode,
	currentFingerprint: VerificationFailureFingerprint,
	previousStatus: string,
): RepeatedFailureRisk {
	const detail =
		code === 'repeated_verification_failure'
			? 'The previous verify summary has the same failure fingerprint and an unresolved status; provide new evidence or a narrower hypothesis before marking the task complete.'
			: code === 'no_new_evidence_since_previous_failure'
				? 'The previous verify summary has the same plan, failed-intent hash, and affected-surface hash; provide new source or reproduction evidence before treating the next completion claim as verifiable.'
				: 'The same unresolved failure fingerprint has repeated three or more times; new evidence is required before another completion claim can be treated as verifiable.';

	return {
		code,
		severity: 'high',
		verdict_effect: code === 'repeated_verification_failure' ? 'contradiction' : 'blocker',
		previous_status: previousStatus,
		verification_plan_id: currentFingerprint.verification_plan_id,
		failure_fingerprint: currentFingerprint.fingerprint,
		failed_intents_hash: currentFingerprint.failed_intents_hash,
		risk_codes_hash: currentFingerprint.risk_codes_hash,
		affected_surfaces_hash: currentFingerprint.affected_surfaces_hash,
		detail,
	};
}

export function createRepeatedFailureRisks(input: RepeatedFailureRiskInput): readonly RepeatedFailureRisk[] {
	const currentFingerprint = input.currentFailureFingerprint;

	if (
		input.previousFailureFingerprint === null ||
		input.previousStatus === null ||
		currentFingerprint === null ||
		!UNRESOLVED_VERIFY_STATUSES.has(input.previousStatus) ||
		!UNRESOLVED_VERIFY_STATUSES.has(input.currentStatus)
	) {
		return [];
	}

	const risks: RepeatedFailureRisk[] = [];
	const previousFingerprint = input.previousFailureFingerprint;
	const sameFingerprint = previousFingerprint.fingerprint === currentFingerprint.fingerprint;
	const samePlanAndNoNewSourceEvidence =
		previousFingerprint.verification_plan_id === currentFingerprint.verification_plan_id &&
		previousFingerprint.failed_intents_hash === currentFingerprint.failed_intents_hash &&
		previousFingerprint.affected_surfaces_hash === currentFingerprint.affected_surfaces_hash;

	if (sameFingerprint) {
		risks.push(createRepeatedFailureRisk('repeated_verification_failure', currentFingerprint, input.previousStatus));
	}

	if (samePlanAndNoNewSourceEvidence && !sameFingerprint) {
		risks.push(createRepeatedFailureRisk('no_new_evidence_since_previous_failure', currentFingerprint, input.previousStatus));
	}

	if ((input.currentSummary?.seen_count ?? 0) >= 3 && input.currentSummary?.requires_new_evidence === true) {
		risks.push(createRepeatedFailureRisk('repeated_failure_requires_new_evidence', currentFingerprint, input.previousStatus));
	}

	return risks;
}
