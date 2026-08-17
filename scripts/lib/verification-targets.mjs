// verification-targets.mjs
//
// Declared direct witnesses for executable artifacts in this repository. A
// changed executable artifact (top-level script under scripts/) must have a
// declared witness test; otherwise related-mode verification fails closed
// instead of silently falling back to a broad suite that may never execute
// the artifact. Test files under tests/cli/*.test.js are self-witnessed.

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'smol-toml';

const executableArtifactPattern = /^scripts\/[^/]+\.(?:mjs|ts)$/u;
const testArtifactPattern = /^tests\/cli\/[^/]+\.test\.js$/u;

export function isExecutableArtifact(file) {
	return executableArtifactPattern.test(file);
}

export function isTestArtifact(file) {
	return testArtifactPattern.test(file);
}

export function loadVerificationTargets(projectRoot) {
	if (!projectRoot) {
		return new Map();
	}

	const targetsPath = path.join(projectRoot, '.mustflow', 'config', 'verification-targets.toml');

	try {
		const parsed = parse(readFileSync(targetsPath, 'utf8'));
		const targets = new Map();

		for (const [artifact, declaration] of Object.entries(parsed.verification_targets ?? {})) {
			const witnesses = Array.isArray(declaration?.witnesses) ? declaration.witnesses.map(String) : [];
			targets.set(artifact, {
				kind: typeof declaration?.kind === 'string' ? declaration.kind : 'executable',
				witnesses,
			});
		}

		return targets;
	} catch {
		return new Map();
	}
}

export function executableArtifactPlan(files, targets) {
	const artifacts = [];
	const unmapped = [];

	for (const file of files) {
		if (isTestArtifact(file)) {
			artifacts.push({ artifact: file, kind: 'test', witnesses: [file] });
			continue;
		}

		if (!isExecutableArtifact(file)) {
			continue;
		}

		const target = targets.get(file);
		if (target && target.witnesses.length > 0) {
			artifacts.push({ artifact: file, kind: target.kind, witnesses: [...target.witnesses] });
		} else {
			unmapped.push(file);
		}
	}

	return { artifacts, unmapped };
}
