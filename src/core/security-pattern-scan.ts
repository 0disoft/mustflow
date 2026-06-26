import { createHash } from 'node:crypto';
import { existsSync, lstatSync, readdirSync } from 'node:fs';
import path from 'node:path';

import { DEFAULT_IGNORED_DIRECTORIES, isIgnoredDirectoryPath } from './ignored-directories.js';
import { ensureInside, ensureInsideWithoutSymlinks, readUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';
import type {
	ScriptCheckFinding,
	ScriptCheckFindingSeverity,
	ScriptCheckStatus,
} from './script-check-result.js';

export const SECURITY_PATTERN_SCAN_PACK_ID = 'repo';
export const SECURITY_PATTERN_SCAN_SCRIPT_ID = 'security-pattern-scan';
export const SECURITY_PATTERN_SCAN_SCRIPT_REF =
	`${SECURITY_PATTERN_SCAN_PACK_ID}/${SECURITY_PATTERN_SCAN_SCRIPT_ID}`;

export type SecurityPatternScanAction = 'scan';
export type SecurityPatternTargetKind = 'file' | 'directory' | 'missing' | 'other' | 'unknown';
export type SecurityPatternSurface = 'code' | 'config' | 'ci' | 'docs';
export type SecurityPatternCategory =
	| 'access_control'
	| 'browser'
	| 'command'
	| 'crypto_transport'
	| 'filesystem'
	| 'injection'
	| 'logging'
	| 'parser'
	| 'token_session';
export type SecurityPatternDetector =
	| 'client_controlled_authority'
	| 'cors_origin_reflection_with_credentials'
	| 'dynamic_regex'
	| 'eval_execution'
	| 'fs_call_non_literal_path'
	| 'insecure_cookie_options'
	| 'local_storage_token'
	| 'mass_assignment'
	| 'native_deserialization'
	| 'path_join_user_input'
	| 'postmessage_missing_origin_check'
	| 'postmessage_wildcard_target'
	| 'raw_sensitive_request_logging'
	| 'server_fetch_user_url'
	| 'shell_true'
	| 'sql_template_interpolation'
	| 'tls_verification_disabled'
	| 'unsafe_yaml_load';

export type SecurityPatternFindingCode =
	| 'security_pattern_client_controlled_authority'
	| 'security_pattern_cors_origin_reflection_with_credentials'
	| 'security_pattern_dynamic_regex'
	| 'security_pattern_eval_execution'
	| 'security_pattern_file_too_large'
	| 'security_pattern_fs_call_non_literal_path'
	| 'security_pattern_insecure_cookie_options'
	| 'security_pattern_local_storage_token'
	| 'security_pattern_mass_assignment'
	| 'security_pattern_max_files_exceeded'
	| 'security_pattern_max_findings_exceeded'
	| 'security_pattern_native_deserialization'
	| 'security_pattern_path_join_user_input'
	| 'security_pattern_path_outside_root'
	| 'security_pattern_postmessage_missing_origin_check'
	| 'security_pattern_postmessage_wildcard_target'
	| 'security_pattern_raw_sensitive_request_logging'
	| 'security_pattern_server_fetch_user_url'
	| 'security_pattern_shell_true'
	| 'security_pattern_sql_template_interpolation'
	| 'security_pattern_tls_verification_disabled'
	| 'security_pattern_unreadable_path'
	| 'security_pattern_unsafe_yaml_load';

export interface SecurityPatternScanPolicy {
	readonly max_file_bytes: number;
	readonly max_files: number;
	readonly max_findings: number;
	readonly extensions: readonly string[];
	readonly ignored_directories: readonly string[];
	readonly evidence_mode: 'metadata_only';
}

export interface SecurityPatternTarget {
	readonly input: string;
	readonly path: string;
	readonly exists: boolean | null;
	readonly kind: SecurityPatternTargetKind;
}

export interface SecurityPatternFinding extends ScriptCheckFinding {
	readonly code: SecurityPatternFindingCode;
	readonly path: string;
	readonly line?: number;
	readonly detector?: SecurityPatternDetector;
	readonly category?: SecurityPatternCategory;
	readonly review_focus?: string;
	readonly fingerprint?: string;
}

export interface SecurityPatternSummary {
	readonly target_count: number;
	readonly file_count: number;
	readonly finding_count: number;
	readonly high_or_critical_count: number;
	readonly category_count: number;
}

export interface SecurityPatternScanReport {
	readonly schema_version: '1';
	readonly command: 'script-pack';
	readonly pack_id: typeof SECURITY_PATTERN_SCAN_PACK_ID;
	readonly script_id: typeof SECURITY_PATTERN_SCAN_SCRIPT_ID;
	readonly script_ref: typeof SECURITY_PATTERN_SCAN_SCRIPT_REF;
	readonly action: SecurityPatternScanAction;
	readonly status: ScriptCheckStatus;
	readonly ok: boolean;
	readonly mustflow_root: string;
	readonly policy: SecurityPatternScanPolicy;
	readonly input_hash: string;
	readonly targets: readonly SecurityPatternTarget[];
	readonly summary: SecurityPatternSummary;
	readonly truncated: boolean;
	readonly findings: readonly SecurityPatternFinding[];
	readonly issues: readonly string[];
}

export interface InspectSecurityPatternScanOptions {
	readonly paths?: readonly string[];
	readonly maxFileBytes?: number;
	readonly maxFiles?: number;
	readonly maxFindings?: number;
}

interface SecurityPatternCandidate {
	readonly absolutePath: string;
	readonly relativePath: string;
	readonly surface: SecurityPatternSurface;
}

interface SecurityPatternRule {
	readonly code: SecurityPatternFindingCode;
	readonly detector: SecurityPatternDetector;
	readonly category: SecurityPatternCategory;
	readonly severity: ScriptCheckFindingSeverity;
	readonly message: string;
	readonly reviewFocus: string;
	readonly pattern: RegExp;
	readonly appliesTo: (candidate: SecurityPatternCandidate, text: string) => boolean;
	readonly linePredicate?: (line: string, text: string) => boolean;
}

const DEFAULT_MAX_FILE_BYTES = 256 * 1024;
const DEFAULT_MAX_FILES = 1000;
const DEFAULT_MAX_FINDINGS = 300;
const MAX_ISSUES = 50;
const SCAN_EXTENSIONS = [
	'.c',
	'.cc',
	'.cpp',
	'.cs',
	'.cts',
	'.go',
	'.java',
	'.js',
	'.jsx',
	'.kt',
	'.md',
	'.mdx',
	'.mjs',
	'.mts',
	'.php',
	'.py',
	'.rb',
	'.rs',
	'.sh',
	'.ts',
	'.tsx',
	'.yaml',
	'.yml',
] as const;
const IGNORED_DIRECTORIES = DEFAULT_IGNORED_DIRECTORIES;
const ERROR_CODES = new Set<SecurityPatternFindingCode>([
	'security_pattern_path_outside_root',
	'security_pattern_unreadable_path',
]);

function normalizeRelativePath(value: string): string {
	return value.replace(/\\/gu, '/').replace(/^\.\/+/u, '') || '.';
}

function sha256Tagged(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function fingerprint(value: string): string {
	return `sha256:${createHash('sha256').update(value).digest('hex').slice(0, 16)}`;
}

function pushIssue(issues: string[], issue: string): void {
	if (issues.length < MAX_ISSUES) {
		issues.push(issue);
	}
}

function makeFinding(
	code: SecurityPatternFindingCode,
	severity: ScriptCheckFindingSeverity,
	pathValue: string,
	message: string,
	details: {
		readonly line?: number;
		readonly detector?: SecurityPatternDetector;
		readonly category?: SecurityPatternCategory;
		readonly reviewFocus?: string;
		readonly fingerprint?: string;
	} = {},
): SecurityPatternFinding {
	return {
		code,
		severity,
		path: pathValue,
		message,
		line: details.line,
		detector: details.detector,
		category: details.category,
		review_focus: details.reviewFocus,
		fingerprint: details.fingerprint,
		json_pointer: null,
		metric: null,
		actual: null,
		expected: null,
	};
}

function positiveInteger(value: number | undefined, fallback: number): number {
	return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : fallback;
}

function isIgnoredDirectory(relativePath: string): boolean {
	return isIgnoredDirectoryPath(normalizeRelativePath(relativePath), IGNORED_DIRECTORIES);
}

function surfaceForPath(relativePath: string): SecurityPatternSurface | null {
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
	if (['.json', '.toml', '.yaml', '.yml'].includes(extension) || normalized.startsWith('.mustflow/config/')) {
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

function targetKind(absolutePath: string): { readonly exists: boolean; readonly kind: SecurityPatternTargetKind } {
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
	candidates: Map<string, SecurityPatternCandidate>,
	findings: SecurityPatternFinding[],
	issues: string[],
	policy: SecurityPatternScanPolicy,
	candidate: SecurityPatternCandidate,
): void {
	if (candidates.has(candidate.relativePath)) {
		return;
	}
	if (candidates.size >= policy.max_files) {
		if (!findings.some((finding) => finding.code === 'security_pattern_max_files_exceeded')) {
			const message = `Security-pattern scan matched more than ${policy.max_files} files; remaining files were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('security_pattern_max_files_exceeded', 'medium', candidate.relativePath, message));
		}
		return;
	}
	candidates.set(candidate.relativePath, candidate);
}

function collectFilesFromDirectory(
	projectRoot: string,
	absoluteDirectory: string,
	candidates: Map<string, SecurityPatternCandidate>,
	findings: SecurityPatternFinding[],
	issues: string[],
	policy: SecurityPatternScanPolicy,
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
		findings.push(makeFinding('security_pattern_unreadable_path', 'high', relativeDirectory, message));
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
		if (surface) {
			addCandidate(candidates, findings, issues, policy, { absolutePath: absoluteEntry, relativePath: relativeEntry, surface });
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

function addBoundedFinding(
	findings: SecurityPatternFinding[],
	issues: string[],
	policy: SecurityPatternScanPolicy,
	finding: SecurityPatternFinding,
): void {
	if (findings.length >= policy.max_findings) {
		if (!findings.some((entry) => entry.code === 'security_pattern_max_findings_exceeded')) {
			const message = `Security-pattern scan found more than ${policy.max_findings} findings; remaining findings were skipped.`;
			pushIssue(issues, message);
			findings.push(makeFinding('security_pattern_max_findings_exceeded', 'medium', finding.path, message));
		}
		return;
	}
	findings.push(finding);
}

const ALWAYS = (): boolean => true;
const CODE_ONLY = (candidate: SecurityPatternCandidate): boolean => candidate.surface === 'code';
const CODE_OR_CI = (candidate: SecurityPatternCandidate): boolean => candidate.surface === 'code' || candidate.surface === 'ci';

const RULES: readonly SecurityPatternRule[] = [
	{
		code: 'security_pattern_fs_call_non_literal_path',
		detector: 'fs_call_non_literal_path',
		category: 'filesystem',
		severity: 'medium',
		message: 'Filesystem call receives a non-literal first argument.',
		reviewFocus: 'Prove path normalization and allowed-root containment before trusting this file operation.',
		pattern: /\b(?:fs\.)?(?:readFile|readFileSync|writeFile|writeFileSync|appendFile|createReadStream|createWriteStream|unlink|rm|rename|copyFile|mkdir|readdir|stat|lstat)\s*\(\s*(?!["'`])/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_path_join_user_input',
		detector: 'path_join_user_input',
		category: 'filesystem',
		severity: 'high',
		message: 'Path composition appears to use request-controlled input.',
		reviewFocus: 'Trace the composed path to the file sink and prove real-path containment after decoding and symlink checks.',
		pattern: /\bpath\.(?:join|resolve)\s*\([^;\n]*(?:req\.|request\.|ctx\.|params|body|query)/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_dynamic_regex',
		detector: 'dynamic_regex',
		category: 'injection',
		severity: 'medium',
		message: 'RegExp constructor receives a dynamic pattern.',
		reviewFocus: 'Check whether attacker-controlled text can choose the pattern; prefer literals, escaping, length limits, or a safe regex engine.',
		pattern: /\b(?:new\s+RegExp|RegExp)\s*\(\s*(?!["'`][^"'`\r\n]*["'`]\s*[,)]).+/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_shell_true',
		detector: 'shell_true',
		category: 'command',
		severity: 'high',
		message: 'Process spawn options enable shell execution.',
		reviewFocus: 'Use argv arrays and a static executable map; prove user-controlled strings cannot reach shell syntax.',
		pattern: /\bshell\s*:\s*true\b/gu,
		appliesTo: CODE_OR_CI,
	},
	{
		code: 'security_pattern_eval_execution',
		detector: 'eval_execution',
		category: 'injection',
		severity: 'critical',
		message: 'Dynamic code execution primitive found.',
		reviewFocus: 'Replace eval/new Function with a bounded parser, static operation map, or sandboxed interpreter with explicit policy.',
		pattern: /\b(?:eval\s*\(|new\s+Function\s*\(|Function\s*\()/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_sql_template_interpolation',
		detector: 'sql_template_interpolation',
		category: 'injection',
		severity: 'high',
		message: 'SQL-looking template string contains interpolation.',
		reviewFocus: 'Use parameterized values and allowlisted identifiers; check ORDER BY, table, column, and raw ORM fragments separately.',
		pattern: /`[^`\r\n]*(?:SELECT|UPDATE|DELETE|INSERT|WHERE|ORDER BY)[^`\r\n]*\$\{[^`\r\n]*`/giu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_mass_assignment',
		detector: 'mass_assignment',
		category: 'access_control',
		severity: 'high',
		message: 'Request body appears to be bound directly into an entity or persistence call.',
		reviewFocus: 'Replace raw body binding with a write DTO allowlist and server-derived privileged fields.',
		pattern: /\b(?:Object\.assign\s*\([^,\n]+,\s*(?:req|request|ctx)?\.?body\b|(?:create|update|updateMany|insert|save)\s*\(\s*(?:req|request|ctx)?\.?body\b)/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_client_controlled_authority',
		detector: 'client_controlled_authority',
		category: 'access_control',
		severity: 'high',
		message: 'Authority-bearing field appears to come from request-controlled input.',
		reviewFocus: 'Derive user, tenant, role, price, plan, owner, and entitlement from trusted server state, not request fields.',
		pattern: /\b(?:req|request|ctx)\.(?:body|query|headers|params)\.?(?:\[['"])?(?:userId|accountId|tenantId|orgId|workspaceId|ownerId|role|isAdmin|permissions|scope|plan|price|status|entitlement)(?:['"]\])?/giu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_insecure_cookie_options',
		detector: 'insecure_cookie_options',
		category: 'token_session',
		severity: 'medium',
		message: 'Cookie-setting call does not show secure session-cookie flags on the same line.',
		reviewFocus: 'For authority-bearing cookies, verify HttpOnly, Secure, SameSite, path, lifetime, rotation, logout, and CSRF posture.',
		pattern: /\b(?:res|response|ctx)\.cookie\s*\([^\r\n]*/gu,
		appliesTo: CODE_ONLY,
		linePredicate: (line) => !/httpOnly|secure|sameSite/iu.test(line),
	},
	{
		code: 'security_pattern_cors_origin_reflection_with_credentials',
		detector: 'cors_origin_reflection_with_credentials',
		category: 'browser',
		severity: 'high',
		message: 'CORS origin reflection appears in a file that also enables credentials.',
		reviewFocus: 'Replace reflected origins with an allowlist and emit Vary: Origin when credentials are allowed.',
		pattern: /Access-Control-Allow-Origin[^;\n]*(?:req|request)\.headers\.origin|(?:req|request)\.headers\.origin[^;\n]*Access-Control-Allow-Origin/giu,
		appliesTo: (_candidate, text) => /Access-Control-Allow-Credentials[^;\n]*true/iu.test(text),
	},
	{
		code: 'security_pattern_postmessage_wildcard_target',
		detector: 'postmessage_wildcard_target',
		category: 'browser',
		severity: 'high',
		message: 'postMessage uses a wildcard target origin.',
		reviewFocus: 'Send messages only to a fixed trusted origin and avoid sending tokens or secrets through cross-window messages.',
		pattern: /\.postMessage\s*\([^;\n]*,\s*["']\*["']/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_postmessage_missing_origin_check',
		detector: 'postmessage_missing_origin_check',
		category: 'browser',
		severity: 'medium',
		message: 'Message event listener has no visible event.origin check in the file.',
		reviewFocus: 'Validate event.origin, event.source, message type, and payload schema before acting on cross-window messages.',
		pattern: /addEventListener\s*\(\s*["']message["']/gu,
		appliesTo: (_candidate, text) => !/\bevent\.origin\b|\borigin\s*!==|\borigin\s*===/u.test(text),
	},
	{
		code: 'security_pattern_local_storage_token',
		detector: 'local_storage_token',
		category: 'token_session',
		severity: 'high',
		message: 'Browser localStorage appears to store a token or session-like value.',
		reviewFocus: 'Avoid durable browser-readable authority where possible; review XSS blast radius, token lifetime, rotation, and revocation.',
		pattern: /\blocalStorage\.setItem\s*\([^;\n]*(?:token|session|jwt|auth|refresh|api[_-]?key)/giu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_server_fetch_user_url',
		detector: 'server_fetch_user_url',
		category: 'injection',
		severity: 'high',
		message: 'Server-side HTTP call appears to use a request-controlled URL.',
		reviewFocus: 'Treat this as SSRF until scheme, host, redirects, DNS resolution, private networks, timeout, and size limits are proven.',
		pattern: /\b(?:fetch|axios\.(?:get|post|put|patch)|request|got)\s*\([^;\n]*(?:req|request|ctx)\.(?:query|body|params)[^;\n]*(?:url|uri|href)/giu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_tls_verification_disabled',
		detector: 'tls_verification_disabled',
		category: 'crypto_transport',
		severity: 'critical',
		message: 'TLS certificate verification appears to be disabled.',
		reviewFocus: 'Remove certificate-verification bypasses and use test-only injection or local trust roots when needed.',
		pattern: /\b(?:rejectUnauthorized\s*:\s*false|InsecureSkipVerify\s*:\s*true|verify\s*=\s*False|check_hostname\s*=\s*False)/gu,
		appliesTo: CODE_OR_CI,
	},
	{
		code: 'security_pattern_unsafe_yaml_load',
		detector: 'unsafe_yaml_load',
		category: 'parser',
		severity: 'high',
		message: 'YAML parsing appears to use an unsafe loader.',
		reviewFocus: 'Use safe_load or a schema-backed parser and validate the resulting data shape before use.',
		pattern: /\byaml\.load\s*\([^;\n]*(?:Loader\s*=\s*yaml\.(?:Loader|FullLoader|UnsafeLoader)|FullLoader|UnsafeLoader)/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_native_deserialization',
		detector: 'native_deserialization',
		category: 'parser',
		severity: 'critical',
		message: 'Native object deserialization primitive found.',
		reviewFocus: 'Do not deserialize untrusted bytes into executable or language-native objects; use JSON plus schema validation where possible.',
		pattern: /\b(?:pickle\.loads|pickle\.load|marshal\.loads|ObjectInputStream|BinaryFormatter|yaml\.unsafe_load|bincode::deserialize)/gu,
		appliesTo: CODE_ONLY,
	},
	{
		code: 'security_pattern_raw_sensitive_request_logging',
		detector: 'raw_sensitive_request_logging',
		category: 'logging',
		severity: 'high',
		message: 'Logger call appears to include raw request headers, body, cookies, or query.',
		reviewFocus: 'Redact Authorization, Cookie, token, OTP, password, secret, and reset-link fields before logging request metadata.',
		pattern: /\b(?:logger|log|console)\.(?:debug|info|warn|error|log)\s*\([^;\n]*(?:req|request)\.(?:headers|body|cookies|query)/gu,
		appliesTo: CODE_ONLY,
	},
];

function scanCandidate(
	projectRoot: string,
	candidate: SecurityPatternCandidate,
	policy: SecurityPatternScanPolicy,
	findings: SecurityPatternFinding[],
	issues: string[],
): void {
	let text: string;
	try {
		text = readUtf8FileInsideWithoutSymlinks(projectRoot, candidate.absolutePath, { maxBytes: policy.max_file_bytes });
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const code: SecurityPatternFindingCode = message.includes('exceeds maximum size')
			? 'security_pattern_file_too_large'
			: 'security_pattern_unreadable_path';
		const severity: ScriptCheckFindingSeverity = code === 'security_pattern_file_too_large' ? 'medium' : 'high';
		pushIssue(issues, `${candidate.relativePath}: ${message}`);
		findings.push(makeFinding(code, severity, candidate.relativePath, message));
		return;
	}

	for (const rule of RULES) {
		if (!rule.appliesTo(candidate, text)) {
			continue;
		}

		for (const match of text.matchAll(rule.pattern)) {
			const line = lineNumberAtIndex(text, match.index ?? 0);
			const matchedLine = text.split(/\r\n|\n|\r/u)[line - 1] ?? '';
			if (rule.linePredicate && !rule.linePredicate(matchedLine, text)) {
				continue;
			}

			addBoundedFinding(
				findings,
				issues,
				policy,
				makeFinding(rule.code, rule.severity, candidate.relativePath, rule.message, {
					line,
					detector: rule.detector,
					category: rule.category,
					reviewFocus: rule.reviewFocus,
					fingerprint: fingerprint(`${rule.detector}:${match[0]}`),
				}),
			);
		}
	}
}

function securityPatternStatus(findings: readonly SecurityPatternFinding[]): ScriptCheckStatus {
	if (findings.some((finding) => ERROR_CODES.has(finding.code))) {
		return 'error';
	}
	if (findings.some((finding) => ['medium', 'high', 'critical'].includes(finding.severity))) {
		return 'failed';
	}
	return 'passed';
}

function summarizeSecurityPatterns(
	targets: readonly SecurityPatternTarget[],
	fileCount: number,
	findings: readonly SecurityPatternFinding[],
): SecurityPatternSummary {
	const categories = new Set(findings.map((finding) => finding.category).filter((category): category is SecurityPatternCategory => Boolean(category)));
	return {
		target_count: targets.length,
		file_count: fileCount,
		finding_count: findings.length,
		high_or_critical_count: findings.filter((finding) => ['high', 'critical'].includes(finding.severity)).length,
		category_count: categories.size,
	};
}

function createInputHash(
	policy: SecurityPatternScanPolicy,
	targets: readonly SecurityPatternTarget[],
	findings: readonly SecurityPatternFinding[],
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
				category: finding.category,
				fingerprint: finding.fingerprint,
			})),
			issues,
		}),
	);
}

export function inspectSecurityPatternScan(
	projectRoot: string,
	options: InspectSecurityPatternScanOptions = {},
): SecurityPatternScanReport {
	const root = path.resolve(projectRoot);
	const policy: SecurityPatternScanPolicy = {
		max_file_bytes: positiveInteger(options.maxFileBytes, DEFAULT_MAX_FILE_BYTES),
		max_files: positiveInteger(options.maxFiles, DEFAULT_MAX_FILES),
		max_findings: positiveInteger(options.maxFindings, DEFAULT_MAX_FINDINGS),
		extensions: [...SCAN_EXTENSIONS],
		ignored_directories: [...IGNORED_DIRECTORIES],
		evidence_mode: 'metadata_only',
	};
	const targetInputs = options.paths && options.paths.length > 0 ? options.paths : ['.'];
	const targets: SecurityPatternTarget[] = [];
	const candidates = new Map<string, SecurityPatternCandidate>();
	const findings: SecurityPatternFinding[] = [];
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
			findings.push(makeFinding('security_pattern_path_outside_root', 'high', targetPath, message));
			continue;
		}

		let existence;
		try {
			existence = targetKind(absolutePath);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			pushIssue(issues, `${relativePath}: ${message}`);
			targets.push({ input: targetPath, path: relativePath, exists: null, kind: 'unknown' });
			findings.push(makeFinding('security_pattern_unreadable_path', 'high', relativePath, message));
			continue;
		}

		targets.push({ input: targetPath, path: relativePath, exists: existence.exists, kind: existence.kind });
		if (existence.kind === 'file') {
			const surface = surfaceForPath(relativePath);
			if (surface) {
				addCandidate(candidates, findings, issues, policy, { absolutePath, relativePath, surface });
			}
		} else if (existence.kind === 'directory') {
			collectFilesFromDirectory(root, absolutePath, candidates, findings, issues, policy);
		}
	}

	for (const candidate of candidates.values()) {
		scanCandidate(root, candidate, policy, findings, issues);
	}

	const status = securityPatternStatus(findings);
	const truncated = findings.some((finding) =>
		['security_pattern_max_files_exceeded', 'security_pattern_max_findings_exceeded'].includes(finding.code),
	);
	const summary = summarizeSecurityPatterns(targets, candidates.size, findings);

	return {
		schema_version: '1',
		command: 'script-pack',
		pack_id: SECURITY_PATTERN_SCAN_PACK_ID,
		script_id: SECURITY_PATTERN_SCAN_SCRIPT_ID,
		script_ref: SECURITY_PATTERN_SCAN_SCRIPT_REF,
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
