import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';
import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readFileInsideWithoutSymlinks } from './safe-filesystem.js';

export const SECRET_RISK_SCAN_PACK_ID = 'repo';
export const SECRET_RISK_SCAN_SCRIPT_ID = 'secret-risk-scan';
export const SECRET_RISK_SCAN_SCRIPT_REF = `${SECRET_RISK_SCAN_PACK_ID}/${SECRET_RISK_SCAN_SCRIPT_ID}`;

export type SecretRiskScanAction = 'scan';
export type SecretRiskTargetKind = 'file' | 'directory' | 'missing' | 'other' | 'unknown';
export type SecretRiskSurface = 'code' | 'config' | 'ci' | 'docs' | 'example';
export type SecretRiskDetector =
	| 'private_key_block'
	| 'bearer_token'
	| 'provider_token'
	| 'generic_assignment'
	| 'realistic_env_example'
	| 'secret_file_skipped';

export type SecretRiskFindingCode =
	| 'secret_risk_path_outside_root'
	| 'secret_risk_unreadable_path'
	| 'secret_risk_secret_file_skipped'
	| 'secret_risk_max_files_exceeded'
	| 'secret_risk_max_findings_exceeded'
	| 'secret_risk_private_key_block'
	| 'secret_risk_bearer_token'
	| 'secret_risk_provider_token'
	| 'secret_risk_generic_assignment'
	| 'secret_risk_realistic_env_example';

export interface SecretRiskScanPolicy {
	readonly max_file_bytes: number;
	readonly max_files: number;
	readonly max_findings: number;
	readonly extensions: readonly string[];
	readonly skipped_secret_names: readonly string[];
	readonly ignored_directories: readonly string[];
}

export interface SecretRiskTarget {
	readonly input: string;
	readonly path: string;
	readonly exists: boolean | null;
	readonly kind: SecretRiskTargetKind;
}

export interface SecretRiskFinding extends ScriptCheckFinding {
	readonly code: SecretRiskFindingCode;
	readonly path: string;
	readonly line?: number;
	readonly detector?: SecretRiskDetector;
	readonly fingerprint?: string;
}

export interface SecretRiskSummary {
	readonly target_count: number;
	readonly file_count: number;
	readonly finding_count: number;
	readonly skipped_secret_file_count: number;
	readonly high_or_critical_count: number;
}

export interface SecretRiskScanReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof SECRET_RISK_SCAN_PACK_ID;
	readonly script_id: typeof SECRET_RISK_SCAN_SCRIPT_ID;
	readonly script_ref: typeof SECRET_RISK_SCAN_SCRIPT_REF;
	readonly action: SecretRiskScanAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: SecretRiskScanPolicy;
	readonly input_hash: string;
	readonly targets: readonly SecretRiskTarget[];
	readonly summary: SecretRiskSummary;
	readonly truncated: boolean;
	readonly findings: readonly SecretRiskFinding[];
	readonly issues: readonly string[];
}

export interface InspectSecretRiskScanOptions {
	readonly paths?: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
	readonly maxFindings?: number;
}

interface SecretRiskCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly surface: SecretRiskSurface;
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_MAX_FINDINGS = 200;
const MAX_ISSUES = 50;
const SCAN_EXTENSIONS = [
	'.ts',
	'.tsx',
	'.mts',
	'.cts',
	'.js',
	'.jsx',
	'.mjs',
	'.cjs',
	'.json',
	'.toml',
	'.yml',
	'.yaml',
	'.md',
	'.mdx',
] as const;
const SECRET_FILE_NAMES = ['.env', '.env.local', '.env.production', '.env.development', '.dev.vars'] as const;
const ENV_EXAMPLE_NAMES = [
	'.env.example',
	'.env.sample',
	'.env.template',
	'.env.defaults',
	'.env.test.example',
	'.env.local.example',
	'.dev.vars.example',
] as const;
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const ERROR_CODES = new Set<SecretRiskFindingCode>([
	'secret_risk_path_outside_root',
	'secret_risk_unreadable_path',
]);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '') || '.';
}

function fingerprint(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function makeFinding(
	code: SecretRiskFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	details: {
		readonly line?: number;
		readonly detector?: SecretRiskDetector;
		readonly fingerprint?: string;
	} = {},
): SecretRiskFinding {
	return { code, severity, path: pathValue, message, ...details };
}

function isIgnoredDirectory(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), IGNORED_DIRECTORIES);
}

function isSecretFile(relativePath: string): boolean {
	return SECRET_FILE_NAMES.includes(path.basename(relativePath).toLowerCase() as (typeof SECRET_FILE_NAMES)[number]);
}

function isEnvExampleFile(relativePath: string): boolean {
	return ENV_EXAMPLE_NAMES.includes(path.basename(relativePath).toLowerCase() as (typeof ENV_EXAMPLE_NAMES)[number]);
}

function surfaceForPath(relativePath: string): SecretRiskSurface | null {
	if (isEnvExampleFile(relativePath)) {
		return 'example';
	}
	const normalized = normalizeRelativePath(relativePath);
	const extension = path.extname(normalized).toLowerCase();
	if (!SCAN_EXTENSIONS.includes(extension as (typeof SCAN_EXTENSIONS)[number])) {
		return null;
	}
	if (normalized.startsWith('.github/workflows/') || ['.yml', '.yaml'].includes(extension)) {
		return 'ci';
	}
	if (['.md', '.mdx'].includes(extension)) {
		return 'docs';
	}
	if (['.json', '.toml'].includes(extension) || normalized.startsWith('.mustflow/config/')) {
		return 'config';
	}
	return 'code';
}

function normalizeTargetPath(projectRoot: string, targetPath: string): { readonly absolutePath: string; readonly relativePath: string } {
	const absolutePath = path.resolve(process.cwd(), targetPath);
	ensureInside(projectRoot, absolutePath);
	return {
		absolutePath,
		relativePath: normalizeRelativePath(path.relative(projectRoot, absolutePath)),
	};
}

function targetKind(absolutePath: string): { readonly exists: boolean; readonly kind: SecretRiskTargetKind } {
	if (!existsSync(absolutePath)) {
		return { exists: false, kind: 'missing' };
	}
	const stats = lstatSync(absolutePath);
	if (stats.isFile()) {
		return { exists: true, kind: 'file' };
	}
	if (stats.isDirectory()) {
		return { exists: true, kind: 'directory' };
	}
	return { exists: true, kind: 'other' };
}

function addCandidate(
	candidates: Map<string, SecretRiskCandidate>,
	findings: SecretRiskFinding[],
	issues: string[],
	policy: SecretRiskScanPolicy,
	candidate: SecretRiskCandidate,
): void {
	if (candidates.has(candidate.relativePath)) {
		return;
	}
	if (candidates.size >= policy.max_files) {
		if (!findings.some((finding) => finding.code === 'secret_risk_max_files_exceeded')) {
			const message = `Secret-risk scan matched more than ${policy.max_files} files; remaining files were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('secret_risk_max_files_exceeded', 'medium', candidate.relativePath, message));
		}
		return;
	}
	candidates.set(candidate.relativePath, candidate);
}

function collectFilesFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: Map<string, SecretRiskCandidate>,
	findings: SecretRiskFinding[],
	issues: string[],
	policy: SecretRiskScanPolicy,
): void {
	const relativeDirectory = normalizeRelativePath(path.relative(projectRoot, absoluteDirectory));
	if (isIgnoredDirectory(relativeDirectory)) {
		return;
	}

	let entries;
	try {
		ensureInsideWithoutSymlinks(projectRoot, absoluteDirectory);
		entries = readdirSync(absoluteDirectory, { withFileTypes: true });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${relativeDirectory}: ${message}`);
		findings.push(makeFinding('secret_risk_unreadable_path', 'high', relativeDirectory, message));
		return;
	}

	for (const entry of entries) {
		const absoluteEntry = path.join(absoluteDirectory, entry.name);
		const relativeEntry = normalizeRelativePath(path.relative(projectRoot, absoluteEntry));
		if (entry.isDirectory()) {
			collectFilesFromDirectory(projectRoot, absoluteEntry, candidates, findings, issues, policy);
			continue;
		}
		if (!entry.isFile()) {
			continue;
		}
		const surface = surfaceForPath(relativeEntry);
		if (surface || isSecretFile(relativeEntry)) {
			addCandidate(candidates, findings, issues, policy, { absolutePath: absoluteEntry, relativePath: relativeEntry, surface: surface ?? 'config' });
		}
	}
}

function lineNumberAtIndex(text: string, index: number): number {
	let line = 1;
	let offset = 0;
	while (offset < index) {
		if (text.charCodeAt(offset) === 10) {
			line += 1;
		}
		offset += 1;
	}
	return line;
}

function looksLikePlaceholder(value: string): boolean {
	const normalized = value.trim().replace(/^['"`]|['"`]$/gu, '').toLowerCase();
	if (normalized.length === 0) {
		return true;
	}
	if (/^(?:example|sample|dummy|fake|test|changeme|change_me|placeholder|todo|null|undefined|your[_-].*|xxx+|\*+)$/u.test(normalized)) {
		return true;
	}
	return (
		(normalized.startsWith('<') && normalized.endsWith('>')) ||
		(normalized.startsWith('${') && normalized.endsWith('}')) ||
		(normalized.startsWith('{{') && normalized.endsWith('}}'))
	);
}

function entropyScore(value: string): number {
	const normalized = value.trim();
	if (normalized.length === 0) {
		return 0;
	}
	const counts = new Map<string, number>();
	for (const character of normalized) {
		counts.set(character, (counts.get(character) ?? 0) + 1);
	}
	let entropy = 0;
	for (const count of counts.values()) {
		const probability = count / normalized.length;
		entropy -= probability * Math.log2(probability);
	}
	return entropy;
}

function isSecretLikeName(name: string): boolean {
	return /(?:SECRET|TOKEN|PASSWORD|PASS|PRIVATE|CREDENTIAL|API[_-]?KEY|ACCESS[_-]?KEY|AUTH|SESSION|SIGNING|WEBHOOK)/iu.test(name);
}

function looksLikeSecretValue(value: string): boolean {
	const cleaned = value.trim().replace(/^['"`]|['"`]$/gu, '');
	if (looksLikePlaceholder(cleaned)) {
		return false;
	}
	if (/^(?:sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})$/u.test(cleaned)) {
		return true;
	}
	return cleaned.length >= 24 && entropyScore(cleaned) >= 3.5 && /[A-Za-z]/u.test(cleaned) && /\d/u.test(cleaned);
}

function addBoundedFinding(
	findings: SecretRiskFinding[],
	issues: string[],
	policy: SecretRiskScanPolicy,
	finding: SecretRiskFinding,
): void {
	if (findings.length >= policy.max_findings) {
		if (!findings.some((entry) => entry.code === 'secret_risk_max_findings_exceeded')) {
			const message = `Secret-risk scan found more than ${policy.max_findings} findings; remaining findings were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('secret_risk_max_findings_exceeded', 'medium', finding.path, message));
		}
		return;
	}
	findings.push(finding);
}

function scanPattern(
	text: string,
	candidate: SecretRiskCandidate,
	findings: SecretRiskFinding[],
	issues: string[],
	policy: SecretRiskScanPolicy,
	pattern: RegExp,
	create: (match: RegExpMatchArray, line: number) => SecretRiskFinding | null,
): void {
	for (const match of text.matchAll(pattern)) {
		const line = lineNumberAtIndex(text, match.index ?? 0);
		const finding = create(match, line);
		if (finding) {
			addBoundedFinding(findings, issues, policy, finding);
		}
	}
}

function scanPrivateKeyBlocks(
	text: string,
	candidate: SecretRiskCandidate,
	findings: SecretRiskFinding[],
	issues: string[],
	policy: SecretRiskScanPolicy,
): void {
	scanPattern(text, candidate, findings, issues, policy, /-----BEGIN [A-Z ]*PRIVATE KEY-----/gu, (match, line) =>
		makeFinding('secret_risk_private_key_block', 'critical', candidate.relativePath, 'Private key block marker found.', {
			line,
			detector: 'private_key_block',
			fingerprint: fingerprint(match[0]),
		}),
	);
}

function scanBearerTokens(text: string, candidate: SecretRiskCandidate, findings: SecretRiskFinding[], issues: string[], policy: SecretRiskScanPolicy): void {
	scanPattern(text, candidate, findings, issues, policy, /\bBearer\s+(?<value>[A-Za-z0-9._~+/=-]{24,})\b/gu, (match, line) => {
		const value = match.groups?.value ?? '';
		if (!looksLikeSecretValue(value)) {
			return null;
		}
		return makeFinding('secret_risk_bearer_token', 'high', candidate.relativePath, 'Bearer token-like value found.', {
			line,
			detector: 'bearer_token',
			fingerprint: fingerprint(value),
		});
	});
}

function scanProviderTokens(text: string, candidate: SecretRiskCandidate, findings: SecretRiskFinding[], issues: string[], policy: SecretRiskScanPolicy): void {
	const pattern = /\b(?<value>sk-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})\b/gu;
	scanPattern(text, candidate, findings, issues, policy, pattern, (match, line) => {
		const value = match.groups?.value ?? '';
		if (looksLikePlaceholder(value)) {
			return null;
		}
		return makeFinding('secret_risk_provider_token', 'high', candidate.relativePath, 'Provider token-like value found.', {
			line,
			detector: 'provider_token',
			fingerprint: fingerprint(value),
		});
	});
}

function scanAssignments(text: string, candidate: SecretRiskCandidate, findings: SecretRiskFinding[], issues: string[], policy: SecretRiskScanPolicy): void {
	const pattern =
		/(?:const|let|var|export\s+const|export\s+let|export\s+var)?\s*(?<name>[A-Za-z_][A-Za-z0-9_.-]*(?:SECRET|TOKEN|PASSWORD|PASS|PRIVATE|CREDENTIAL|API[_-]?KEY|ACCESS[_-]?KEY|AUTH|SESSION|SIGNING|WEBHOOK)[A-Za-z0-9_.-]*)\s*[:=]\s*["'`](?<value>[^"'`\r\n]{8,})["'`]/giu;
	scanPattern(text, candidate, findings, issues, policy, pattern, (match, line) => {
		const name = match.groups?.name ?? '';
		const value = match.groups?.value ?? '';
		if (!isSecretLikeName(name) || !looksLikeSecretValue(value)) {
			return null;
		}
		return makeFinding('secret_risk_generic_assignment', 'high', candidate.relativePath, 'Secret-like assignment found.', {
			line,
			detector: 'generic_assignment',
			fingerprint: fingerprint(`${name}:${value}`),
		});
	});
}

function scanEnvExample(text: string, candidate: SecretRiskCandidate, findings: SecretRiskFinding[], issues: string[], policy: SecretRiskScanPolicy): void {
	const lines = text.split(/\r?\n/u);
	for (const [index, line] of lines.entries()) {
		const match = /^\s*(?:export\s+)?(?<name>[A-Za-z_][A-Za-z0-9_.-]*)\s*=\s*(?<value>.+?)\s*$/u.exec(line);
		if (!match?.groups) {
			continue;
		}
		const { name, value } = match.groups;
		if (!isSecretLikeName(name) || !looksLikeSecretValue(value)) {
			continue;
		}
		addBoundedFinding(
			findings,
			issues,
			policy,
			makeFinding('secret_risk_realistic_env_example', 'medium', candidate.relativePath, 'Env example contains a realistic secret-like value.', {
				line: index + 1,
				detector: 'realistic_env_example',
				fingerprint: fingerprint(`${name}:${value}`),
			}),
		);
	}
}

function inspectCandidate(
	projectRoot: string,
	candidate: SecretRiskCandidate,
	policy: SecretRiskScanPolicy,
	findings: SecretRiskFinding[],
	issues: string[],
): void {
	if (isSecretFile(candidate.relativePath)) {
		addBoundedFinding(
			findings,
			issues,
			policy,
			makeFinding('secret_risk_secret_file_skipped', 'low', candidate.relativePath, `${candidate.relativePath} was skipped to avoid reading real secret values.`, {
				detector: 'secret_file_skipped',
			}),
		);
		return;
	}

	let text: string;
	try {
		text = readFileInsideWithoutSymlinks(projectRoot, candidate.absolutePath, { maxBytes: policy.max_file_bytes }).toString('utf8');
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		pushIssue(issues, `${candidate.relativePath}: ${message}`);
		findings.push(makeFinding('secret_risk_unreadable_path', 'high', candidate.relativePath, message));
		return;
	}

	scanPrivateKeyBlocks(text, candidate, findings, issues, policy);
	scanBearerTokens(text, candidate, findings, issues, policy);
	scanProviderTokens(text, candidate, findings, issues, policy);
	scanAssignments(text, candidate, findings, issues, policy);
	if (candidate.surface === 'example') {
		scanEnvExample(text, candidate, findings, issues, policy);
	}
}

function secretRiskStatus(findings: readonly SecretRiskFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	if (findings.some((finding) => ['medium', 'high', 'critical'].includes(finding.severity))) {
		return 'failed';
	}
	return 'passed';
}

function summarizeSecretRisk(targets: readonly SecretRiskTarget[], fileCount: number, findings: readonly SecretRiskFinding[]): SecretRiskSummary {
	return {
		target_count: targets.length,
		file_count: fileCount,
		finding_count: findings.length,
		skipped_secret_file_count: findings.filter((finding) => finding.code === 'secret_risk_secret_file_skipped').length,
		high_or_critical_count: findings.filter((finding) => ['high', 'critical'].includes(finding.severity)).length,
	};
}

function createInputHash(
	policy: SecretRiskScanPolicy,
	targets: readonly SecretRiskTarget[],
	findings: readonly SecretRiskFinding[],
	issues: readonly string[],
): string {
	return sha256Tagged(
		JSON.stringify({
			policy,
			targets,
			findings: findings.map((finding) => ({
				code: finding.code,
				path: finding.path,
				line: finding.line,
				detector: finding.detector,
				fingerprint: finding.fingerprint,
			})),
			issues,
		}),
	);
}

export function inspectSecretRiskScan(projectRoot: string, options: InspectSecretRiskScanOptions = {}): SecretRiskScanReport {
	const root = path.resolve(projectRoot);
	const policy: SecretRiskScanPolicy = {
		max_file_bytes: options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES,
		max_files: options.maxFiles ?? DEFAULT_MAX_FILES,
		max_findings: options.maxFindings ?? DEFAULT_MAX_FINDINGS,
		extensions: [...SCAN_EXTENSIONS],
		skipped_secret_names: [...SECRET_FILE_NAMES],
		ignored_directories: [...IGNORED_DIRECTORIES],
	};
	const targetInputs = options.paths && options.paths.length > 0 ? options.paths : ['.'];
	const targets: SecretRiskTarget[] = [];
	const candidates = new Map<string, SecretRiskCandidate>();
	const findings: SecretRiskFinding[] = [];
	const issues: string[] = [];

	for (const targetPath of targetInputs) {
		let absolutePath: string;
		let relativePath: string;
		try {
			const normalized = normalizeTargetPath(root, targetPath);
			absolutePath = normalized.absolutePath;
			relativePath = normalized.relativePath;
			ensureInsideWithoutSymlinks(root, absolutePath, { allowMissingLeaf: true });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, message);
			targets.push({ input: targetPath, path: targetPath, exists: null, kind: 'unknown' });
			findings.push(makeFinding('secret_risk_path_outside_root', 'high', targetPath, message));
			continue;
		}

		let existence;
		try {
			existence = targetKind(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			targets.push({ input: targetPath, path: relativePath, exists: null, kind: 'unknown' });
			findings.push(makeFinding('secret_risk_unreadable_path', 'high', relativePath, message));
			continue;
		}

		targets.push({ input: targetPath, path: relativePath, exists: existence.exists, kind: existence.kind });
		if (existence.kind === 'file') {
			const surface = surfaceForPath(relativePath);
			if (surface || isSecretFile(relativePath)) {
				addCandidate(candidates, findings, issues, policy, { absolutePath, relativePath, surface: surface ?? 'config' });
			}
		} else if (existence.kind === 'directory') {
			collectFilesFromDirectory(root, absolutePath, candidates, findings, issues, policy);
		}
	}

	for (const candidate of candidates.values()) {
		inspectCandidate(root, candidate, policy, findings, issues);
	}

	const status = secretRiskStatus(findings);
	const truncated = findings.some((finding) =>
		['secret_risk_max_files_exceeded', 'secret_risk_max_findings_exceeded'].includes(finding.code),
	);
	const summary = summarizeSecretRisk(targets, candidates.size, findings);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: SECRET_RISK_SCAN_PACK_ID,
		script_id: SECRET_RISK_SCAN_SCRIPT_ID,
		script_ref: SECRET_RISK_SCAN_SCRIPT_REF,
		action: 'scan',
		status,
		ok: status === 'passed',
		mustflow_root: root,
		policy,
		input_hash: createInputHash(policy, targets, findings, issues),
		targets,
		summary,
		truncated,
		findings,
		issues,
	};
}
