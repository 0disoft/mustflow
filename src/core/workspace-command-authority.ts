import path from 'node:path';

export const WORKSPACE_COMMAND_AUTHORITY_MODES = ['repository_local', 'delegated_scoped'] as const;
export type WorkspaceCommandAuthorityMode = (typeof WORKSPACE_COMMAND_AUTHORITY_MODES)[number];

export interface WorkspaceCommandContractScope {
	readonly repository: string;
	readonly file: string;
	readonly files: readonly string[];
}

export interface WorkspaceCommandAuthorityConfig {
	readonly enabled: boolean;
	readonly roots: readonly string[];
	readonly authorityMode: WorkspaceCommandAuthorityMode;
	readonly contracts: readonly WorkspaceCommandContractScope[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeRelativePath(value: string): string {
	return value.trim().replace(/\\/gu, '/').replace(/\/+$/gu, '');
}

function relativePathIsUnsafe(value: string): boolean {
	const normalized = normalizeRelativePath(value);
	const segments = normalized.split('/');

	return (
		normalized.length === 0 ||
		normalized.includes('\0') ||
		normalized.startsWith('/') ||
		path.win32.isAbsolute(value) ||
		path.posix.isAbsolute(normalized) ||
		segments.some((segment) => segment.length === 0 || segment === '.' || segment === '..')
	);
}

function commandFragmentPathIsUnsafe(value: string): boolean {
	const normalized = normalizeRelativePath(value);
	return relativePathIsUnsafe(value) || !normalized.startsWith('commands/') || !normalized.endsWith('.toml');
}

function pathIsInside(candidate: string, parent: string): boolean {
	return candidate === parent || candidate.startsWith(`${parent}/`);
}

function readStringArray(value: unknown, label: string): readonly string[] {
	if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
		throw new Error(`${label} must be a string array`);
	}

	return value.map((entry) => normalizeRelativePath(entry as string));
}

function readContracts(value: unknown): readonly WorkspaceCommandContractScope[] {
	if (value === undefined) {
		return [];
	}
	if (!Array.isArray(value)) {
		throw new Error('[workspace].contracts must be an array of tables');
	}

	const contracts: WorkspaceCommandContractScope[] = [];
	const repositories = new Set<string>();
	const files = new Set<string>();
	for (const [index, rawContract] of value.entries()) {
		if (!isRecord(rawContract)) {
			throw new Error(`[workspace].contracts[${index}] must be a table`);
		}
		const repository = typeof rawContract.repository === 'string' ? normalizeRelativePath(rawContract.repository) : '';
		const hasFile = typeof rawContract.file === 'string';
		const hasFiles = rawContract.files !== undefined;
		if (hasFile === hasFiles) {
			throw new Error(`[workspace].contracts[${index}] must define exactly one of file or files`);
		}
		const contractFiles = hasFile
			? [normalizeRelativePath(rawContract.file as string)]
			: readStringArray(rawContract.files, `[workspace].contracts[${index}].files`);
		if (relativePathIsUnsafe(repository)) {
			throw new Error(`[workspace].contracts[${index}].repository must be a normalized repository-relative path`);
		}
		if (contractFiles.length === 0) {
			throw new Error(`[workspace].contracts[${index}].files must contain at least one commands/*.toml path`);
		}
		if (contractFiles.some((file) => commandFragmentPathIsUnsafe(file))) {
			throw new Error(
				hasFile
					? `[workspace].contracts[${index}].file must be a normalized commands/*.toml path`
					: `[workspace].contracts[${index}].files entries must be normalized commands/*.toml paths`,
			);
		}
		if (new Set(contractFiles).size !== contractFiles.length) {
			throw new Error(`[workspace].contracts[${index}] contains duplicate command files`);
		}
		if (repositories.has(repository)) {
			throw new Error(`[workspace].contracts contains duplicate repository "${repository}"`);
		}
		const duplicateFile = contractFiles.find((file) => files.has(file));
		if (duplicateFile) {
			throw new Error(`[workspace].contracts contains duplicate file "${duplicateFile}"`);
		}

		repositories.add(repository);
		for (const file of contractFiles) {
			files.add(file);
		}
		contracts.push({ repository, file: contractFiles[0], files: contractFiles });
	}

	return contracts;
}

export function readWorkspaceCommandAuthorityConfig(mustflowConfig: unknown): WorkspaceCommandAuthorityConfig {
	const root = isRecord(mustflowConfig) ? mustflowConfig : {};
	const workspace = isRecord(root.workspace) ? root.workspace : {};
	const enabled = workspace.enabled === true;
	const roots = workspace.roots === undefined ? [] : readStringArray(workspace.roots, '[workspace].roots');
	const authorityMode = workspace.authority_mode === undefined ? 'repository_local' : workspace.authority_mode;
	if (!WORKSPACE_COMMAND_AUTHORITY_MODES.includes(authorityMode as WorkspaceCommandAuthorityMode)) {
		throw new Error(
			`[workspace].authority_mode must be one of: ${WORKSPACE_COMMAND_AUTHORITY_MODES.join(', ')}`,
		);
	}
	if (roots.some((rootPath) => relativePathIsUnsafe(rootPath))) {
		throw new Error('[workspace].roots entries must be normalized repository-relative paths');
	}

	const contracts = readContracts(workspace.contracts);
	if (authorityMode === 'delegated_scoped') {
		if (!enabled) {
			throw new Error('[workspace].authority_mode = "delegated_scoped" requires [workspace].enabled = true');
		}
		if (roots.length === 0) {
			throw new Error('[workspace].authority_mode = "delegated_scoped" requires at least one [workspace].roots entry');
		}
		for (const contract of contracts) {
			if (!roots.some((rootPath) => pathIsInside(contract.repository, rootPath))) {
				throw new Error(
					`[workspace].contracts repository "${contract.repository}" must stay inside one [workspace].roots entry`,
				);
			}
		}
	}

	return {
		enabled,
		roots,
		authorityMode: authorityMode as WorkspaceCommandAuthorityMode,
		contracts,
	};
}
