import type { RunReceipt } from '../../../core/run-receipt.js';

export type VerificationResultStatus =
	| 'passed'
	| 'failed'
	| 'timed_out'
	| 'start_failed'
	| 'output_limit_exceeded'
	| 'skipped';

export type VerificationReceipt = Record<string, unknown> & {
	readonly status?: RunReceipt['status'];
	readonly write_drift?: RunReceipt['write_drift'];
	readonly performance?: RunReceipt['performance'];
	readonly receipt_path?: string;
	readonly verification_plan_id?: string;
	readonly head_tree_hash?: string;
	readonly changed_files_hash?: string;
	readonly current_state_hash?: string;
};

export interface VerificationResult {
	readonly intent: string | null;
	readonly status: VerificationResultStatus;
	readonly skipped: boolean;
	readonly reason: string | null;
	readonly detail: string | null;
	readonly exit_code: number | null;
	readonly verification_plan_id: string | null;
	readonly receipt_path: string | null;
	readonly receipt_sha256: string | null;
	readonly receipt: VerificationReceipt | null;
}

export interface VerificationSummary {
	readonly matched: number;
	readonly ran: number;
	readonly passed: number;
	readonly failed: number;
	readonly skipped: number;
}
