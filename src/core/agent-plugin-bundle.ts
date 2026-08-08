import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

interface BundleSkill {
	readonly name: string;
	readonly source: string;
}

interface BundleDeclaration {
	readonly schema_version: '1';
	readonly kind: 'agent_plugin_bundle';
	readonly plugin: {
		readonly name: string;
		readonly description: string;
		readonly homepage: string;
		readonly repository: string;
		readonly license: string;
	};
	readonly version_source: { readonly file: 'package.json'; readonly json_pointer: '/version' };
	readonly output_directory: string;
	readonly skills: readonly BundleSkill[];
	readonly mcp_servers: readonly { readonly name: string; readonly source: string }[];
	readonly authority: {
		readonly skill_source_of_truth: '.mustflow/skills';
		readonly command_contract: '.mustflow/config/commands.toml';
		readonly plugin_permissions_authoritative: false;
		readonly secrets_embedded: false;
	};
	readonly provenance: {
		readonly specification: string;
		readonly specification_version: string;
		readonly source_refresh: 'live' | 'user_supplied_snapshot';
	};
}

export interface AgentPluginBuildReport {
	readonly schema_version: '1';
	readonly command: 'plugin_build';
	readonly ok: boolean;
	readonly plugin: string;
	readonly bundle_path: string;
	readonly output_directory: string;
	readonly manifest_path: string;
	readonly skill_count: number;
	readonly mcp_server_count: number;
	readonly specification_version: string;
	readonly source_refresh: 'live' | 'user_supplied_snapshot';
	readonly validation: {
		readonly manifest_valid: boolean;
		readonly skills_valid: boolean;
		readonly mcp_valid: boolean;
	};
	readonly issues: readonly string[];
}

const NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const VERSION_PATTERN = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/u;
const MANIFEST_KEYS = ['description', 'homepage', 'license', 'name', 'repository', 'version'] as const;

function insideRoot(root: string, candidate: string): boolean {
	const relative = path.relative(root, candidate);
	return relative.length === 0 || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function readBundle(projectRoot: string, bundlePath: string): BundleDeclaration {
	const absolutePath = path.resolve(projectRoot, bundlePath);
	if (!insideRoot(projectRoot, absolutePath)) {
		throw new Error(`agent_plugin_bundle_outside_root:${bundlePath}`);
	}
	const bundle = JSON.parse(readFileSync(absolutePath, 'utf8')) as BundleDeclaration;
	if (bundle.schema_version !== '1' || bundle.kind !== 'agent_plugin_bundle' || !NAME_PATTERN.test(bundle.plugin?.name ?? '')) {
		throw new Error(`agent_plugin_bundle_invalid:${bundlePath}`);
	}
	if (!Array.isArray(bundle.skills) || bundle.skills.length === 0 || !Array.isArray(bundle.mcp_servers)) {
		throw new Error(`agent_plugin_bundle_invalid_components:${bundlePath}`);
	}
	if (
		bundle.authority?.skill_source_of_truth !== '.mustflow/skills'
		|| bundle.authority?.command_contract !== '.mustflow/config/commands.toml'
		|| bundle.authority?.plugin_permissions_authoritative !== false
		|| bundle.authority?.secrets_embedded !== false
	) {
		throw new Error(`agent_plugin_bundle_invalid_authority:${bundlePath}`);
	}
	return bundle;
}

function verifyTreeHasNoLinks(directory: string): void {
	for (const entry of readdirSync(directory, { withFileTypes: true })) {
		const entryPath = path.join(directory, entry.name);
		const stats = lstatSync(entryPath);
		if (stats.isSymbolicLink()) {
			throw new Error(`agent_plugin_skill_symlink_rejected:${entryPath}`);
		}
		if (stats.isDirectory()) {
			verifyTreeHasNoLinks(entryPath);
		}
	}
}

function validateSkill(projectRoot: string, skill: BundleSkill): string {
	if (!NAME_PATTERN.test(skill.name)) {
		throw new Error(`agent_plugin_skill_name_invalid:${skill.name}`);
	}
	const sourcePath = path.resolve(projectRoot, skill.source);
	if (!insideRoot(projectRoot, sourcePath) || path.basename(sourcePath) !== 'SKILL.md' || !existsSync(sourcePath)) {
		throw new Error(`agent_plugin_skill_source_invalid:${skill.source}`);
	}
	if (path.basename(path.dirname(sourcePath)) !== skill.name) {
		throw new Error(`agent_plugin_skill_directory_mismatch:${skill.name}`);
	}
	const skillText = readFileSync(sourcePath, 'utf8');
	if (!new RegExp(`^name:\\s*${skill.name}\\s*$`, 'mu').test(skillText)) {
		throw new Error(`agent_plugin_skill_frontmatter_mismatch:${skill.name}`);
	}
	verifyTreeHasNoLinks(path.dirname(sourcePath));
	return path.dirname(sourcePath);
}

function readPackageVersion(projectRoot: string, declaration: BundleDeclaration): string {
	const packagePath = path.resolve(projectRoot, declaration.version_source.file);
	const packageJson = JSON.parse(readFileSync(packagePath, 'utf8')) as { version?: unknown };
	if (typeof packageJson.version !== 'string' || !VERSION_PATTERN.test(packageJson.version)) {
		throw new Error('agent_plugin_version_source_invalid');
	}
	return packageJson.version;
}

function readMcpServer(projectRoot: string, name: string, source: string): unknown {
	if (!NAME_PATTERN.test(name)) {
		throw new Error(`agent_plugin_mcp_name_invalid:${name}`);
	}
	const sourcePath = path.resolve(projectRoot, source);
	const allowedRoot = path.resolve(projectRoot, 'plugin-bundles', 'mcp');
	if (!insideRoot(allowedRoot, sourcePath) || !sourcePath.endsWith('.json') || !existsSync(sourcePath)) {
		throw new Error(`agent_plugin_mcp_source_invalid:${source}`);
	}
	if (lstatSync(sourcePath).isSymbolicLink()) {
		throw new Error(`agent_plugin_mcp_symlink_rejected:${source}`);
	}
	return JSON.parse(readFileSync(sourcePath, 'utf8')) as unknown;
}

function validateGeneratedOutput(outputDirectory: string, skillNames: readonly string[], hasMcp: boolean): void {
	const manifest = JSON.parse(readFileSync(path.join(outputDirectory, 'plugin.json'), 'utf8')) as Record<string, unknown>;
	if (
		Object.keys(manifest).sort().join(',') !== [...MANIFEST_KEYS].sort().join(',')
		|| !NAME_PATTERN.test(String(manifest.name ?? ''))
		|| !VERSION_PATTERN.test(String(manifest.version ?? ''))
	) {
		throw new Error('agent_plugin_generated_manifest_invalid');
	}
	for (const skillName of skillNames) {
		if (!existsSync(path.join(outputDirectory, 'skills', skillName, 'SKILL.md'))) {
			throw new Error(`agent_plugin_generated_skill_missing:${skillName}`);
		}
	}
	if (hasMcp) {
		const mcp = JSON.parse(readFileSync(path.join(outputDirectory, 'mcp.json'), 'utf8')) as { mcpServers?: unknown };
		if (!mcp.mcpServers || typeof mcp.mcpServers !== 'object' || Array.isArray(mcp.mcpServers)) {
			throw new Error('agent_plugin_generated_mcp_invalid');
		}
	}
}

export function buildAgentPluginBundle(projectRoot: string, bundlePath: string): AgentPluginBuildReport {
	const declaration = readBundle(projectRoot, bundlePath);
	const outputDirectory = path.resolve(projectRoot, declaration.output_directory);
	const allowedOutputRoot = path.resolve(projectRoot, 'dist', 'agent-plugins');
	if (!insideRoot(allowedOutputRoot, outputDirectory) || outputDirectory === allowedOutputRoot) {
		throw new Error(`agent_plugin_output_invalid:${declaration.output_directory}`);
	}

	const skillSources = declaration.skills.map((skill) => ({ skill, directory: validateSkill(projectRoot, skill) }));
	const version = readPackageVersion(projectRoot, declaration);
	rmSync(outputDirectory, { recursive: true, force: true });
	mkdirSync(path.join(outputDirectory, 'skills'), { recursive: true });
	for (const { skill, directory } of skillSources) {
		cpSync(directory, path.join(outputDirectory, 'skills', skill.name), { recursive: true, dereference: false });
	}

	const manifest = {
		name: declaration.plugin.name,
		version,
		description: declaration.plugin.description,
		homepage: declaration.plugin.homepage,
		repository: declaration.plugin.repository,
		license: declaration.plugin.license,
	};
	const manifestPath = path.join(outputDirectory, 'plugin.json');
	writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

	if (declaration.mcp_servers.length > 0) {
		const servers = Object.fromEntries(declaration.mcp_servers.map((server) => [
			server.name,
			readMcpServer(projectRoot, server.name, server.source),
		]));
		writeFileSync(path.join(outputDirectory, 'mcp.json'), `${JSON.stringify({ mcpServers: servers }, null, 2)}\n`);
	}
	validateGeneratedOutput(outputDirectory, declaration.skills.map((skill) => skill.name), declaration.mcp_servers.length > 0);

	return {
		schema_version: '1',
		command: 'plugin_build',
		ok: true,
		plugin: declaration.plugin.name,
		bundle_path: bundlePath.replaceAll('\\', '/'),
		output_directory: declaration.output_directory,
		manifest_path: `${declaration.output_directory}/plugin.json`,
		skill_count: declaration.skills.length,
		mcp_server_count: declaration.mcp_servers.length,
		specification_version: declaration.provenance.specification_version,
		source_refresh: declaration.provenance.source_refresh,
		validation: { manifest_valid: true, skills_valid: true, mcp_valid: true },
		issues: declaration.provenance.source_refresh === 'live' ? [] : ['official_schema_live_refresh_unavailable'],
	};
}
