import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { acquireActiveCommandLock, reportActiveCommandLockConflict } from '../lib/active-command-lock.js';
import { ensureFileTargetInsideWithoutSymlinks, readUtf8FileInsideWithoutSymlinks } from '../lib/filesystem.js';
import { t, type CliLang } from '../lib/i18n.js';
import { applyManifestLockCustomizationPlan, createManifestLockCustomizationPlan, parseManifestLockCustomizationPlan } from '../lib/manifest-lock.js';
import { isAllowedManifestCustomizationPath } from '../lib/manifest-lock-scope.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

export function runBaseline(args: string[], reporter: Reporter, lang: CliLang = 'en'): number {
	const usage = 'mf baseline plan <.mustflow/state/manifest-lock-plans/name.json> <path>...\nmf baseline apply <.mustflow/state/manifest-lock-plans/name.json>';
	if (args.length === 1 && (args[0] === '--help' || args[0] === '-h')) {
		reporter.stdout(`${usage}\n\n${t(lang, 'command.baseline.summary')}`);
		return 0;
	}
	const [action, planPath, ...paths] = args;
	if ((action !== 'plan' && action !== 'apply') || !planPath ||
		(action === 'plan' ? paths.length === 0 : paths.length !== 0) ||
		!/^\.mustflow\/state\/manifest-lock-plans\/[a-zA-Z0-9][a-zA-Z0-9._-]*\.json$/u.test(planPath)) {
		reporter.stderr(usage);
		return 1;
	}
	const root = resolveMustflowRoot();
	const target = path.join(root, planPath);
	const active = acquireActiveCommandLock(root, 'mf baseline', action === 'plan'
		? [{ type: 'write', mode: 'write', path: planPath, concurrency: 'exclusive' }]
		: [{ type: 'read', mode: 'read', path: planPath, concurrency: 'shared' },
			{ type: 'write', mode: 'replace', path: '.mustflow/config/manifest.lock.toml', lock: 'manifest_lock_baseline', concurrency: 'exclusive' }]);
	if (!active.ok) {
		reportActiveCommandLockConflict(reporter, 'mf baseline', active.conflicts, 'mf baseline --help', lang);
		return 1;
	}
	try {
		ensureFileTargetInsideWithoutSymlinks(root, target, { allowMissingLeaf: action === 'plan' });
		const plan = action === 'plan'
			? createManifestLockCustomizationPlan(root, paths)
			: parseManifestLockCustomizationPlan(JSON.parse(readUtf8FileInsideWithoutSymlinks(root, target, { maxBytes: 1024 * 1024 })));
		for (const entry of plan.files) {
			if (!isAllowedManifestCustomizationPath(root, entry.relative_path)) {
				throw new Error(`Unsupported manifest customization path: ${entry.relative_path}`);
			}
		}
		if (action === 'plan') {
			mkdirSync(path.dirname(target), { recursive: true });
			ensureFileTargetInsideWithoutSymlinks(root, target, { allowMissingLeaf: true });
			writeFileSync(target, `${JSON.stringify(plan, null, 2)}\n`, { encoding: 'utf8', flag: 'wx' });
			reporter.stdout(`${planPath}\n${plan.files.map(entry => `${entry.relative_path} ${entry.content_hash}`).join('\n')}`);
		} else {
			reporter.stdout(applyManifestLockCustomizationPlan(root, plan).join('\n'));
		}
		return 0;
	} catch (error) {
		reporter.stderr(error instanceof Error ? error.message : String(error));
		return 1;
	} finally {
		active.handle.release();
	}
}
