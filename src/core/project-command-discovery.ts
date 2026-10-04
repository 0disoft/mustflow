import { existsSync } from 'node:fs';
import path from 'node:path';
import type { CommandContract, TomlTable } from './config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';

const CHECK_NAMES = new Set(['test', 'typecheck', 'lint', 'check', 'build']);
const REASONS = ['code_change', 'behavior_change', 'test_change', 'low_risk_code_change', 'unknown_change'];
const FULL_REASONS = ['release_risk', 'cross_cutting_code_change', 'full_test_request', 'before_publish', 'security_change', 'data_change', 'migration_change'];

function isTable(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function callsScript(command: string, scriptName: string): boolean {
	const escaped = scriptName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	return new RegExp(`(?:^|[;&|]\\s*)(?:bun|npm|pnpm|yarn)\\s+(?:run(?:-script)?\\s+)?${escaped}(?:\\s|$|[;&|])`).test(command);
}

function inferredIntent(name: string, argv: string[]): TomlTable {
	return {
		status: 'configured', lifecycle: 'oneshot', run_policy: 'agent_allowed',
		description: `Run the repository's ${name} command without registering a command contract.`,
		argv, cwd: '.', timeout_seconds: 600, stdin: 'closed', success_exit_codes: [0],
		writes: [], network: false, destructive: false,
		env_policy: 'inherit',
		max_output_bytes: 1048576,
		required_after: name === 'build' ? ['packaging_change'] : [...REASONS, ...FULL_REASONS],
	};
}

export function discoverProjectCommands(projectRoot: string): Record<string, TomlTable> {
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
		if (isTable(pkg.scripts)) {
			for (const name of CHECK_NAMES) {
				const executable = process.platform === 'win32' && manager !== 'bun' ? `${manager}.cmd` : manager;
				if (typeof pkg.scripts[name] === 'string' && pkg.scripts[name].trim()) intents[name] = inferredIntent(name, [executable, 'run', name]);
			}
			const executable = process.platform === 'win32' && manager !== 'bun' ? `${manager}.cmd` : manager;
			if (typeof pkg.scripts['test:related'] === 'string' && pkg.scripts['test:related'].trim()) {
				intents.test_related = { ...inferredIntent('test:related', [executable, 'run', 'test:related']), required_after: REASONS };
				if (intents.test) intents.test = { ...intents.test, required_after: FULL_REASONS };
			}
			// Only remove checks that the aggregate explicitly invokes. A script
			// called "check" is not proof that tests or type checks are covered.
			if (intents.check) {
				for (const name of ['test', 'test_related', 'typecheck', 'lint']) {
					const scriptName = name === 'test_related' ? 'test:related' : name;
					if (intents[name] && callsScript(String(pkg.scripts.check), scriptName)) intents[name] = { ...intents[name], required_after: [] };
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
	return { ...contract, intents: { ...discoverProjectCommands(projectRoot), ...contract.intents } };
}
