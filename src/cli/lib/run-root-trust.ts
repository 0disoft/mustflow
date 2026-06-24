import { MANIFEST_LOCK_RELATIVE_PATH, inspectManifestLock } from './manifest-lock.js';
import { readCommandContractIncludePaths } from '../../core/config-loading.js';

export const ALLOW_UNTRUSTED_ROOT_OPTION = '--allow-untrusted-root';

const REQUIRED_RUN_TRUST_LOCK_PATHS = [
	'AGENTS.md',
	'.mustflow/config/commands.toml',
] as const;

export type RunRootTrustReason =
	| 'manifest_lock_present'
	| 'manifest_lock_missing'
	| 'manifest_lock_invalid';

export interface RunRootTrustAssessment {
	readonly trusted: boolean;
	readonly reason: RunRootTrustReason;
	readonly manifestLockPath: string;
	readonly detail: string | null;
}

export function assessRunRootTrust(projectRoot: string): RunRootTrustAssessment {
	const inspection = inspectManifestLock(projectRoot);
	const { readResult } = inspection;

	if (readResult.kind === 'present') {
		if (readResult.lock.files.length === 0) {
			return {
				trusted: false,
				reason: 'manifest_lock_invalid',
				manifestLockPath: readResult.lockPath,
				detail: 'Manifest lock must track at least one file.',
			};
		}

		const trackedPaths = new Set(readResult.lock.files.map((file) => file.relativePath));
		let requiredPaths: readonly string[] = REQUIRED_RUN_TRUST_LOCK_PATHS;

		try {
			requiredPaths = [...REQUIRED_RUN_TRUST_LOCK_PATHS, ...readCommandContractIncludePaths(projectRoot)];
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return {
				trusted: false,
				reason: 'manifest_lock_invalid',
				manifestLockPath: readResult.lockPath,
				detail: message,
			};
		}

		const missingRequiredPath = requiredPaths.find((relativePath) => !trackedPaths.has(relativePath));
		if (missingRequiredPath) {
			return {
				trusted: false,
				reason: 'manifest_lock_invalid',
				manifestLockPath: readResult.lockPath,
				detail: `Manifest lock must track ${missingRequiredPath}.`,
			};
		}

		if (inspection.issues.length > 0) {
			return {
				trusted: false,
				reason: 'manifest_lock_invalid',
				manifestLockPath: readResult.lockPath,
				detail: inspection.issues[0] ?? 'Manifest lock does not match the current workflow files.',
			};
		}

		return {
			trusted: true,
			reason: 'manifest_lock_present',
			manifestLockPath: readResult.lockPath,
			detail: null,
		};
	}

	if (readResult.kind === 'invalid') {
		return {
			trusted: false,
			reason: 'manifest_lock_invalid',
			manifestLockPath: readResult.lockPath,
			detail: readResult.message,
		};
	}

	return {
		trusted: false,
		reason: 'manifest_lock_missing',
		manifestLockPath: readResult.lockPath,
		detail: MANIFEST_LOCK_RELATIVE_PATH,
	};
}
