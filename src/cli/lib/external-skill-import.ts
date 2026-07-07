import { existsSync, renameSync, rmSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

import {
	readCommandContract,
	readCommandContractIncludePaths,
} from '../../core/config-loading.js';
import {
	ensureFileTargetInsideWithoutSymlinks,
	readUtf8FileInsideWithoutSymlinks,
	writeJsonFileInsideWithoutSymlinks,
	writeUtf8FileInsideWithoutSymlinks,
} from '../../core/safe-filesystem.js';

const EXTERNAL_SKILL_ROOT = '.mustflow/external-skills';
const PROVENANCE_FILE = 'mustflow-skill-source.json';
const COMMANDS_CONFIG_PATH = '.mustflow/config/commands.toml';
const COMMAND_FRAGMENT_DIRECTORY = '.mustflow/config/commands';
const DEFAULT_GITHUB_REF = 'HEAD';
const MAX_IMPORTED_FILES = 40;
const MAX_TOTAL_BYTES = 512 * 1024;
const MAX_FILE_BYTES = 256 * 1024;
const ALLOWED_SUPPORT_DIRECTORIES = new Set(['assets', 'references', 'scripts']);
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/u;
const GITHUB_NAME_PATTERN = /^[A-Za-z0-9_.-]+$/u;

export type ExternalSkillImportMode = 'dry_run' | 'install';
export type ExternalSkillFileKind = 'skill' | 'asset' | 'reference' | 'script';
export type ExternalSkillImportStatus = 'preview' | 'installed' | 'rejected';

export interface ExternalSkillImportSource {
	readonly input_url: string;
	readonly host: 'github.com' | 'raw.githubusercontent.com';
	readonly owner: string;
	readonly repo: string;
	readonly ref: string;
	readonly skill_path: string;
	readonly source_url: string;
}

export interface ExternalSkillImportedFile {
	readonly relative_path: string;
	readonly kind: ExternalSkillFileKind;
	readonly bytes: number;
	readonly sha256: string;
}

export interface ExternalSkillImportTarget {
	readonly root: string;
	readonly skill_name: string;
	readonly skill_dir: string;
	readonly provenance_path: string;
}

export interface ExternalSkillTrustedScriptIntent {
	readonly intent: string;
	readonly script_path: string;
	readonly argv: readonly string[];
	readonly run_policy: 'agent_allowed';
	readonly network: true;
	readonly destructive: true;
	readonly approval_required: readonly ['network_access', 'destructive_command'];
}

export interface ExternalSkillScriptTrust {
	readonly requested: boolean;
	readonly status: 'not_requested' | 'no_scripts' | 'planned' | 'trusted';
	readonly grants_command_authority: boolean;
	readonly command_contract_path: typeof COMMANDS_CONFIG_PATH | null;
	readonly include_entry: string | null;
	readonly fragment_path: string | null;
	readonly intents: readonly ExternalSkillTrustedScriptIntent[];
}

export interface ExternalSkillImportReport {
	readonly schema_version: '1';
	readonly kind: 'skill_import_report';
	readonly command: 'skill';
	readonly action: 'import';
	readonly ok: boolean;
	readonly mode: ExternalSkillImportMode;
	readonly status: ExternalSkillImportStatus;
	readonly source: ExternalSkillImportSource | null;
	readonly target: ExternalSkillImportTarget | null;
	readonly files: readonly ExternalSkillImportedFile[];
	readonly script_trust?: ExternalSkillScriptTrust;
	readonly warnings: readonly string[];
	readonly issues: readonly string[];
	readonly wrote_files: boolean;
}

export interface ExternalSkillImportOptions {
	readonly mode: ExternalSkillImportMode;
	readonly name?: string | null;
	readonly ref?: string | null;
	readonly trustScripts?: boolean;
	readonly fetch?: typeof fetch;
}

interface ParsedExternalSkillUrl {
	readonly host: ExternalSkillImportSource['host'];
	readonly owner: string;
	readonly repo: string;
	readonly ref: string;
	readonly skillPath: string;
	readonly sourceUrl: string;
}

interface GitHubContentEntry {
	readonly type: string;
	readonly name: string;
	readonly path: string;
	readonly download_url?: string | null;
	readonly content?: string;
	readonly encoding?: string;
}

interface LoadedExternalSkillFile {
	readonly relativePath: string;
	readonly kind: ExternalSkillFileKind;
	readonly content: string;
}

interface ExternalSkillFrontmatterParts {
	readonly name: string | null;
	readonly description: string | null;
	readonly body: string;
}

function normalizeRef(ref: string | null | undefined): string {
	return ref?.trim() || DEFAULT_GITHUB_REF;
}

function toPosixPath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\/+/u, '').replace(/\/+$/u, '');
}

function encodeGitHubPath(value: string): string {
	return toPosixPath(value)
		.split('/')
		.filter(Boolean)
		.map((segment) => encodeURIComponent(segment))
		.join('/');
}

function validateGitHubName(value: string, label: string): void {
	if (!value || !GITHUB_NAME_PATTERN.test(value) || value === '.' || value === '..') {
		throw new Error(`Invalid GitHub ${label}: ${value}`);
	}
}

function validateRelativeImportPath(value: string): string {
	const normalized = toPosixPath(value);

	if (!normalized || normalized.includes('\0')) {
		throw new Error(`Invalid external skill path: ${value}`);
	}

	const segments = normalized.split('/');
	if (segments.some((segment) => segment === '.' || segment === '..' || segment.length === 0)) {
		throw new Error(`External skill path must not contain traversal segments: ${value}`);
	}

	return normalized;
}

function skillDirectoryPathForBlobPath(blobPath: string): string {
	const normalized = validateRelativeImportPath(blobPath);

	if (!normalized.endsWith('SKILL.md')) {
		throw new Error('Blob and raw GitHub URLs must point to a SKILL.md file.');
	}

	return normalized.split('/').slice(0, -1).join('/');
}

function parseGitHubUrl(inputUrl: string, refOverride: string | null | undefined): ParsedExternalSkillUrl {
	let url: URL;
	try {
		url = new URL(inputUrl);
	} catch {
		throw new Error(`Unsupported external skill URL: ${inputUrl}`);
	}

	if (url.protocol !== 'https:') {
		throw new Error('External skill imports require an HTTPS GitHub URL.');
	}

	const pathParts = url.pathname.split('/').filter(Boolean);

	if (url.hostname === 'github.com') {
		const [owner, repo, mode, ref, ...rest] = pathParts;
		const ownerName = owner ?? '';
		const repoName = repo ?? '';
		validateGitHubName(ownerName, 'owner');
		validateGitHubName(repoName, 'repo');

		if (!mode) {
			const selectedRef = normalizeRef(refOverride);
			return {
				host: 'github.com',
				owner: ownerName,
				repo: repoName,
				ref: selectedRef,
				skillPath: '',
				sourceUrl: `https://github.com/${ownerName}/${repoName}`,
			};
		}

		if ((mode === 'tree' || mode === 'blob') && ref) {
			const selectedRef = normalizeRef(refOverride ?? ref);
			const sourcePath = rest.join('/');
			const skillPath = mode === 'blob' ? skillDirectoryPathForBlobPath(sourcePath) : validateRelativeImportPath(sourcePath);
			return {
				host: 'github.com',
				owner: ownerName,
				repo: repoName,
				ref: selectedRef,
				skillPath,
				sourceUrl: `https://github.com/${ownerName}/${repoName}/${mode}/${ref}/${sourcePath}`,
			};
		}
	}

	if (url.hostname === 'raw.githubusercontent.com') {
		const [owner, repo, ref, ...rest] = pathParts;
		const ownerName = owner ?? '';
		const repoName = repo ?? '';
		validateGitHubName(ownerName, 'owner');
		validateGitHubName(repoName, 'repo');
		if (!ref) {
			throw new Error('Raw GitHub URLs must include a ref.');
		}

		const rawPath = rest.join('/');
		const selectedRef = normalizeRef(refOverride ?? ref);
		return {
			host: 'raw.githubusercontent.com',
			owner: ownerName,
			repo: repoName,
			ref: selectedRef,
			skillPath: skillDirectoryPathForBlobPath(rawPath),
			sourceUrl: `https://raw.githubusercontent.com/${ownerName}/${repoName}/${ref}/${rawPath}`,
		};
	}

	throw new Error('Only github.com and raw.githubusercontent.com skill URLs are supported.');
}

function externalSkillSourceFromParsed(inputUrl: string, parsed: ParsedExternalSkillUrl): ExternalSkillImportSource {
	return {
		input_url: inputUrl,
		host: parsed.host,
		owner: parsed.owner,
		repo: parsed.repo,
		ref: parsed.ref,
		skill_path: parsed.skillPath,
		source_url: parsed.sourceUrl,
	};
}

function sanitizeSkillName(value: string): string {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/gu, '-')
		.replace(/^-+|-+$/gu, '')
		.replace(/-{2,}/gu, '-');
}

function commandSafeSegment(value: string): string {
	return sanitizeSkillName(value).replace(/-/gu, '_');
}

function readFrontmatterScalar(content: string, key: string): string | null {
	if (!content.startsWith('---')) {
		return null;
	}

	const firstLineEnd = content.indexOf('\n');
	const end = firstLineEnd >= 0 ? content.indexOf('\n---', firstLineEnd + 1) : -1;
	if (firstLineEnd < 0 || end < 0) {
		return null;
	}

	for (const line of content.slice(firstLineEnd + 1, end).split(/\r?\n/u)) {
		const match = /^([a-zA-Z0-9_]+):\s*(.*)$/u.exec(line);
		if (match?.[1] === key) {
			return match[2].trim().replace(/^["']|["']$/gu, '') || null;
		}
	}

	return null;
}

function targetNameForSkill(files: readonly LoadedExternalSkillFile[], parsed: ParsedExternalSkillUrl, nameOverride: string | null | undefined): string {
	const candidate = nameOverride?.trim()
		?? readFrontmatterScalar(files.find((file) => file.relativePath === 'SKILL.md')?.content ?? '', 'name')
		?? parsed.skillPath.split('/').filter(Boolean).pop()
		?? parsed.repo;
	const sanitized = sanitizeSkillName(candidate);

	if (!SLUG_PATTERN.test(sanitized)) {
		throw new Error(`External skill name cannot be converted to a safe slug: ${candidate}`);
	}

	return sanitized;
}

function kindForRelativePath(relativePath: string): ExternalSkillFileKind {
	if (relativePath === 'SKILL.md') {
		return 'skill';
	}

	const [topLevel] = relativePath.split('/');
	if (topLevel === 'scripts') {
		return 'script';
	}
	if (topLevel === 'assets') {
		return 'asset';
	}

	return 'reference';
}

function validateImportRelativeFilePath(relativePath: string): string {
	const normalized = validateRelativeImportPath(relativePath);
	const [topLevel] = normalized.split('/');

	if (normalized === 'SKILL.md') {
		return normalized;
	}

	if (!ALLOWED_SUPPORT_DIRECTORIES.has(topLevel)) {
		throw new Error(`External skill import rejected unsupported file path: ${relativePath}`);
	}

	return normalized;
}

function normalizeTextContent(content: string): string {
	return content.replace(/\r\n?/gu, '\n');
}

function readFrontmatterParts(content: string): ExternalSkillFrontmatterParts {
	if (!content.startsWith('---')) {
		return {
			name: null,
			description: null,
			body: content,
		};
	}

	const firstLineEnd = content.indexOf('\n');
	const end = firstLineEnd >= 0 ? content.indexOf('\n---', firstLineEnd + 1) : -1;
	if (firstLineEnd < 0 || end < 0) {
		return {
			name: null,
			description: null,
			body: content,
		};
	}

	const frontmatter = content.slice(firstLineEnd + 1, end).split(/\r?\n/u);
	const bodyStart = content.indexOf('\n', end + 1);

	return {
		name: readFrontmatterScalar(content, 'name'),
		description: readFrontmatterScalar(content, 'description'),
		body: bodyStart >= 0 ? content.slice(bodyStart + 1) : '',
	};
}

function renderYamlScalar(key: string, value: string): string {
	return `${key}: ${JSON.stringify(value)}`;
}

function sanitizeExternalSkillMarkdown(content: string): string {
	const frontmatter = readFrontmatterParts(content);
	const lines = [
		'---',
		...(frontmatter.name ? [renderYamlScalar('name', frontmatter.name)] : []),
		...(frontmatter.description ? [renderYamlScalar('description', frontmatter.description)] : []),
		'external_authority: untrusted',
		'---',
		frontmatter.body,
	];

	return lines.join('\n');
}

function normalizeImportedSkillFiles(files: readonly LoadedExternalSkillFile[]): LoadedExternalSkillFile[] {
	return files.map((file) => ({
		...file,
		content: file.relativePath === 'SKILL.md' ? sanitizeExternalSkillMarkdown(file.content) : file.content,
	}));
}

function hashContent(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

function isGitHubNotFoundError(error: unknown): boolean {
	return error instanceof Error && /\(404\)/u.test(error.message);
}

async function readResponseText(response: Response, url: string): Promise<string> {
	if (!response.ok) {
		throw new Error(`GitHub request failed (${response.status}) for ${url}`);
	}

	const text = await response.text();
	if (Buffer.byteLength(text, 'utf8') > MAX_FILE_BYTES) {
		throw new Error(`External skill file exceeds ${MAX_FILE_BYTES} bytes: ${url}`);
	}

	return normalizeTextContent(text);
}

async function fetchJson(fetchImpl: typeof fetch, url: string): Promise<unknown> {
	const response = await fetchImpl(url, {
		headers: {
			accept: 'application/vnd.github+json',
			'user-agent': 'mustflow-external-skill-import',
		},
	});

	if (!response.ok) {
		throw new Error(`GitHub request failed (${response.status}) for ${url}`);
	}

	return response.json() as Promise<unknown>;
}

function apiContentsUrl(parsed: ParsedExternalSkillUrl, relativePath: string): string {
	const fullPath = [parsed.skillPath, relativePath].filter(Boolean).join('/');
	const encodedPath = encodeGitHubPath(fullPath);
	const pathSuffix = encodedPath ? `/${encodedPath}` : '';
	return `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contents${pathSuffix}?ref=${encodeURIComponent(parsed.ref)}`;
}

function decodeGitHubFileContent(entry: GitHubContentEntry): string {
	if (entry.encoding !== 'base64' || typeof entry.content !== 'string') {
		throw new Error(`GitHub content API response did not include base64 content for ${entry.path}`);
	}

	return normalizeTextContent(Buffer.from(entry.content.replace(/\s+/gu, ''), 'base64').toString('utf8'));
}

function assertGitHubContentEntry(value: unknown): GitHubContentEntry {
	if (!value || typeof value !== 'object') {
		throw new Error('Unexpected GitHub contents API response.');
	}

	const record = value as Record<string, unknown>;
	if (typeof record.type !== 'string' || typeof record.name !== 'string' || typeof record.path !== 'string') {
		throw new Error('Unexpected GitHub contents API entry shape.');
	}

	return record as unknown as GitHubContentEntry;
}

async function loadGitHubFile(fetchImpl: typeof fetch, parsed: ParsedExternalSkillUrl, relativePath: string): Promise<LoadedExternalSkillFile> {
	const normalizedRelativePath = validateImportRelativeFilePath(relativePath);
	const apiUrl = apiContentsUrl(parsed, normalizedRelativePath);
	const entry = assertGitHubContentEntry(await fetchJson(fetchImpl, apiUrl));

	if (entry.type !== 'file') {
		throw new Error(`Expected a file in GitHub contents API response: ${normalizedRelativePath}`);
	}

	const content = entry.download_url
		? await readResponseText(await fetchImpl(entry.download_url), entry.download_url)
		: decodeGitHubFileContent(entry);

	return {
		relativePath: normalizedRelativePath,
		kind: kindForRelativePath(normalizedRelativePath),
		content,
	};
}

async function listGitHubDirectory(fetchImpl: typeof fetch, parsed: ParsedExternalSkillUrl, relativePath: string): Promise<GitHubContentEntry[]> {
	const apiUrl = apiContentsUrl(parsed, relativePath);
	const value = await fetchJson(fetchImpl, apiUrl);
	if (!Array.isArray(value)) {
		throw new Error(`Expected a directory in GitHub contents API response: ${relativePath || '.'}`);
	}

	return value.map(assertGitHubContentEntry);
}

async function loadSupportDirectory(
	fetchImpl: typeof fetch,
	parsed: ParsedExternalSkillUrl,
	directory: string,
): Promise<LoadedExternalSkillFile[]> {
	let entries: GitHubContentEntry[];
	try {
		entries = await listGitHubDirectory(fetchImpl, parsed, directory);
	} catch (error) {
		if (isGitHubNotFoundError(error)) {
			return [];
		}
		throw error;
	}

	const files: LoadedExternalSkillFile[] = [];
	const pending = entries
		.filter((entry) => entry.type === 'file')
		.map((entry) => `${directory}/${entry.name}`)
		.sort((left, right) => left.localeCompare(right));

	for (const relativePath of pending) {
		files.push(await loadGitHubFile(fetchImpl, parsed, relativePath));
	}

	return files;
}

async function loadExternalSkillFiles(
	fetchImpl: typeof fetch,
	parsed: ParsedExternalSkillUrl,
): Promise<LoadedExternalSkillFile[]> {
	const files = [
		await loadGitHubFile(fetchImpl, parsed, 'SKILL.md'),
		...(await loadSupportDirectory(fetchImpl, parsed, 'assets')),
		...(await loadSupportDirectory(fetchImpl, parsed, 'references')),
		...(await loadSupportDirectory(fetchImpl, parsed, 'scripts')),
	].sort((left, right) => left.relativePath.localeCompare(right.relativePath));

	if (files.length > MAX_IMPORTED_FILES) {
		throw new Error(`External skill import exceeds ${MAX_IMPORTED_FILES} files.`);
	}

	const totalBytes = files.reduce((total, file) => total + Buffer.byteLength(file.content, 'utf8'), 0);
	if (totalBytes > MAX_TOTAL_BYTES) {
		throw new Error(`External skill import exceeds ${MAX_TOTAL_BYTES} bytes.`);
	}

	return files;
}

function fileReports(files: readonly LoadedExternalSkillFile[]): ExternalSkillImportedFile[] {
	return files.map((file) => ({
		relative_path: file.relativePath,
		kind: file.kind,
		bytes: Buffer.byteLength(file.content, 'utf8'),
		sha256: hashContent(file.content),
	}));
}

function createTarget(skillName: string): ExternalSkillImportTarget {
	const skillDir = `${EXTERNAL_SKILL_ROOT}/${skillName}`;
	return {
		root: EXTERNAL_SKILL_ROOT,
		skill_name: skillName,
		skill_dir: skillDir,
		provenance_path: `${skillDir}/${PROVENANCE_FILE}`,
	};
}

function scriptNameForIntent(relativePath: string): string {
	const basename = path.posix.basename(relativePath);
	const withoutExtension = basename.replace(/\.[^.]+$/u, '');
	const sanitized = commandSafeSegment(withoutExtension);

	if (!sanitized) {
		throw new Error(`External script path cannot be converted to a safe intent name: ${relativePath}`);
	}

	return sanitized;
}

function trustedScriptArgv(skillName: string, scriptPath: string): readonly string[] {
	const extension = path.posix.extname(scriptPath).toLowerCase();
	const projectScriptPath = `${EXTERNAL_SKILL_ROOT}/${skillName}/${scriptPath}`;

	if (['.js', '.mjs', '.cjs'].includes(extension)) {
		return ['node', projectScriptPath];
	}
	if (['.ts', '.mts', '.cts'].includes(extension)) {
		return ['bun', projectScriptPath];
	}
	if (extension === '.ps1') {
		return ['pwsh', '-NoProfile', '-File', projectScriptPath];
	}
	if (extension === '.sh') {
		return ['sh', projectScriptPath];
	}

	throw new Error(`External script import cannot create a trusted command intent for unsupported script type: ${scriptPath}`);
}

function createTrustedScriptIntent(skillName: string, scriptPath: string): ExternalSkillTrustedScriptIntent {
	return {
		intent: `external_skill_${commandSafeSegment(skillName)}_${scriptNameForIntent(scriptPath)}`,
		script_path: scriptPath,
		argv: trustedScriptArgv(skillName, scriptPath),
		run_policy: 'agent_allowed',
		network: true,
		destructive: true,
		approval_required: ['network_access', 'destructive_command'],
	};
}

function createScriptTrust(
	projectRoot: string,
	target: ExternalSkillImportTarget,
	files: readonly ExternalSkillImportedFile[],
	trustScripts: boolean,
	mode: ExternalSkillImportMode,
): ExternalSkillScriptTrust {
	const scripts = files.filter((file) => file.kind === 'script');
	if (!trustScripts) {
		return {
			requested: false,
			status: 'not_requested',
			grants_command_authority: false,
			command_contract_path: null,
			include_entry: null,
			fragment_path: null,
			intents: [],
		};
	}

	if (scripts.length === 0) {
		return {
			requested: true,
			status: 'no_scripts',
			grants_command_authority: false,
			command_contract_path: null,
			include_entry: null,
			fragment_path: null,
			intents: [],
		};
	}

	const fragmentName = `external-skills-${target.skill_name}.toml`;
	const includeEntry = `commands/${fragmentName}`;
	const fragmentPath = `${COMMAND_FRAGMENT_DIRECTORY}/${fragmentName}`;
	const intents = scripts.map((script) => createTrustedScriptIntent(target.skill_name, script.relative_path));
	const duplicateIntent = findDuplicate(intents.map((intent) => intent.intent));
	if (duplicateIntent) {
		throw new Error(`External skill trusted script intents contain a duplicate name: ${duplicateIntent}`);
	}

	validateTrustedScriptCommandPlan(projectRoot, includeEntry, fragmentPath, intents);

	return {
		requested: true,
		status: mode === 'install' ? 'trusted' : 'planned',
		grants_command_authority: mode === 'install',
		command_contract_path: COMMANDS_CONFIG_PATH,
		include_entry: includeEntry,
		fragment_path: fragmentPath,
		intents,
	};
}

function findDuplicate(values: readonly string[]): string | null {
	const seen = new Set<string>();
	for (const value of values) {
		if (seen.has(value)) {
			return value;
		}
		seen.add(value);
	}

	return null;
}

function validateTrustedScriptCommandPlan(
	projectRoot: string,
	includeEntry: string,
	fragmentPath: string,
	intents: readonly ExternalSkillTrustedScriptIntent[],
): void {
	const existingIncludes = new Set(readCommandContractIncludePaths(projectRoot).map((entry) =>
		entry.replace(/^\.mustflow\/config\//u, ''),
	));
	if (existingIncludes.has(includeEntry)) {
		throw new Error(`External skill trusted script command include already exists: ${includeEntry}`);
	}
	if (existsSync(path.join(projectRoot, ...fragmentPath.split('/')))) {
		throw new Error(`External skill trusted script command fragment already exists: ${fragmentPath}`);
	}

	const contract = readCommandContract(projectRoot);
	for (const intent of intents) {
		if (Object.prototype.hasOwnProperty.call(contract.intents, intent.intent)) {
			throw new Error(`External skill trusted script intent already exists in command contract: ${intent.intent}`);
		}
	}
}

function renderTomlString(value: string): string {
	return JSON.stringify(value);
}

function renderTomlStringArray(values: readonly string[]): string {
	return `[${values.map(renderTomlString).join(', ')}]`;
}

function renderTrustedScriptCommandFragment(
	target: ExternalSkillImportTarget,
	source: ExternalSkillImportSource,
	scriptTrust: ExternalSkillScriptTrust,
): string {
	const lines = [
		`# Generated by mf skill import --trust-scripts for external skill ${JSON.stringify(target.skill_name)}.`,
		`# Source: ${source.source_url}`,
		'# These intents execute imported external script files. They are agent-runnable only through mf run,',
		'# and remain gated by network_access and destructive_command approvals.',
		'',
	];

	for (const intent of scriptTrust.intents) {
		lines.push(
			`[intents.${intent.intent}]`,
			'status = "configured"',
			'lifecycle = "oneshot"',
			'run_policy = "agent_allowed"',
			`description = ${renderTomlString(`Run trusted external skill script ${intent.script_path} from ${target.skill_name}.`)}`,
			`argv = ${renderTomlStringArray(intent.argv)}`,
			'cwd = "."',
			'timeout_seconds = 300',
			'stdin = "closed"',
			'success_exit_codes = [0]',
			'writes = []',
			'network = true',
			'destructive = true',
			'env_policy = "minimal"',
			'',
		);
	}

	return lines.join('\n');
}

function updateCommandIncludeText(content: string, includeEntry: string): string {
	const normalizedContent = content.replace(/\r\n?/gu, '\n');
	const lines = normalizedContent.split('\n');
	const includeLineIndex = lines.findIndex((line) => /^\s*\[include\]\s*$/u.test(line));
	const includeLine = `  ${renderTomlString(includeEntry)},`;

	if (includeLineIndex < 0) {
		const separator = normalizedContent.endsWith('\n') ? '' : '\n';
		return `${normalizedContent}${separator}\n[include]\nfiles = [\n${includeLine}\n]\n`;
	}

	const nextSectionIndex = lines.findIndex((line, index) => index > includeLineIndex && /^\s*\[[^\]]+\]\s*$/u.test(line));
	const sectionEnd = nextSectionIndex < 0 ? lines.length : nextSectionIndex;
	const filesLineIndex = lines.findIndex((line, index) =>
		index > includeLineIndex &&
		index < sectionEnd &&
		/^\s*files\s*=\s*\[/u.test(line),
	);

	if (filesLineIndex < 0) {
		lines.splice(includeLineIndex + 1, 0, 'files = [', includeLine, ']');
		return lines.join('\n');
	}

	if (lines[filesLineIndex].includes(']')) {
		const existingValues = [...lines[filesLineIndex].matchAll(/"([^"]+)"/gu)].map((match) => match[1]);
		const values = [...new Set([...existingValues, includeEntry])].sort((left, right) => left.localeCompare(right));
		lines.splice(
			filesLineIndex,
			1,
			'files = [',
			...values.map((entry) => `  ${renderTomlString(entry)},`),
			']',
		);
		return lines.join('\n');
	}

	const closingLineIndex = lines.findIndex((line, index) => index > filesLineIndex && index < sectionEnd && /^\s*\]\s*$/u.test(line));
	if (closingLineIndex < 0) {
		throw new Error(`[include].files in ${COMMANDS_CONFIG_PATH} must be a TOML array`);
	}

	lines.splice(closingLineIndex, 0, includeLine);
	return lines.join('\n');
}

function writeTrustedScriptCommandContract(
	projectRoot: string,
	target: ExternalSkillImportTarget,
	source: ExternalSkillImportSource,
	scriptTrust: ExternalSkillScriptTrust,
): void {
	if (scriptTrust.status !== 'trusted' || !scriptTrust.fragment_path || !scriptTrust.include_entry) {
		return;
	}

	const fragmentContent = renderTrustedScriptCommandFragment(target, source, scriptTrust);
	writeUtf8FileInsideWithoutSymlinks(
		projectRoot,
		path.join(projectRoot, ...scriptTrust.fragment_path.split('/')),
		fragmentContent,
	);

	const commandsPath = path.join(projectRoot, ...COMMANDS_CONFIG_PATH.split('/'));
	const commandsContent = readUtf8FileInsideWithoutSymlinks(projectRoot, commandsPath, { maxBytes: 256 * 1024 });
	writeUtf8FileInsideWithoutSymlinks(
		projectRoot,
		commandsPath,
		updateCommandIncludeText(commandsContent, scriptTrust.include_entry),
	);
}

function writeImportedSkillFiles(
	projectRoot: string,
	target: ExternalSkillImportTarget,
	source: ExternalSkillImportSource,
	files: readonly LoadedExternalSkillFile[],
	fileReport: readonly ExternalSkillImportedFile[],
	warnings: readonly string[],
	scriptTrust: ExternalSkillScriptTrust,
): void {
	const targetPath = path.join(projectRoot, ...target.skill_dir.split('/'));
	const skillPath = path.join(targetPath, 'SKILL.md');
	if (existsSync(targetPath)) {
		throw new Error(`External skill already exists: ${target.skill_dir}`);
	}

	ensureFileTargetInsideWithoutSymlinks(projectRoot, skillPath, { allowMissingLeaf: true });
	const tempSkillDir = `${EXTERNAL_SKILL_ROOT}/.${target.skill_name}.tmp-${process.pid}-${Date.now()}`;
	const tempTarget = {
		...target,
		skill_dir: tempSkillDir,
		provenance_path: `${tempSkillDir}/${PROVENANCE_FILE}`,
	};
	const tempPath = path.join(projectRoot, ...tempTarget.skill_dir.split('/'));
	const tempSkillPath = path.join(tempPath, 'SKILL.md');
	ensureFileTargetInsideWithoutSymlinks(projectRoot, tempSkillPath, { allowMissingLeaf: true });

	try {
		for (const file of files) {
			writeUtf8FileInsideWithoutSymlinks(
				projectRoot,
				path.join(projectRoot, ...tempTarget.skill_dir.split('/'), ...file.relativePath.split('/')),
				file.content,
			);
		}

		writeJsonFileInsideWithoutSymlinks(projectRoot, path.join(projectRoot, ...tempTarget.provenance_path.split('/')), {
			schema_version: '1',
			kind: 'external_skill_source',
			source,
			files: fileReport,
			script_trust: scriptTrust,
			warnings,
		});
		renameSync(tempPath, targetPath);
	} catch (error) {
		rmSync(tempPath, { recursive: true, force: true });
		throw error;
	}
}

function rejectionReport(mode: ExternalSkillImportMode, issue: string): ExternalSkillImportReport {
	return {
		schema_version: '1',
		kind: 'skill_import_report',
		command: 'skill',
		action: 'import',
		ok: false,
		mode,
		status: 'rejected',
		source: null,
		target: null,
		files: [],
		warnings: [],
		issues: [issue],
		wrote_files: false,
	};
}

export async function createExternalSkillImportReport(
	projectRoot: string,
	inputUrl: string,
	options: ExternalSkillImportOptions,
): Promise<ExternalSkillImportReport> {
	const mode = options.mode;

	try {
		const parsed = parseGitHubUrl(inputUrl, options.ref);
		const fetchImpl = options.fetch ?? globalThis.fetch;
		if (typeof fetchImpl !== 'function') {
			throw new Error('This runtime does not provide fetch.');
		}

		const sourceFiles = await loadExternalSkillFiles(fetchImpl, parsed);
		const skillName = targetNameForSkill(sourceFiles, parsed, options.name);
		const target = createTarget(skillName);
		const source = externalSkillSourceFromParsed(inputUrl, parsed);
		const files = normalizeImportedSkillFiles(sourceFiles);
		const reports = fileReports(files);
		const scriptTrust = createScriptTrust(projectRoot, target, reports, options.trustScripts === true, mode);
		const warnings = [
			...(reports.some((file) => file.kind === 'script') && scriptTrust.status !== 'trusted'
				? ['Imported scripts are inert reference files; mustflow does not grant command authority for external scripts.']
				: []),
			...(scriptTrust.status === 'trusted'
				? ['Imported scripts were trusted by request; mustflow created command-contract intents gated by network and destructive approvals.']
				: []),
			...(scriptTrust.status === 'planned'
				? ['Imported scripts would be trusted by request during install; dry-run only reports the command-contract plan.']
				: []),
			'External skills are untrusted until the agent reads and evaluates the selected SKILL.md.',
		];

		if (mode === 'install') {
			try {
				writeImportedSkillFiles(projectRoot, target, source, files, reports, warnings, scriptTrust);
				writeTrustedScriptCommandContract(projectRoot, target, source, scriptTrust);
			} catch (error) {
				rmSync(path.join(projectRoot, ...target.skill_dir.split('/')), { recursive: true, force: true });
				if (scriptTrust.fragment_path) {
					rmSync(path.join(projectRoot, ...scriptTrust.fragment_path.split('/')), { force: true });
				}
				throw error;
			}
		}

		return {
			schema_version: '1',
			kind: 'skill_import_report',
			command: 'skill',
			action: 'import',
			ok: true,
			mode,
			status: mode === 'install' ? 'installed' : 'preview',
			source,
			target,
			files: reports,
			script_trust: scriptTrust,
			warnings,
			issues: [],
			wrote_files: mode === 'install',
		};
	} catch (error) {
		return rejectionReport(mode, error instanceof Error ? error.message : String(error));
	}
}
