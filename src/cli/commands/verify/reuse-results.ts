import { createHash } from 'node:crypto';
import path from 'node:path';
import { ensureInside, readUtf8FileInsideWithoutSymlinks } from '../../../core/safe-filesystem.js';
import { objectField } from './result-analysis.js';
import type { VerificationReceipt, VerificationResult } from './result-types.js';
import { resolveLatestVerifyRunReceiptPath } from './state-paths.js';

const VERIFY_STATE_MAX_BYTES = 4 * 1024 * 1024;
const VERIFY_REUSE_MAX_BYTES = 16 * 1024 * 1024;

export function readVerifyStateText(projectRoot: string, relativePath: string, maxBytes = VERIFY_STATE_MAX_BYTES): string {
	if (path.isAbsolute(relativePath)) throw new Error('Verification state paths must be relative.');
	const absolutePath = path.resolve(projectRoot, relativePath);
	ensureInside(path.join(projectRoot, '.mustflow', 'state', 'runs'), absolutePath);
	return readUtf8FileInsideWithoutSymlinks(projectRoot, absolutePath, { maxBytes });
}

export function readReusableVerificationResults(projectRoot: string, verificationPlanId: string, currentStateHash: string | null): ReadonlyMap<string, VerificationResult> {
	const reusable = new Map<string, VerificationResult>();
	if (!currentStateHash) return reusable;
	let remainingBytes = VERIFY_REUSE_MAX_BYTES;
	const readState = (relativePath: string): string => {
		const text = readVerifyStateText(projectRoot, relativePath, Math.min(VERIFY_STATE_MAX_BYTES, remainingBytes));
		remainingBytes -= Buffer.byteLength(text, 'utf8');
		return text;
	};
	try {
		const latest = JSON.parse(readState(path.relative(projectRoot, resolveLatestVerifyRunReceiptPath(projectRoot)))) as Record<string, unknown>;
		if (latest.verification_plan_id !== verificationPlanId || typeof latest.manifest_path !== 'string') return reusable;
		const manifest = JSON.parse(readState(latest.manifest_path)) as { receipts?: Array<Record<string, unknown>> };
		for (const entry of manifest.receipts ?? []) {
			if (typeof entry.intent !== 'string' || typeof entry.receipt_path !== 'string' || entry.status !== 'passed') continue;
			const receiptContent = readState(entry.receipt_path);
			if (`sha256:${createHash('sha256').update(receiptContent).digest('hex')}` !== entry.receipt_sha256) continue;
			const receipt = JSON.parse(receiptContent) as VerificationReceipt;
			if (receipt.schema_version !== '1' || receipt.command !== 'run' || receipt.status !== 'passed' || receipt.intent !== entry.intent) continue;
			if (receipt.current_state_hash !== currentStateHash || receipt.verification_plan_id !== verificationPlanId) continue;
			const drift = objectField(receipt.write_drift);
			if (drift?.has_undeclared_changes === true) continue;
			reusable.set(entry.intent, { intent: entry.intent, status: 'passed', skipped: false, reason: 'reused_input_hash', detail: null, exit_code: 0, verification_plan_id: verificationPlanId, receipt_path: null, receipt_sha256: null, receipt });
		}
	} catch {
		// Unsafe or over-budget state is a cache miss, never verification evidence.
		reusable.clear();
	}
	return reusable;
}
