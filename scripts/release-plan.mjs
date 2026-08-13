import { lstatSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const [action, planArgument] = process.argv.slice(2);
const root = process.cwd();

function fail(message) {
	process.stderr.write(`${message}\n`);
	process.exit(1);
}

function git(args, options = {}) {
	const result = spawnSync('git', args, { cwd: root, encoding: 'utf8', stdio: options.capture ? 'pipe' : 'inherit' });
	if (result.status !== 0) fail(options.capture ? result.stderr.trim() : `git ${args[0]} failed`);
	return options.capture ? result.stdout.trim() : '';
}

if (!['show', 'stage', 'commit'].includes(action) || !planArgument) fail('Usage: release-plan.mjs <show|stage|commit> <plan.json>');
const normalizedPlan = planArgument.replace(/\\/gu, '/');
if (!normalizedPlan.startsWith('.mustflow/state/release-plans/') || !normalizedPlan.endsWith('.json') || normalizedPlan.split('/').some((part) => part === '..')) {
	fail('Release plan must be a JSON file under .mustflow/state/release-plans/.');
}
const planPath = path.resolve(root, normalizedPlan);
if (!planPath.startsWith(path.resolve(root, '.mustflow/state/release-plans') + path.sep)) fail('Release plan escapes its allowed root.');
if (lstatSync(planPath).isSymbolicLink()) fail('Release plan must not be a symlink.');
const plan = JSON.parse(readFileSync(planPath, 'utf8'));
if (plan.schema_version !== '1' || typeof plan.base_head !== 'string' || !Array.isArray(plan.paths) || typeof plan.message !== 'string') {
	fail('Release plan must define schema_version=1, base_head, paths, and message.');
}
if (!/^[0-9a-f]{40}$/u.test(plan.base_head) || git(['rev-parse', 'HEAD'], { capture: true }) !== plan.base_head) fail('Release plan base_head does not match HEAD.');
if (plan.paths.length === 0 || new Set(plan.paths).size !== plan.paths.length) fail('Release plan paths must be non-empty and unique.');
for (const entry of plan.paths) {
	if (typeof entry !== 'string' || entry.length === 0 || path.isAbsolute(entry) || entry.replace(/\\/gu, '/').split('/').some((part) => part === '..' || part === '.')) {
		fail(`Unsafe release path: ${String(entry)}`);
	}
}
if (!plan.message.trim() || plan.message.length > 4000) fail('Release commit message must be between 1 and 4000 characters.');

if (action === 'show') {
	process.stdout.write(`${JSON.stringify(plan, null, 2)}\n`);
} else if (action === 'stage') {
	git(['add', '--', ...plan.paths]);
} else {
	const staged = git(['diff', '--cached', '--name-only', '-z'], { capture: true }).split('\0').filter(Boolean).sort();
	const expected = [...plan.paths].sort();
	if (JSON.stringify(staged) !== JSON.stringify(expected)) fail('Staged paths do not exactly match the release plan.');
	git(['commit', '-m', plan.message]);
}
