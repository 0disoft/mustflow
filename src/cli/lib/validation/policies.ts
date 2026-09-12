import { existsSync } from 'node:fs';
import path from 'node:path';
import { isRecord, type TomlTable } from '../command-contract.js';
import { readMustflowTomlFile } from '../toml.js';
import { DEFAULT_RETENTION_LIMITS, readNestedRetentionTable, readRetentionTable, resolveRetentionLimits, type RetentionLimits } from '../../../core/retention-policy.js';
import { getContractModelDefinitions, validateCandidateContractModelConfig } from '../../../core/contract-models.js';
import { FORBIDDEN_RELEASE_VERSIONING_CONTRACT_FIELDS, FORBIDDEN_VERIFICATION_SELECTION_AUTHORITY_FIELDS } from './constants.js';
import { hasOwn, pushStrictIssue } from './primitives.js';
import type { CheckIssue } from './types.js';

export function validateStrictRetentionPolicy(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): RetentionLimits {
	const retention = readRetentionTable(mustflowToml);

	if (!retention) {
		pushStrictIssue(issues, '[retention] table is required');
		return DEFAULT_RETENTION_LIMITS;
	}

	for (const tableName of ['raw_events', 'run_receipts', 'knowledge', 'context', 'repo_map']) {
		if (!readNestedRetentionTable(retention, tableName)) {
			pushStrictIssue(issues, `[retention.${tableName}] table is required`);
		}
	}

	return resolveRetentionLimits(mustflowToml);
}

export function validateStrictRefreshPolicy(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!mustflowToml || !isRecord(mustflowToml.refresh)) {
		pushStrictIssue(issues, '[refresh] table is required');
		return;
	}

	const refresh = mustflowToml.refresh;

	if (refresh.default_method !== 'hash_check') {
		pushStrictIssue(issues, '[refresh].default_method should be "hash_check" for cache-friendly refresh');
	}

	if (!Array.isArray(refresh.required_at) || !refresh.required_at.includes('before_command_run')) {
		pushStrictIssue(issues, '[refresh].required_at should include "before_command_run"');
	}

	if (!isRecord(refresh.levels)) {
		pushStrictIssue(issues, '[refresh.levels] table is required');
		return;
	}

	for (const levelName of ['light', 'command', 'skill', 'full']) {
		if (!isRecord(refresh.levels[levelName])) {
			pushStrictIssue(issues, `[refresh.levels.${levelName}] table is required`);
			continue;
		}

		const read = refresh.levels[levelName].read;
		if (!Array.isArray(read) || read.length === 0) {
			pushStrictIssue(issues, `[refresh.levels.${levelName}].read is required`);
		}
	}
}

export function validateStrictHarnessPolicy(mustflowToml: TomlTable | undefined, issues: CheckIssue[]): void {
	for (const tableName of ['harness', 'budget', 'approval', 'isolation', 'compaction']) {
		if (!mustflowToml || !isRecord(mustflowToml[tableName])) {
			pushStrictIssue(issues, `[${tableName}] table is required`);
		}
	}
}

export function validateStrictVerificationSelectionAuthority(preferencesToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!preferencesToml || !isRecord(preferencesToml.verification)) {
		return;
	}

	const selection = preferencesToml.verification.selection;
	if (!isRecord(selection)) {
		return;
	}

	for (const field of FORBIDDEN_VERIFICATION_SELECTION_AUTHORITY_FIELDS) {
		if (hasOwn(selection, field)) {
			pushStrictIssue(
				issues,
				`[preferences.verification.selection].${field} cannot define command authority; use .mustflow/config/commands.toml`,
			);
		}
	}
}

export function validateStrictCandidateContractModelConfigs(projectRoot: string, issues: CheckIssue[]): void {
	for (const model of getContractModelDefinitions()) {
		const configPath = path.join(projectRoot, ...model.filePath.split('/'));

		if (!existsSync(configPath)) {
			continue;
		}

		let parsed: unknown;
		try {
			parsed = readMustflowTomlFile(projectRoot, model.filePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushStrictIssue(issues, `Invalid TOML in ${model.filePath}: ${message}`);
			continue;
		}

		for (const issue of validateCandidateContractModelConfig(model, parsed)) {
			pushStrictIssue(issues, issue.message);
		}
	}
}

export function validateStrictReleaseVersioningAuthority(preferencesToml: TomlTable | undefined, issues: CheckIssue[]): void {
	if (!preferencesToml || !isRecord(preferencesToml.release)) {
		return;
	}

	const versioning = preferencesToml.release.versioning;
	if (!isRecord(versioning)) {
		return;
	}

	for (const field of FORBIDDEN_RELEASE_VERSIONING_CONTRACT_FIELDS) {
		if (hasOwn(versioning, field)) {
			pushStrictIssue(
				issues,
				`[preferences.release.versioning].${field} cannot define version sources or release authority; use .mustflow/config/versioning.toml or .mustflow/config/commands.toml`,
			);
		}
	}
}
