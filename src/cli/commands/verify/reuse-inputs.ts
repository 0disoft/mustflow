import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ChangeVerificationReport } from '../../../core/change-verification.js';
import { isRecord, type CommandContract } from '../../../core/config-loading.js';
import { createCommandEnv, resolveCommandEnv } from '../../../core/command-env.js';
import { ensureInsideWithoutSymlinks } from '../../../core/safe-filesystem.js';

/** A declaration is an assertion that these exact files contain all local inputs. */
export function createVerificationCurrentStateHash(
	projectRoot: string,
	report: ChangeVerificationReport,
	verificationPlanId: string,
	contract: CommandContract,
): string | null {
	if (report.files.length === 0 || report.schedule.entries.length === 0) return null;
	const files = new Set(report.files);
	const hash = createHash('sha256').update('mustflow.verify_inputs.v2').update(verificationPlanId);
	try {
		const head = spawnSync('git', ['rev-parse', '--verify', 'HEAD'], {
			cwd: projectRoot, encoding: 'utf8', timeout: 5000, windowsHide: true,
		});
		if (head.status !== 0 && existsSync(path.join(projectRoot, '.git'))) return null;
		hash.update(JSON.stringify([head.status === 0 ? head.stdout.trim() : null, process.versions, process.platform, process.arch]));
		for (const entry of report.schedule.entries) {
			const intent = contract.intents[entry.intent];
			if (!isRecord(intent) || !isRecord(intent.reuse) || !Array.isArray(intent.reuse.inputs) || intent.reuse.inputs.length === 0) return null;
			if (intent.network !== false || intent.destructive !== false || !Array.isArray(intent.writes) || intent.writes.length !== 0) return null;
			if (Array.isArray(intent.effects) && intent.effects.some((effect) => !isRecord(effect) || effect.type !== 'read')) return null;
			if (!Array.isArray(intent.argv) || typeof intent.argv[0] !== 'string' || !path.isAbsolute(intent.argv[0])) return null;
			const executable = statSync(intent.argv[0]);
			if (!executable.isFile()) return null;
			hash.update(JSON.stringify([intent.argv[0], executable.size, executable.mtimeMs, executable.ctimeMs]));
			const resolution = resolveCommandEnv(contract, intent);
			if (resolution.policy === 'inherit') return null;
			const env = createCommandEnv(projectRoot, resolution);
			// Only a digest is persisted; environment values never enter receipts or output.
			hash.update(JSON.stringify(Object.keys(env).sort().map((key) => [key, env[key]])));
			for (const input of intent.reuse.inputs) {
				if (typeof input !== 'string' || input.length === 0 || path.isAbsolute(input) || /[*?\[\]{}]/u.test(input)) return null;
				files.add(input);
			}
		}
		for (const relativePath of [...files].sort()) {
			const absolutePath = path.resolve(projectRoot, relativePath);
			ensureInsideWithoutSymlinks(projectRoot, absolutePath, { allowMissingDescendant: true });
			const stats = statSync(absolutePath, { throwIfNoEntry: false });
			if (stats && !stats.isFile()) return null;
			const content = stats ? readFileSync(absolutePath) : null;
			hash.update(JSON.stringify([relativePath, content?.byteLength ?? null]));
			if (content !== null) hash.update(content);
		}
	} catch {
		return null;
	}
	return `sha256:${hash.digest('hex')}`;
}
