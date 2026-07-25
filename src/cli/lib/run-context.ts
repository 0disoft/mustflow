import { existsSync } from 'node:fs';
import path from 'node:path';

import {
	readCommandContract,
	readMustflowConfigIfExists,
	readScopedCommandContract,
	type CommandContract,
	type TomlTable,
} from '../../core/config-loading.js';
import {
	readWorkspaceCommandAuthorityConfig,
	type WorkspaceCommandContractScope,
} from '../../core/workspace-command-authority.js';
import { resolveSafeProjectCwd } from '../../core/command-cwd.js';
import { normalizeCommandEffects } from '../../core/command-effects.js';
import { readEffectiveCommandCwd } from '../../core/command-run-constraints.js';
import { isRecord } from './command-contract.js';
import { resolveMustflowRoot } from './project-root.js';

const MUSTFLOW_CONFIG_RELATIVE_PATH = '.mustflow/config/mustflow.toml';

export interface RunWorkspaceScope {
	readonly repository: string;
	readonly contract: string;
}

export interface RunCommandContext {
	readonly projectRoot: string;
	readonly contract: CommandContract;
	readonly mustflowConfig: TomlTable | undefined;
	readonly workspaceScope: RunWorkspaceScope | null;
	readonly trustPaths: readonly string[] | undefined;
}

export interface ResolveRunCommandContextOptions {
	readonly startPath?: string;
	readonly repository?: string | null;
	readonly intentName?: string;
}

function toPosixPath(value: string): string {
	return value.split(path.sep).join('/');
}

function normalizeRepositoryOption(value: string): string {
	return value.trim().replace(/\\/gu, '/').replace(/^\.\//u, '').replace(/\/+$/gu, '');
}

function resolvedPathIsInside(candidate: string, parent: string): boolean {
	const relative = path.relative(parent, candidate);
	return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function findScopeByRepository(
	contracts: readonly WorkspaceCommandContractScope[],
	repository: string,
): WorkspaceCommandContractScope | undefined {
	const normalized = normalizeRepositoryOption(repository);
	return contracts.find((contract) => contract.repository === normalized);
}

function findScopeByStartPath(
	projectRoot: string,
	startPath: string,
	contracts: readonly WorkspaceCommandContractScope[],
): WorkspaceCommandContractScope | undefined {
	const resolvedStart = path.resolve(startPath);
	return [...contracts]
		.sort((left, right) => right.repository.length - left.repository.length)
		.find((contract) => resolvedPathIsInside(resolvedStart, path.resolve(projectRoot, ...contract.repository.split('/'))));
}

function startPathIsInsideWorkspaceRoot(projectRoot: string, startPath: string, workspaceRoots: readonly string[]): boolean {
	const resolvedStart = path.resolve(startPath);
	return workspaceRoots.some((workspaceRoot) =>
		resolvedPathIsInside(resolvedStart, path.resolve(projectRoot, ...workspaceRoot.split('/'))),
	);
}

function assertScopeRepositoryExists(projectRoot: string, scope: WorkspaceCommandContractScope): void {
	const repositoryRoot = path.resolve(projectRoot, ...scope.repository.split('/'));
	if (!resolvedPathIsInside(repositoryRoot, projectRoot)) {
		throw new Error(`Delegated workspace repository escapes the mustflow root: ${scope.repository}`);
	}
	if (!existsSync(repositoryRoot)) {
		throw new Error(`Delegated workspace repository does not exist: ${scope.repository}`);
	}
}

export function assertScopedCommandIntentIsolation(
	projectRoot: string,
	scope: WorkspaceCommandContractScope,
	contract: CommandContract,
	intentName: string | undefined,
): void {
	if (!intentName) {
		return;
	}
	const repositoryRoot = path.resolve(projectRoot, ...scope.repository.split('/'));
	const rawIntent = contract.intents[intentName];
	if (!isRecord(rawIntent)) {
		return;
	}

	const intentCwd = resolveSafeProjectCwd(projectRoot, readEffectiveCommandCwd(contract, rawIntent));
	if (!resolvedPathIsInside(intentCwd, repositoryRoot)) {
		throw new Error(`Delegated workspace intent "${intentName}" cwd must stay inside ${scope.repository}`);
	}

	for (const effect of normalizeCommandEffects(projectRoot, contract, intentName)) {
		if (effect.path === null) {
			continue;
		}
		const effectPath = path.resolve(projectRoot, ...effect.path.split('/'));
		if (!resolvedPathIsInside(effectPath, repositoryRoot)) {
			throw new Error(
				`Delegated workspace intent "${intentName}" effect path must stay inside ${scope.repository}: ${effect.path}`,
			);
		}
	}
}

function createScopedContext(
	projectRoot: string,
	mustflowConfig: TomlTable | undefined,
	scope: WorkspaceCommandContractScope,
	intentName: string | undefined,
): RunCommandContext {
	assertScopeRepositoryExists(projectRoot, scope);
	const contractPath = `.mustflow/config/${scope.file}`;
	const contract = readScopedCommandContract(projectRoot, scope.file, `workspace:${scope.repository}`, scope.repository);
	assertScopedCommandIntentIsolation(projectRoot, scope, contract, intentName);
	return {
		projectRoot,
		contract,
		mustflowConfig,
		workspaceScope: {
			repository: scope.repository,
			contract: contractPath,
		},
		trustPaths: [MUSTFLOW_CONFIG_RELATIVE_PATH, contractPath],
	};
}

export function resolveRunCommandContext(options: ResolveRunCommandContextOptions = {}): RunCommandContext {
	const startPath = path.resolve(options.startPath ?? process.cwd());
	const projectRoot = resolveMustflowRoot(startPath);
	const mustflowConfig = readMustflowConfigIfExists(projectRoot);
	const workspaceAuthority = readWorkspaceCommandAuthorityConfig(mustflowConfig);
	const requestedRepository = options.repository?.trim() ? normalizeRepositoryOption(options.repository) : null;

	if (workspaceAuthority.authorityMode !== 'delegated_scoped') {
		if (requestedRepository) {
			throw new Error('--repo requires [workspace].authority_mode = "delegated_scoped"');
		}
		return {
			projectRoot,
			contract: readCommandContract(projectRoot),
			mustflowConfig,
			workspaceScope: null,
			trustPaths: undefined,
		};
	}

	const scope = requestedRepository
		? findScopeByRepository(workspaceAuthority.contracts, requestedRepository)
		: findScopeByStartPath(projectRoot, startPath, workspaceAuthority.contracts);
	if (requestedRepository && !scope) {
		throw new Error(`No delegated workspace contract is mapped for repository: ${requestedRepository}`);
	}
	if (scope) {
		return createScopedContext(projectRoot, mustflowConfig, scope, options.intentName);
	}

	if (startPathIsInsideWorkspaceRoot(projectRoot, startPath, workspaceAuthority.roots)) {
		const relativeStart = toPosixPath(path.relative(projectRoot, startPath)) || '.';
		throw new Error(`No delegated workspace contract is mapped for working directory: ${relativeStart}`);
	}

	return {
		projectRoot,
		contract: readCommandContract(projectRoot),
		mustflowConfig,
		workspaceScope: null,
		trustPaths: [MUSTFLOW_CONFIG_RELATIVE_PATH],
	};
}
