import { createHash } from 'node:crypto';

import type { ChangeVerificationReport } from './change-verification.js';
import type { CommandContract } from './config-loading.js';

function hashTextSha256(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function stableJson(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((entry) => stableJson(entry)).join(',')}]`;
	}

	if (value && typeof value === 'object') {
		const record = value as Record<string, unknown>;
		return `{${Object.keys(record)
			.sort((left, right) => left.localeCompare(right))
			.map((key) => `${JSON.stringify(key)}:${stableJson(record[key])}`)
			.join(',')}}`;
	}

	return JSON.stringify(value) ?? 'null';
}

function getCandidateIntentNames(report: ChangeVerificationReport): string[] {
	return [...new Set(report.candidates.map((candidate) => candidate.intent).filter((intent): intent is string => Boolean(intent)))]
		.sort((left, right) => left.localeCompare(right));
}

function stableSchedule(report: ChangeVerificationReport): unknown {
	return {
		runner: report.schedule.runner,
		failurePolicy: report.schedule.failurePolicy,
		batches: report.schedule.batches,
		entries: report.schedule.entries.map((entry) => ({
			intent: entry.intent,
			status: entry.status,
			effects: entry.effects,
			locks: entry.locks,
			conflicts: entry.conflicts,
		})),
	};
}

export function createVerificationPlanId(report: ChangeVerificationReport, contract: CommandContract): string {
	const relatedIntents = Object.fromEntries(
		getCandidateIntentNames(report).map((intent) => [intent, contract.intents[intent] ?? null]),
	);
	const fingerprintSource = {
		schema_version: '1',
		algorithm: 'mustflow.verify_plan_id.v1',
		report: {
			source: report.source,
			files: report.files,
			classification_summary: report.classification_summary,
			requirements: report.requirements,
			candidates: report.candidates,
			gaps: report.gaps,
			schedule: stableSchedule(report),
			test_selection: report.test_selection,
		},
		command_contract: {
			defaults: contract.defaults,
			resources: contract.resources,
			intents: relatedIntents,
		},
	};

	return hashTextSha256(stableJson(fingerprintSource));
}
