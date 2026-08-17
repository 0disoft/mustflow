// verification-receipt.mjs
//
// A verification receipt records the artifact hashes, git head, and working
// directory at the moment a related-mode verification run began. At run
// completion the receipt is finalized: if an artifact changed since the run
// started (or the git head moved), the receipt reports the staleness so the
// completion gate can refuse to treat the run as evidence for the current
// files.

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function fileSha256(filePath) {
	try {
		return createHash('sha256').update(readFileSync(filePath)).digest('hex');
	} catch {
		return null;
	}
}

export function gitHead(repoRoot) {
	const result = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: repoRoot, encoding: 'utf8' });
	return result.status === 0 ? result.stdout.trim() : null;
}

export function beginVerificationReceipt({ repoRoot, receiptPath, intent, mode, artifacts, witnesses }) {
	const receipt = {
		schema_version: '1',
		intent,
		mode,
		git_head: gitHead(repoRoot),
		cwd: repoRoot,
		created_at: new Date().toISOString(),
		artifacts: artifacts.map((artifact) => ({
			path: artifact.artifact,
			kind: artifact.kind,
			sha256: fileSha256(path.join(repoRoot, artifact.artifact)),
		})),
		witnesses: [...witnesses],
		exit_code: null,
		finished_at: null,
	};

	mkdirSync(path.dirname(receiptPath), { recursive: true });
	writeFileSync(receiptPath, `${JSON.stringify(receipt, null, 2)}\n`);
	return receiptPath;
}

// Returns { stale: [...] } when an artifact changed or the git head moved
// since the receipt was begun; otherwise returns { stale: [] } and records
// the exit code.
export function finalizeVerificationReceipt({ repoRoot, receiptPath, exitCode }) {
	let receipt;
	try {
		receipt = JSON.parse(readFileSync(receiptPath, 'utf8'));
	} catch {
		return { stale: [] };
	}

	const stale = [];
	for (const artifact of receipt.artifacts ?? []) {
		const current = fileSha256(path.join(repoRoot, artifact.path));
		if (current !== artifact.sha256) {
			stale.push(artifact.path);
		}
	}

	const head = gitHead(repoRoot);
	if (head && receipt.git_head && head !== receipt.git_head) {
		stale.push(`git head changed (${receipt.git_head.slice(0, 12)} -> ${head.slice(0, 12)})`);
	}

	const finalized = {
		...receipt,
		exit_code: exitCode,
		finished_at: new Date().toISOString(),
	};

	if (stale.length > 0) {
		finalized.stale_artifacts = stale;
	}

	writeFileSync(receiptPath, `${JSON.stringify(finalized, null, 2)}\n`);
	return { stale };
}
