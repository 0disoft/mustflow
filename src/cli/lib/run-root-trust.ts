import { MANIFEST_LOCK_RELATIVE_PATH, readManifestLock } from './manifest-lock.js';

export const ALLOW_UNTRUSTED_ROOT_OPTION = '--allow-untrusted-root';

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
	const readResult = readManifestLock(projectRoot);

	if (readResult.kind === 'present') {
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
