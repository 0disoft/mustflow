import { createChangeClassificationReport } from './change-classification.js';
import {
	createChangeVerificationReport,
	type ChangeVerificationCandidate,
	type VerificationRequirement,
} from './change-verification.js';
import type { CommandContract } from './config-loading.js';

export const DASHBOARD_VERIFICATION_MAX_FILE_MATCHES = 8;

export interface DashboardVerificationIntent {
	readonly name: string;
	readonly runnable: boolean;
}

export interface DashboardVerificationRecommendation {
	readonly intent: string;
	readonly command: string;
	readonly reason_key: string;
	readonly files: readonly string[];
	readonly runnable: boolean;
}

export interface DashboardSkippedVerification {
	readonly intent: string;
	readonly reason_key: string;
}

export interface DashboardVerificationSnapshot {
	readonly changed_files: readonly string[];
	readonly surfaces: readonly string[];
	readonly recommendations: readonly DashboardVerificationRecommendation[];
	readonly skipped: readonly DashboardSkippedVerification[];
}

function toPosixChangedFiles(
	changedFiles: readonly string[],
	manifestChangedFiles: readonly string[],
	manifestMissingFiles: readonly string[],
): string[] {
	return [
		...new Set(
			[...changedFiles, ...manifestChangedFiles, ...manifestMissingFiles].map((filePath) => filePath.replaceAll('\\', '/')),
		),
	].sort((left, right) => left.localeCompare(right));
}

function uniqueLimitedFiles(left: readonly string[], right: readonly string[]): string[] {
	return [...new Set([...left, ...right])].slice(0, DASHBOARD_VERIFICATION_MAX_FILE_MATCHES);
}

function verificationReasonKey(requirement: VerificationRequirement): string {
	if (requirement.reason === 'mustflow_config_change' || requirement.reason === 'mustflow_docs_change') {
		return 'dashboard.verification.reason.mustflow';
	}

	if (requirement.reason === 'docs_change' || requirement.reason === 'copy_change' || requirement.reason === 'i18n_change') {
		return 'dashboard.verification.reason.docs';
	}

	if (
		requirement.reason === 'package_metadata_change' ||
		requirement.reason === 'template_version_change' ||
		requirement.reason === 'packaging_change' ||
		requirement.reason === 'release_risk'
	) {
		return 'dashboard.verification.reason.release';
	}

	if (
		requirement.reason === 'code_change' ||
		requirement.reason === 'test_change' ||
		requirement.reason === 'public_api_change'
	) {
		return 'dashboard.verification.reason.code';
	}

	return 'dashboard.verification.reason.fallback';
}

function requirementFiles(requirement: VerificationRequirement, allChangedFiles: readonly string[]): string[] {
	return (requirement.files.length > 0 ? requirement.files : allChangedFiles).slice(
		0,
		DASHBOARD_VERIFICATION_MAX_FILE_MATCHES,
	);
}

function addDashboardRecommendation(
	recommendations: DashboardVerificationRecommendation[],
	commandByName: ReadonlyMap<string, DashboardVerificationIntent>,
	intent: string,
	reasonKey: string,
	files: readonly string[],
): void {
	const existingIndex = recommendations.findIndex((item) => item.intent === intent);
	if (existingIndex >= 0) {
		const existing = recommendations[existingIndex];
		recommendations[existingIndex] = {
			...existing,
			files: uniqueLimitedFiles(existing.files, files),
		};
		return;
	}

	const command = commandByName.get(intent);
	recommendations.push({
		intent,
		command: `mf run ${intent}`,
		reason_key: reasonKey,
		files: files.slice(0, DASHBOARD_VERIFICATION_MAX_FILE_MATCHES),
		runnable: command?.runnable ?? false,
	});
}

function addSkippedCandidate(
	skipped: DashboardSkippedVerification[],
	candidate: ChangeVerificationCandidate,
): void {
	if (!candidate.intent || skipped.some((item) => item.intent === candidate.intent)) {
		return;
	}

	skipped.push({
		intent: candidate.intent,
		reason_key: 'dashboard.verification.skip.notRunnable',
	});
}

function createEmptyDashboardVerificationSnapshot(changedFiles: readonly string[]): DashboardVerificationSnapshot {
	return {
		changed_files: changedFiles,
		surfaces: [],
		recommendations: [],
		skipped: [],
	};
}

export function createDashboardVerificationSnapshot(
	rawCommandContract: CommandContract | null,
	commandIntents: readonly DashboardVerificationIntent[],
	changedFiles: readonly string[],
	manifestChangedFiles: readonly string[],
	manifestMissingFiles: readonly string[],
): DashboardVerificationSnapshot {
	const allChangedFiles = toPosixChangedFiles(changedFiles, manifestChangedFiles, manifestMissingFiles);

	if (!rawCommandContract || allChangedFiles.length === 0) {
		return createEmptyDashboardVerificationSnapshot(allChangedFiles);
	}

	const classificationReport = createChangeClassificationReport('changed', allChangedFiles);
	const verificationReport = createChangeVerificationReport(classificationReport, rawCommandContract);
	const commandByName = new Map(commandIntents.map((intent) => [intent.name, intent]));
	const recommendations: DashboardVerificationRecommendation[] = [];
	const skipped: DashboardSkippedVerification[] = [];
	const requirementByReason = new Map(verificationReport.requirements.map((requirement) => [requirement.reason, requirement]));

	for (const candidate of verificationReport.candidates) {
		const requirement = requirementByReason.get(candidate.reason);
		if (!requirement) {
			continue;
		}

		if (candidate.status === 'runnable' && candidate.intent) {
			addDashboardRecommendation(
				recommendations,
				commandByName,
				candidate.intent,
				verificationReasonKey(requirement),
				requirementFiles(requirement, allChangedFiles),
			);
			continue;
		}

		addSkippedCandidate(skipped, candidate);
	}

	return {
		changed_files: verificationReport.files,
		surfaces: [...new Set(verificationReport.requirements.flatMap((requirement) => requirement.surfaces))].sort((left, right) =>
			left.localeCompare(right),
		),
		recommendations,
		skipped,
	};
}
