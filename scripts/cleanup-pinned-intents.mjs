// One-shot cleanup: remove version/task-pinned one-off command intents from the
// command contract and its scoped-check shard, per the GPT 5.6 audit P0-1.
// Keeps manifest_lock_accept_* baseline intents (renamed to drop the version suffix).
// Usage: node scripts/cleanup-pinned-intents.mjs [--dry-run]
import { readFileSync, writeFileSync, renameSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dryRun = process.argv.includes('--dry-run');

const pinnedRe = /^\[intents\.([a-z0-9_]*(?:v\d+_|_v\d+)[a-z0-9_]*)\]$/u;
// manifest-lock baseline intents are live functionality; rename instead of removing.
const baselineRenames = new Map([
	['manifest_lock_accept_native_crash_skill_v2_119_0', 'manifest_lock_accept_native_crash_skill'],
	['manifest_lock_accept_browser_automation_skill_v2_121_0', 'manifest_lock_accept_browser_automation_skill'],
	['manifest_lock_accept_scoped_check_v2_130_0', 'manifest_lock_accept_scoped_check'],
]);

function stripPinnedIntents(filePath, report) {
	const text = readFileSync(filePath, 'utf8');
	const lines = text.split('\n');
	const out = [];
	let removed = 0;
	let renamed = 0;
	let i = 0;
	while (i < lines.length) {
		const m = pinnedRe.exec(lines[i]);
		if (!m) {
			out.push(lines[i]);
			i += 1;
			continue;
		}
		const name = m[1];
		const rename = baselineRenames.get(name);
		if (rename) {
			out.push(lines[i].replace(name, rename));
			renamed += 1;
			i += 1;
			report.renamed.push(name);
			continue;
		}
		// Skip the whole intent block: header + lines until the next top-level section.
		removed += 1;
		report.removed.push(name);
		i += 1;
		while (i < lines.length && !/^\[(intents|resources|effects|include|commands)\./u.test(lines[i])) {
			i += 1;
		}
	}
	if (!dryRun) {
		writeFileSync(filePath, out.join('\n'));
	}
	return { removed, renamed };
}

const report = { removed: [], renamed: [] };
const rootContract = path.join(root, '.mustflow/config/commands.toml');
const scopedShard = path.join(root, '.mustflow/config/commands.d/scoped-check-v2-130-0.toml');
const scalingShard = path.join(root, '.mustflow/config/commands.d/command-contract-scaling-v2-131-0.toml');

const r1 = stripPinnedIntents(rootContract, report);
const r2 = stripPinnedIntents(scopedShard, report);

// Rename version-pinned shard files to generic names and update the include list.
if (!dryRun) {
	const newScoped = path.join(root, '.mustflow/config/commands.d/scoped-check.toml');
	const newScaling = path.join(root, '.mustflow/config/commands.d/command-contract-scaling.toml');
	if (existsSync(scopedShard)) renameSync(scopedShard, newScoped);
	if (existsSync(scalingShard)) renameSync(scalingShard, newScaling);
	const contractText = readFileSync(rootContract, 'utf8');
	const updated = contractText
		.replace('commands.d/scoped-check-v2-130-0.toml', 'commands.d/scoped-check.toml')
		.replace('commands.d/command-contract-scaling-v2-131-0.toml', 'commands.d/command-contract-scaling.toml');
	writeFileSync(rootContract, updated);
}

console.log(JSON.stringify(
	{
		dryRun,
		removedRoot: r1.removed,
		removedScoped: r2.removed,
		totalRemoved: r1.removed + r2.removed,
		renamed: report.renamed,
	},
	null,
	2,
));
