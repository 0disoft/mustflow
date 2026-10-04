import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CommandContract, TomlTable } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';

const CHECK_SCRIPTS: Record<string, readonly string[]> = {
	test: ['test'], typecheck: ['typecheck', 'check:typecheck'], lint: ['lint', 'check:lint'],
	check: ['check:fast', 'check'], build: ['build'],
};
const REASONS = ['code_change', 'behavior_change', 'test_change', 'low_risk_code_change', 'unknown_change'];
const FULL_REASONS = ['release_risk', 'cross_cutting_code_change', 'full_test_request', 'before_publish', 'security_change', 'data_change', 'migration_change'];

function isTable(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function callsScript(command: string, scriptName: string): boolean {
	// Pipelines, alternatives and statement lists can hide a failed or skipped check.
	if (/[;|'"`]/u.test(command)) return false;
	const escaped = scriptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(?:^|&&\\s*)(?:bun|npm|pnpm|yarn)\\s+(?:run(?:-script)?\\s+)?${escaped}(?=\\s*(?:&&|$))`).test(command);
}

function inferredIntent(name: string, argv: string[]): TomlTable {
	return {
		status: 'configured', lifecycle: 'oneshot', run_policy: 'agent_allowed',
		description: `Run the repository's ${name} command without registering a command contract.`,
		argv, cwd: '.', timeout_seconds: 600, stdin: 'closed', success_exit_codes: [0],
		// Script effects are unknown; serialize discovered commands in each project.
		writes: [], effects: [{ type: 'write', lock: 'inferred_project_commands', concurrency: 'exclusive' }],
		network: false, destructive: false,
		env_policy: 'inherit',
		max_output_bytes: 1048576,
		required_after: name === 'build' ? ['packaging_change'] : [...REASONS, ...FULL_REASONS],
	};
}

export function discoverProjectCommands(projectRoot: string, authoredIntents: Readonly<Record<string, unknown>> = {}): Record<string, TomlTable> {
	const intents: Record<string, TomlTable> = {};
	const packagePath = path.join(projectRoot, 'package.json');
	if (existsSync(packagePath)) {
		const pkg: unknown = JSON.parse(readUtf8FileInsideWithoutSymlinks(projectRoot, packagePath, { maxBytes: 256 * 1024 }));
		if (!isTable(pkg)) throw new Error('package.json must contain an object');
		const declared = typeof pkg.packageManager === 'string' ? pkg.packageManager.split('@')[0] : undefined;
		const manager = declared && ['bun', 'npm', 'pnpm', 'yarn'].includes(declared) ? declared :
			existsSync(path.join(projectRoot, 'bun.lock')) || existsSync(path.join(projectRoot, 'bun.lockb')) ? 'bun' :
			existsSync(path.join(projectRoot, 'pnpm-lock.yaml')) ? 'pnpm' :
			existsSync(path.join(projectRoot, 'yarn.lock')) ? 'yarn' : 'npm';
		const scripts = pkg.scripts;
		if (isTable(scripts)) {
			const executable = process.platform === 'win32' && manager !== 'bun' ? `${manager}.cmd` : manager;
			const selectedScripts: Record<string, string> = {};
			const hasScript = (name: string) => typeof scripts[name] === 'string' && String(scripts[name]).trim().length > 0;
			for (const [name, candidates] of Object.entries(CHECK_SCRIPTS)) {
				const script = candidates.find(hasScript);
				if (script) {
					selectedScripts[name] = script;
					intents[name] = inferredIntent(script, [executable, 'run', script]);
				}
			}
			for (const [name, script] of [['test_related', 'test:related'], ['test_fast', 'test:fast']]) {
				if (!hasScript(script)) continue;
				selectedScripts[name] = script;
				intents[name] = { ...inferredIntent(script, [executable, 'run', script]), required_after: REASONS };
				// A related selector takes precedence over a general fast test suite.
				if (name === 'test_related') break;
			}
			if (intents.test_related || intents.test_fast) {
				if (intents.test) intents.test = { ...intents.test, required_after: FULL_REASONS };
			}
			if (selectedScripts.check === 'check:fast' && hasScript('check')) {
				selectedScripts.check_full = 'check';
				intents.check_full = { ...inferredIntent('check', [executable, 'run', 'check']), required_after: FULL_REASONS };
			} else if (intents.check && (intents.test_related || intents.test_fast || intents.typecheck || intents.lint)) {
				intents.check = { ...intents.check, required_after: FULL_REASONS };
			}
			// Deduplicate only explicitly covered scripts, for the same reasons.
			for (const aggregate of ['check', 'check_full']) {
				// An authored aggregate may be blocked or execute something else entirely.
				if (!intents[aggregate] || Object.hasOwn(authoredIntents, aggregate)) continue;
				const coveredReasons = new Set(intents[aggregate].required_after as string[]);
				for (const [name, script] of Object.entries(selectedScripts)) {
					if (name === aggregate || name === 'build') continue;
					if (callsScript(String(scripts[selectedScripts[aggregate]]), script)) {
						intents[name] = { ...intents[name], required_after: (intents[name].required_after as string[]).filter(reason => !coveredReasons.has(reason)) };
					}
				}
			}
		}
	}
	if (existsSync(path.join(projectRoot, 'go.mod'))) {
		intents.test ??= inferredIntent('test', ['go', 'test', './...']);
		intents.check ??= inferredIntent('check', ['go', 'vet', './...']);
		intents.build ??= inferredIntent('build', ['go', 'build', './...']);
	}
	if (existsSync(path.join(projectRoot, 'Cargo.toml'))) {
		intents.test ??= inferredIntent('test', ['cargo', 'test']);
		intents.check ??= inferredIntent('check', ['cargo', 'check']);
		intents.build ??= inferredIntent('build', ['cargo', 'build']);
	}
	return intents;
}

export function addProjectCommands(projectRoot: string, contract: CommandContract): CommandContract {
	// Authored entries, including manual-only or unknown entries, retain priority.
	const inferred = discoverProjectCommands(projectRoot, contract.intents);
	for (const intent of Object.values(inferred)) {
		for (const [field, defaultField] of [['timeout_seconds', 'default_timeout_seconds'], ['max_output_bytes', 'max_output_bytes'], ['env_policy', 'env_policy'], ['stdin', 'stdin']]) {
			if (contract.defaults[defaultField] !== undefined) intent[field] = contract.defaults[defaultField];
		}
	}
	return { ...contract, intents: { ...inferred, ...contract.intents } };
}
