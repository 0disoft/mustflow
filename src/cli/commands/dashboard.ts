import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { openPathInFileManager, openUrlInBrowser } from '../lib/browser-open.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import {
	renderDashboardHtml,
	type DashboardCommandEffectGraph,
	type DashboardCommandEffectGraphStatus,
	type DashboardDocReviewSnapshot,
	type DashboardStatusSnapshot,
} from '../lib/dashboard-html.js';
import {
	DashboardExportPathError,
	writeDashboardExport,
	type DashboardExportFormat,
} from '../lib/dashboard-export.js';
import {
	DASHBOARD_VERIFICATION_MAX_FILE_MATCHES,
	createDashboardVerificationSnapshot,
} from '../../core/dashboard-verification.js';
import { parseSkillIndexRoutes } from '../../core/skill-route-alignment.js';
import { getAgentContext } from '../lib/agent-context.js';
import { readGitChangedFiles } from '../lib/git-changes.js';
import {
	isRecord,
	readCommandContract,
	readPositiveInteger,
	readString,
	readStringArray,
	type CommandContract,
} from '../lib/command-contract.js';
import {
	readDashboardPreferences,
	updateDashboardPreferences,
	type DashboardPreferenceUpdate,
} from '../lib/dashboard-preferences.js';
import {
	DOC_REVIEW_LEDGER_RELATIVE_PATH,
	isDocReviewStatus,
	isReviewerKind,
	listDocReviewEntries,
	markDocReviewEntry,
	type DocReviewStatus,
	type ReviewerKind,
} from '../lib/doc-review-ledger.js';
import { inspectManifestLock } from '../lib/manifest-lock.js';
import { readLocalCommandEffectGraphs, type LocalCommandEffectGraph } from '../lib/local-index.js';
import { readPackageMetadata } from '../lib/package-info.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';
import { detectVersionSources } from '../../core/version-sources.js';
import { planUpdate, summarizePlan } from './update.js';

interface DashboardOptions {
	readonly host: string;
	readonly port: number;
	readonly json: boolean;
	readonly openBrowser: boolean;
	readonly exportPath?: string;
	readonly exportFormat?: DashboardExportFormat;
}

const DEFAULT_DASHBOARD_HOST = '127.0.0.1';
const DEFAULT_DASHBOARD_PORT = 0;
const MAX_REQUEST_BYTES = 64 * 1024;
const LOCAL_DASHBOARD_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

const RELEASE_FILE_PATTERNS = [
	/^package\.json$/u,
	/^bun\.lockb?$/u,
	/^templates\//u,
	/^schemas\//u,
	/^src\/cli\/lib\/package-info\.ts$/u,
	/^src\/cli\/lib\/version-sources\.ts$/u,
] as const;
const SKILL_INDEX_RELATIVE_PATH = '.mustflow/skills/INDEX.md';
const LATEST_RUN_RELATIVE_PATH = '.mustflow/state/runs/latest.json';

function readFrontmatterLines(content: string): string[] {
	if (!content.startsWith('---')) {
		return [];
	}

	const end = content.indexOf('\n---', 3);
	if (end < 0) {
		return [];
	}

	return content.slice(3, end).split(/\r?\n/u);
}

function readFrontmatterList(content: string, key: string): string[] {
	const lines = readFrontmatterLines(content);
	const values: string[] = [];
	let keyIndent: number | undefined;

	for (const line of lines) {
		const keyMatch = /^(\s*)([^:#]+):\s*$/u.exec(line);
		if (keyMatch) {
			keyIndent = keyMatch[2].trim() === key ? keyMatch[1].length : undefined;
			continue;
		}

		if (keyIndent === undefined) {
			continue;
		}

		const valueMatch = /^(\s*)-\s*(.+?)\s*$/u.exec(line);
		if (!valueMatch || valueMatch[1].length <= keyIndent) {
			keyIndent = undefined;
			continue;
		}

		values.push(valueMatch[2].trim().replace(/^["']|["']$/gu, ''));
	}

	return values;
}

function skillNameFromPath(skillPath: string): string {
	const match = /^\.mustflow\/skills\/([^/]+)\/SKILL\.md$/u.exec(skillPath);
	return match?.[1] ?? skillPath;
}

export function getDashboardHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf dashboard [options]',
			summary: t(lang, 'dashboard.help.summary'),
			options: [
				{ label: '--host <host>', description: t(lang, 'dashboard.help.option.host') },
				{ label: '--port <port>', description: t(lang, 'dashboard.help.option.port') },
				{ label: '--open', description: t(lang, 'dashboard.help.option.open') },
				{ label: '--no-open', description: t(lang, 'dashboard.help.option.noOpen') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '--export <path>', description: t(lang, 'dashboard.help.option.export') },
				{ label: '--export-json <path>', description: t(lang, 'dashboard.help.option.exportJson') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: [
				'mf dashboard',
				'mf dashboard --open',
				'mf dashboard --port 4173',
				'mf dashboard --json',
				'mf dashboard --export .mustflow/state/artifacts/dashboard.html',
				'mf dashboard --export-json .mustflow/state/artifacts/dashboard.json',
			],
			exitCodes: [
				{
					label: '0',
					description: t(lang, 'dashboard.help.exit.ok'),
				},
				{
					label: '1',
					description: t(lang, 'dashboard.help.exit.fail'),
				},
			],
		},
		lang,
	);
}

function parseDashboardOptions(args: readonly string[], lang: CliLang): { options?: DashboardOptions; error?: string } {
	let host = DEFAULT_DASHBOARD_HOST;
	let port = DEFAULT_DASHBOARD_PORT;
	let json = false;
	let openBrowser = false;
	let exportPath: string | undefined;
	let exportFormat: DashboardExportFormat | undefined;
	let serverOptionUsed = false;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg) {
			continue;
		}

		if (arg === '--json') {
			json = true;
			openBrowser = false;
			serverOptionUsed = true;
			continue;
		}

		if (arg === '--open') {
			openBrowser = true;
			serverOptionUsed = true;
			continue;
		}

		if (arg === '--no-open') {
			openBrowser = false;
			serverOptionUsed = true;
			continue;
		}

		if (arg === '--host') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { error: t(lang, 'cli.error.missingValue', { option: '--host' }) };
			}
			host = value;
			serverOptionUsed = true;
			index += 1;
			continue;
		}

		if (arg.startsWith('--host=')) {
			host = arg.slice('--host='.length);
			serverOptionUsed = true;
			continue;
		}

		if (arg === '--port') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { error: t(lang, 'cli.error.missingValue', { option: '--port' }) };
			}
			const parsedPort = Number(value);
			if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65_535) {
				return { error: t(lang, 'dashboard.error.invalidPort', { port: value }) };
			}
			port = parsedPort;
			serverOptionUsed = true;
			index += 1;
			continue;
		}

		if (arg.startsWith('--port=')) {
			const value = arg.slice('--port='.length);
			const parsedPort = Number(value);
			if (!Number.isInteger(parsedPort) || parsedPort < 0 || parsedPort > 65_535) {
				return { error: t(lang, 'dashboard.error.invalidPort', { port: value }) };
			}
			port = parsedPort;
			serverOptionUsed = true;
			continue;
		}

		if (arg === '--export' || arg === '--export-json') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { error: t(lang, 'cli.error.missingValue', { option: arg }) };
			}
			if (exportPath) {
				return { error: t(lang, 'dashboard.error.conflictingExportModes') };
			}
			exportPath = value;
			exportFormat = arg === '--export-json' ? 'json' : 'html';
			index += 1;
			continue;
		}

		if (arg.startsWith('--export=')) {
			if (exportPath) {
				return { error: t(lang, 'dashboard.error.conflictingExportModes') };
			}
			exportPath = arg.slice('--export='.length);
			exportFormat = 'html';
			if (!exportPath) {
				return { error: t(lang, 'cli.error.missingValue', { option: '--export' }) };
			}
			continue;
		}

		if (arg.startsWith('--export-json=')) {
			if (exportPath) {
				return { error: t(lang, 'dashboard.error.conflictingExportModes') };
			}
			exportPath = arg.slice('--export-json='.length);
			exportFormat = 'json';
			if (!exportPath) {
				return { error: t(lang, 'cli.error.missingValue', { option: '--export-json' }) };
			}
			continue;
		}

		if (arg.startsWith('-')) {
			return { error: t(lang, 'cli.error.unknownOption', { option: arg }) };
		}

		return { error: t(lang, 'cli.error.unexpectedArgument', { argument: arg }) };
	}

	if (exportPath && serverOptionUsed) {
		return { error: t(lang, 'dashboard.error.exportServerOptions') };
	}

	if (exportPath) {
		return { options: { host, port, json: false, openBrowser: false, exportPath, exportFormat: exportFormat ?? 'html' } };
	}

	if (!LOCAL_DASHBOARD_HOSTS.has(host)) {
		return { error: t(lang, 'dashboard.error.nonLocalHost', { host }) };
	}

	if (json) {
		openBrowser = false;
	}

	return { options: { host, port, json, openBrowser } };
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
	response.writeHead(statusCode, {
		'cache-control': 'no-store',
		'content-type': 'application/json; charset=utf-8',
	});
	response.end(JSON.stringify(value));
}

function sendText(response: ServerResponse, statusCode: number, value: string): void {
	response.writeHead(statusCode, {
		'cache-control': 'no-store',
		'content-type': 'text/plain; charset=utf-8',
	});
	response.end(value);
}

function sendBadRequest(response: ServerResponse): void {
	sendText(response, 400, 'Bad request');
}

function isAuthorized(request: IncomingMessage, token: string): boolean {
	return request.headers['x-mustflow-dashboard-token'] === token;
}

async function readRequestJson(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	let totalBytes = 0;

	for await (const chunk of request) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		totalBytes += buffer.byteLength;

		if (totalBytes > MAX_REQUEST_BYTES) {
			throw new Error('Request body is too large.');
		}

		chunks.push(buffer);
	}

	const rawBody = Buffer.concat(chunks).toString('utf8');
	return rawBody.trim().length === 0 ? {} : JSON.parse(rawBody);
}

function readUpdatePayload(value: unknown): DashboardPreferenceUpdate[] {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Request body must be a JSON object.');
	}

	const updates = (value as { updates?: unknown }).updates;

	if (!Array.isArray(updates)) {
		throw new Error('Request body must include an updates array.');
	}

	return updates.map((entry) => {
		if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
			throw new Error('Each update must be a JSON object.');
		}

		const update = entry as { id?: unknown; value?: unknown };

		if (typeof update.id !== 'string' || update.id.trim().length === 0) {
			throw new Error('Each update must include an id.');
		}

		return { id: update.id, value: update.value };
	});
}

function readOptionalStringField(value: Record<string, unknown>, key: string): string | undefined {
	const field = value[key];
	return typeof field === 'string' && field.trim().length > 0 ? field.trim() : undefined;
}

function readRequiredStringField(value: Record<string, unknown>, key: string): string {
	const field = readOptionalStringField(value, key);
	if (!field) {
		throw new Error(`${key} is required.`);
	}

	return field;
}

function readDocReviewPayload(value: unknown): {
	path: string;
	status: Extract<DocReviewStatus, 'approved' | 'needs_human' | 'ignored'>;
	reviewerKind: ReviewerKind;
	reviewerId: string;
	reviewerLabel?: string;
	reviewerProvider?: string;
	reviewerModel?: string;
	reviewerCommandIntent?: string;
	summary?: string;
} {
	if (typeof value !== 'object' || value === null || Array.isArray(value)) {
		throw new Error('Request body must be a JSON object.');
	}

	const payload = value as Record<string, unknown>;
	const status = readRequiredStringField(payload, 'status');
	if (status !== 'approved' && status !== 'needs_human' && status !== 'ignored') {
		throw new Error('status must be approved, needs_human, or ignored.');
	}

	const reviewerKind = readRequiredStringField(payload, 'reviewerKind');
	if (!isReviewerKind(reviewerKind)) {
		throw new Error('reviewerKind must be human, llm, tool, or external.');
	}

	return {
		path: readRequiredStringField(payload, 'path'),
		status,
		reviewerKind,
		reviewerId: readRequiredStringField(payload, 'reviewerId'),
		reviewerLabel: readOptionalStringField(payload, 'reviewerLabel'),
		reviewerProvider: readOptionalStringField(payload, 'reviewerProvider'),
		reviewerModel: readOptionalStringField(payload, 'reviewerModel'),
		reviewerCommandIntent: readOptionalStringField(payload, 'reviewerCommandIntent'),
		summary: readOptionalStringField(payload, 'summary'),
	};
}

function renderDocReviewResponse(projectRoot: string, requestUrl: URL): {
	schema_version: '1';
	command: 'docs review list';
	ledger_path: string;
	count: number;
	documents: ReturnType<typeof listDocReviewEntries>;
} & DashboardDocReviewSnapshot {
	const status = requestUrl.searchParams.get('status');
	if (status && !isDocReviewStatus(status)) {
		throw new Error('Invalid review status.');
	}

	const documents = listDocReviewEntries(projectRoot, {
		includeAll: requestUrl.searchParams.get('all') === '1',
		status: status as DocReviewStatus | undefined,
	});

	return {
		schema_version: '1',
		command: 'docs review list',
		ledger_path: DOC_REVIEW_LEDGER_RELATIVE_PATH,
		count: documents.length,
		documents,
	};
}

function readDashboardCommandContract(projectRoot: string): CommandContract | null {
	try {
		return readCommandContract(projectRoot);
	} catch {
		return null;
	}
}

function toDashboardCommandEffectGraphStatus(graph: LocalCommandEffectGraph): DashboardCommandEffectGraphStatus {
	return {
		source: graph.source,
		authority: graph.authority,
		command_authority: graph.commandAuthority,
		grants_command_authority: graph.grantsCommandAuthority,
		status: graph.status,
		database_path: graph.databasePath,
		index_fresh: graph.indexFresh,
		stale_paths: graph.stalePaths,
		refresh_hint: graph.refreshHint,
	};
}

function toDashboardCommandEffectGraph(graph: LocalCommandEffectGraph): DashboardCommandEffectGraph {
	return {
		...toDashboardCommandEffectGraphStatus(graph),
		write_locks: graph.writeLocks.map((writeLock) => ({
			lock: writeLock.lock,
			paths: writeLock.paths,
			modes: writeLock.modes,
			sources: writeLock.sources,
			concurrencies: writeLock.concurrencies,
			effect_count: writeLock.effectCount,
		})),
		lock_conflicts: graph.lockConflicts.map((conflict) => ({
			intent: conflict.intent,
			lock: conflict.lock,
			paths: conflict.paths,
			modes: conflict.modes,
			concurrencies: conflict.concurrencies,
			conflicting_paths: conflict.conflictingPaths,
			conflicting_modes: conflict.conflictingModes,
			conflicting_concurrencies: conflict.conflictingConcurrencies,
		})),
	};
}

async function readCommandEffectGraphMap(
	projectRoot: string,
	intentNames: readonly string[],
): Promise<{
	readonly status?: DashboardCommandEffectGraphStatus;
	readonly graphs: ReadonlyMap<string, DashboardCommandEffectGraph>;
}> {
	if (intentNames.length === 0) {
		return { graphs: new Map() };
	}

	const graphs = new Map<string, DashboardCommandEffectGraph>();
	let status: DashboardCommandEffectGraphStatus | undefined;
	const localGraphs = await readLocalCommandEffectGraphs(projectRoot, intentNames);

	for (const [intentName, graph] of localGraphs) {
		status ??= toDashboardCommandEffectGraphStatus(graph);
		if (graph.status === 'fresh') {
			graphs.set(intentName, toDashboardCommandEffectGraph(graph));
		}
	}

	return { status, graphs };
}

async function renderCommandContractResponse(
	projectRoot: string,
	contract: CommandContract | null,
): Promise<DashboardStatusSnapshot['command_contract']> {
	if (!contract) {
		return {
			path: '.mustflow/config/commands.toml',
			exists: false,
			intents: [],
		};
	}

	const intents = Object.entries(contract.intents)
		.sort(([left], [right]) => left.localeCompare(right))
		.flatMap(([name, intent]) => {
			if (!isRecord(intent)) {
				return [];
			}

			const status = readString(intent, 'status') ?? 'unknown';
			const lifecycle = readString(intent, 'lifecycle') ?? null;
			const runPolicy = readString(intent, 'run_policy') ?? null;
			const stdin = readString(intent, 'stdin') ?? null;
			const timeoutSeconds = readPositiveInteger(intent, 'timeout_seconds') ?? null;
			const runnable =
				status === 'configured' &&
				lifecycle === 'oneshot' &&
				runPolicy === 'agent_allowed' &&
				stdin === 'closed' &&
				timeoutSeconds !== null &&
				(readStringArray(intent, 'argv') !== undefined || readString(intent, 'cmd') !== undefined);

			return [
				{
					name,
					status,
					lifecycle,
					run_policy: runPolicy,
					stdin,
					timeout_seconds: timeoutSeconds,
					cwd: readString(intent, 'cwd') ?? null,
					description: readString(intent, 'description') ?? null,
					reason: readString(intent, 'reason') ?? null,
					agent_action: readString(intent, 'agent_action') ?? null,
					writes: readStringArray(intent, 'writes') ?? [],
					required_after: readStringArray(intent, 'required_after') ?? [],
					runnable,
				},
			];
		});

	const effectGraphs = await readCommandEffectGraphMap(
		projectRoot,
		intents.map((intent) => intent.name),
	);

	return {
		path: '.mustflow/config/commands.toml',
		exists: true,
		effect_graph_status: effectGraphs.status,
		intents: intents.map((intent) => {
			const graph = effectGraphs.graphs.get(intent.name);
			return graph ? { ...intent, effect_graph: graph } : intent;
		}),
	};
}

function pathMatches(filePath: string, patterns: readonly RegExp[]): boolean {
	return patterns.some((pattern) => pattern.test(filePath));
}

function matchingFiles(files: readonly string[], patterns: readonly RegExp[]): string[] {
	return files.filter((filePath) => pathMatches(filePath, patterns)).slice(0, DASHBOARD_VERIFICATION_MAX_FILE_MATCHES);
}

function arraysEqual(left: readonly string[], right: readonly string[]): boolean {
	return left.length === right.length && left.every((value, index) => value === right[index]);
}

function renderSkillsResponse(projectRoot: string): DashboardStatusSnapshot['skills'] {
	const indexPath = path.join(projectRoot, ...SKILL_INDEX_RELATIVE_PATH.split('/'));
	if (!existsSync(indexPath)) {
		return {
			index_path: SKILL_INDEX_RELATIVE_PATH,
			exists: false,
			count: 0,
			routes: [],
		};
	}

	const routes = parseSkillIndexRoutes(readFileSync(indexPath, 'utf8')).map((route) => {
		const skillPath = path.join(projectRoot, ...route.skillPath.split('/'));
		const exists = existsSync(skillPath);
		const declaredCommandIntents = exists ? readFrontmatterList(readFileSync(skillPath, 'utf8'), 'command_intents') : [];
		const sortedRouteIntents = [...route.commandIntents].sort((left, right) => left.localeCompare(right));
		const sortedDeclaredIntents = [...declaredCommandIntents].sort((left, right) => left.localeCompare(right));

		return {
			skill: skillNameFromPath(route.skillPath),
			skill_path: route.skillPath,
			trigger: route.trigger,
			required_input: route.requiredInput,
			edit_scope: route.editScope,
			risk: route.risk,
			verification_intents: route.commandIntents,
			declared_command_intents: declaredCommandIntents,
			expected_output: route.expectedOutput,
			exists,
			aligned: exists && arraysEqual(sortedRouteIntents, sortedDeclaredIntents),
		};
	});

	return {
		index_path: SKILL_INDEX_RELATIVE_PATH,
		exists: true,
		count: routes.length,
		routes,
	};
}

function renderUpdateResponse(projectRoot: string): DashboardStatusSnapshot['update'] {
	const plan = planUpdate(projectRoot);
	if (plan.error) {
		return {
			command: 'update',
			mode: 'dry-run',
			dry_run_command: 'mf update --dry-run',
			apply_command: 'mf update --apply',
			ok: false,
			apply_ready: false,
			error: plan.error,
			summary: {
				blockedLocalChanges: 0,
				manualReview: 0,
				wouldUpdate: 0,
				wouldCreate: 0,
				unchanged: 0,
			},
			blockers: [],
			changes: [],
		};
	}

	const summary = summarizePlan(plan.items);
	const blockers = plan.items.filter((item) => item.action === 'blocked-local-change' || item.action === 'manual-review');
	const changes = plan.items.filter((item) => item.action === 'create' || item.action === 'update');

	return {
		command: 'update',
		mode: 'dry-run',
		dry_run_command: 'mf update --dry-run',
		apply_command: 'mf update --apply',
		ok: true,
		apply_ready: blockers.length === 0,
		summary,
		blockers,
		changes,
	};
}

function readRunOutput(value: unknown): { readonly bytes: number; readonly truncated: boolean; readonly tail: string } {
	if (!isRecord(value)) {
		return { bytes: 0, truncated: false, tail: '' };
	}

	return {
		bytes: typeof value.bytes === 'number' ? value.bytes : 0,
		truncated: value.truncated === true,
		tail: typeof value.tail === 'string' ? value.tail : '',
	};
}

function readNumberArray(value: unknown): number[] {
	return Array.isArray(value) ? value.filter((entry): entry is number => Number.isInteger(entry)) : [];
}

function renderRunHistoryResponse(projectRoot: string): DashboardStatusSnapshot['run_history'] {
	const receiptPath = path.join(projectRoot, ...LATEST_RUN_RELATIVE_PATH.split('/'));
	if (!existsSync(receiptPath)) {
		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: false,
		};
	}

	try {
		const receipt = JSON.parse(readFileSync(receiptPath, 'utf8')) as unknown;
		if (!isRecord(receipt)) {
			throw new Error('Run receipt must be a JSON object.');
		}

		const mode = typeof receipt.mode === 'string' ? receipt.mode : '';
		const argv = Array.isArray(receipt.argv) ? receipt.argv.filter((entry): entry is string => typeof entry === 'string') : [];
		const cmd = typeof receipt.cmd === 'string' && receipt.cmd.length > 0 ? [receipt.cmd] : [];

		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: true,
			valid: true,
			intent: typeof receipt.intent === 'string' ? receipt.intent : '',
			status: typeof receipt.status === 'string' ? receipt.status : '',
			timed_out: receipt.timed_out === true,
			started_at: typeof receipt.started_at === 'string' ? receipt.started_at : '',
			finished_at: typeof receipt.finished_at === 'string' ? receipt.finished_at : '',
			duration_ms: typeof receipt.duration_ms === 'number' ? receipt.duration_ms : 0,
			cwd: typeof receipt.cwd === 'string' ? receipt.cwd : '',
			lifecycle: typeof receipt.lifecycle === 'string' ? receipt.lifecycle : '',
			run_policy: typeof receipt.run_policy === 'string' ? receipt.run_policy : '',
			mode,
			command_line: mode === 'shell' ? cmd : argv,
			timeout_seconds: typeof receipt.timeout_seconds === 'number' ? receipt.timeout_seconds : 0,
			max_output_bytes: typeof receipt.max_output_bytes === 'number' ? receipt.max_output_bytes : 0,
			success_exit_codes: readNumberArray(receipt.success_exit_codes),
			exit_code: typeof receipt.exit_code === 'number' ? receipt.exit_code : null,
			signal: typeof receipt.signal === 'string' ? receipt.signal : null,
			error: typeof receipt.error === 'string' ? receipt.error : null,
			kill_method: typeof receipt.kill_method === 'string' ? receipt.kill_method : null,
			receipt_path: typeof receipt.receipt_path === 'string' ? receipt.receipt_path : LATEST_RUN_RELATIVE_PATH,
			stdout: readRunOutput(receipt.stdout),
			stderr: readRunOutput(receipt.stderr),
		};
	} catch (error) {
		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: true,
			valid: false,
			error: 'Invalid latest run receipt.',
		};
	}
}

async function renderStatusResponse(projectRoot: string): Promise<DashboardStatusSnapshot> {
	const context = getAgentContext(projectRoot);
	const manifest = inspectManifestLock(projectRoot);
	const lock = manifest.readResult.kind === 'present' ? manifest.readResult.lock : undefined;
	const activeDocuments = listDocReviewEntries(projectRoot);
	const rawCommandContract = readDashboardCommandContract(projectRoot);
	const commandContract = await renderCommandContractResponse(projectRoot, rawCommandContract);
	const gitChangedFiles = readGitChangedFiles(projectRoot);
	const packageMetadata = readPackageMetadata();

	return {
		schema_version: '1',
		command: 'dashboard status',
		installed: context.installed,
		manifest_lock: context.manifest_lock,
		template: context.template,
		release: {
			package_name: packageMetadata.name,
			package_version: packageMetadata.version,
			version_sources: detectVersionSources(projectRoot),
			release_sensitive_changed_files: matchingFiles(gitChangedFiles, RELEASE_FILE_PATTERNS),
		},
		update: renderUpdateResponse(projectRoot),
		run_history: renderRunHistoryResponse(projectRoot),
		skills: renderSkillsResponse(projectRoot),
		tracked_files: lock?.files.length ?? 0,
		changed_files: manifest.changedFiles,
		missing_files: manifest.missingFiles,
		issues: manifest.issues,
		runnable_intents: context.command_contract.runnable_intents,
		command_contract: commandContract,
		verification: createDashboardVerificationSnapshot(
			projectRoot,
			rawCommandContract,
			commandContract.intents,
			gitChangedFiles,
			manifest.changedFiles,
			manifest.missingFiles,
		),
		latest_run: context.latest_run,
		active_review_documents: activeDocuments.length,
	};
}

function toDashboardUrl(host: string, port: number): string {
	const formattedHost = host === '::1' ? '[::1]' : host;
	return `http://${formattedHost}:${port}/`;
}

export async function runDashboard(args: string[], reporter: Reporter, lang: CliLang = 'en'): Promise<number> {
	if (args.includes('--help') || args.includes('-h')) {
		reporter.stdout(getDashboardHelp(lang));
		return 0;
	}

	const parsed = parseDashboardOptions(args, lang);
	if (parsed.error || !parsed.options) {
		printUsageError(reporter, parsed.error ?? t(lang, 'cli.common.invalidInput'), 'mf dashboard --help', getDashboardHelp(lang), lang);
		return 1;
	}

	const options = parsed.options;
	const projectRoot = resolveMustflowRoot();

	if (options.exportPath) {
		try {
			const result = writeDashboardExport({
				projectRoot,
				outputPath: options.exportPath,
				format: options.exportFormat ?? 'html',
				preferences: readDashboardPreferences(projectRoot),
				status: await renderStatusResponse(projectRoot),
				docsReview: renderDocReviewResponse(projectRoot, new URL('/api/docs/review', 'http://localhost')),
			});

			reporter.stdout(t(lang, 'dashboard.export.wrote', { path: result.relativePath, bytes: result.bytes }));
			return 0;
		} catch (error) {
			const message =
				error instanceof DashboardExportPathError
					? t(lang, 'dashboard.error.exportPathOutsideRoot', { path: error.targetPath })
					: error instanceof Error
						? error.message
						: String(error);
			printUsageError(reporter, message, 'mf dashboard --help', getDashboardHelp(lang), lang);
			return 1;
		}
	}

	const token = randomBytes(18).toString('base64url');
	const initialSnapshot = readDashboardPreferences(projectRoot);
	const server = http.createServer(async (request, response) => {
		const requestUrl = new URL(request.url ?? '/', 'http://localhost');

		try {
			if (request.method === 'GET' && requestUrl.pathname === '/') {
				response.writeHead(200, {
					'cache-control': 'no-store',
					'content-type': 'text/html; charset=utf-8',
				});
				response.end(
					renderDashboardHtml(
						readDashboardPreferences(projectRoot),
						token,
						await renderStatusResponse(projectRoot),
						renderDocReviewResponse(projectRoot, new URL('/api/docs/review', 'http://localhost')),
					),
				);
				return;
			}

			if (request.method === 'GET' && requestUrl.pathname === '/favicon.ico') {
				response.writeHead(204, { 'cache-control': 'no-store' });
				response.end();
				return;
			}

			if (requestUrl.pathname === '/api/status') {
				if (!isAuthorized(request, token)) {
					sendText(response, 403, 'Forbidden');
					return;
				}

				if (request.method === 'GET') {
					sendJson(response, 200, await renderStatusResponse(projectRoot));
					return;
				}
			}

			if (requestUrl.pathname === '/api/preferences') {
				if (!isAuthorized(request, token)) {
					sendText(response, 403, 'Forbidden');
					return;
				}

				if (request.method === 'GET') {
					sendJson(response, 200, readDashboardPreferences(projectRoot));
					return;
				}

				if (request.method === 'POST') {
					const body = await readRequestJson(request);
					sendJson(response, 200, updateDashboardPreferences(projectRoot, readUpdatePayload(body)));
					return;
				}
			}

			if (requestUrl.pathname === '/api/open-mustflow') {
				if (!isAuthorized(request, token)) {
					sendText(response, 403, 'Forbidden');
					return;
				}

				if (request.method !== 'POST') {
					sendText(response, 405, 'Method not allowed');
					return;
				}

				const mustflowPath = path.join(projectRoot, '.mustflow');
				if (!existsSync(mustflowPath)) {
					sendText(response, 404, '.mustflow folder not found');
					return;
				}

				if (!openPathInFileManager(mustflowPath)) {
					sendText(response, 500, 'No file manager opener is available for this platform');
					return;
				}

				sendJson(response, 200, { opened: true });
				return;
			}

			if (requestUrl.pathname === '/api/docs/review') {
				if (!isAuthorized(request, token)) {
					sendText(response, 403, 'Forbidden');
					return;
				}

				if (request.method === 'GET') {
					sendJson(response, 200, renderDocReviewResponse(projectRoot, requestUrl));
					return;
				}

				if (request.method === 'POST') {
					const body = await readRequestJson(request);
					markDocReviewEntry(projectRoot, readDocReviewPayload(body));
					sendJson(response, 200, renderDocReviewResponse(projectRoot, requestUrl));
					return;
				}
			}

			sendText(response, 404, 'Not found');
		} catch {
			sendBadRequest(response);
		}
	});

	return new Promise((resolve) => {
		let resolved = false;
		const close = () => {
			if (resolved) {
				return;
			}

			resolved = true;
			server.close(() => resolve(0));
		};

		server.on('error', (error) => {
			if (!resolved) {
				resolved = true;
				reporter.stderr(error instanceof Error ? error.message : String(error));
				resolve(1);
			}
		});

		server.listen(options.port, options.host, () => {
			const address = server.address() as AddressInfo;
			const url = toDashboardUrl(options.host, address.port);

			if (options.json) {
				reporter.stdout(
					JSON.stringify({
						schema_version: '1',
						command: 'dashboard',
						status: 'listening',
						url,
						project_root: projectRoot,
						preferences_path: initialSnapshot.preferencesPath,
					}),
				);
			} else {
				reporter.stdout(t(lang, 'dashboard.listening', { url }));
			}

			if (options.openBrowser) {
				openUrlInBrowser(url);
			}
		});

		process.once('SIGINT', close);
		process.once('SIGTERM', close);
	});
}
