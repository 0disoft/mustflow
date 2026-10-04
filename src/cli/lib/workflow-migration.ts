import { existsSync } from 'node:fs';
import path from 'node:path';
import { readMustflowConfig, isRecord } from '../../core/config-loading.js';
import { readUtf8FileInsideWithoutSymlinks } from './filesystem.js';
import { readManifestLock, sha256File } from './manifest-lock.js';
import { stringifyToml } from './toml.js';
import type { TemplateFileSource } from './templates.js';

/** Preserve authored commands and preferences when opting an existing install into simple mode. */
export function prepareSimpleWorkflowMigration(projectRoot: string, sources: TemplateFileSource[]): {
	readonly sources: TemplateFileSource[];
	readonly replaceUnmodifiedAgents: boolean;
} {
	const config = readMustflowConfig(projectRoot);
	config.workflow = { ...(isRecord(config.workflow) ? config.workflow : {}), mode: 'simple' };
	const preservedPaths = new Set(['.mustflow/config/commands.toml', '.mustflow/config/preferences.toml']);
	const lock = readManifestLock(projectRoot);
	const agents = lock.kind === 'present' ? lock.lock.files.find(file => file.relativePath === 'AGENTS.md') : undefined;
	const agentPath = path.join(projectRoot, 'AGENTS.md');
	const replaceUnmodifiedAgents = Boolean(agents?.source === 'template_locale'
		&& !['customized', 'merged'].includes(agents.lastAction)
		&& existsSync(agentPath) && sha256File(agentPath) === agents.contentHash);
	return {
		replaceUnmodifiedAgents,
		sources: sources.map(source => {
			if (source.relativePath === '.mustflow/config/mustflow.toml') return { ...source, content: stringifyToml(config) };
			const targetPath = path.join(projectRoot, source.relativePath);
			if (!preservedPaths.has(source.relativePath) || !existsSync(targetPath)) return source;
			return { ...source, content: readUtf8FileInsideWithoutSymlinks(projectRoot, targetPath) };
		}),
	};
}
