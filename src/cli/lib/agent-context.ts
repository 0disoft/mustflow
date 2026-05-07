import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
	isRecord,
	readPositiveInteger,
	readString,
	readStringArray,
	type TomlTable,
} from './command-contract.js';
import { toPosixPath } from './filesystem.js';
import { inspectManifestLock } from './manifest-lock.js';
import { readTomlFile } from './toml.js';

const CONTEXT_SCHEMA_VERSION = '1';
const COMMANDS_RELATIVE_PATH = '.mustflow/config/commands.toml';
const MUSTFLOW_RELATIVE_PATH = '.mustflow/config/mustflow.toml';
const LATEST_RUN_RELATIVE_PATH = '.mustflow/state/runs/latest.json';

type JsonScalar = string | number | boolean | null;
type JsonObject = Record<string, JsonScalar | JsonScalar[]>;

export interface PathContext {
	readonly path: string;
	readonly exists: boolean;
}

export interface IntentContext {
	readonly name: string;
	readonly status: string;
	readonly lifecycle: string | null;
	readonly run_policy: string | null;
	readonly description: string | null;
}

export interface CommandContractContext {
	readonly path: string;
	readonly exists: boolean;
	readonly intents: readonly IntentContext[];
	readonly runnable_intents: readonly string[];
}

export type LatestRunContext =
	| {
			readonly path: string;
			readonly exists: false;
	  }
	| {
			readonly path: string;
			readonly exists: true;
			readonly valid: false;
			readonly error: string;
	  }
	| {
			readonly path: string;
			readonly exists: true;
			readonly valid: true;
			readonly intent: string;
			readonly status: string;
			readonly timed_out: boolean;
			readonly exit_code: number | null;
			readonly finished_at: string | null;
			readonly duration_ms: number | null;
	  };

export interface AgentContext {
	readonly schema_version: string;
	readonly command: 'context';
	readonly mustflow_root: string;
	readonly installed: boolean;
	readonly manifest_lock: 'missing' | 'invalid' | 'present';
	readonly template: { readonly id: string; readonly version: string } | null;
	readonly authority: JsonObject;
	readonly capabilities: JsonObject;
	readonly read_order: readonly PathContext[];
	readonly optional_read_order: readonly PathContext[];
	readonly command_contract: CommandContractContext;
	readonly latest_run: LatestRunContext;
	readonly issues: readonly string[];
}

function safeExists(projectRoot: string, relativePath: string): boolean {
	const resolved = path.resolve(projectRoot, ...relativePath.split('/'));
	const root = path.resolve(projectRoot);
	const relative = path.relative(root, resolved);

	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return false;
	}

	return existsSync(resolved);
}

function readTomlTableIfExists(projectRoot: string, relativePath: string): TomlTable | undefined {
	const filePath = path.join(projectRoot, ...relativePath.split('/'));

	if (!existsSync(filePath)) {
		return undefined;
	}

	const parsed = readTomlFile(filePath);
	return isRecord(parsed) ? parsed : undefined;
}

function readPathContext(projectRoot: string, paths: readonly string[]): readonly PathContext[] {
	return paths.map((relativePath) => ({
		path: toPosixPath(relativePath),
		exists: safeExists(projectRoot, relativePath),
	}));
}

function readScalarObject(table: TomlTable | undefined): JsonObject {
	if (!table) {
		return {};
	}

	const result: Record<string, JsonScalar | JsonScalar[]> = {};

	for (const [key, value] of Object.entries(table)) {
		if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || value === null) {
			result[key] = value;
			continue;
		}

		if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
			result[key] = value;
		}
	}

	return result;
}

function isRunnableIntent(intent: TomlTable): boolean {
	return (
		readString(intent, 'status') === 'configured' &&
		readString(intent, 'lifecycle') === 'oneshot' &&
		readString(intent, 'run_policy') === 'agent_allowed' &&
		intent.stdin === 'closed' &&
		Boolean(readPositiveInteger(intent, 'timeout_seconds'))
	);
}

function readCommandContractContext(projectRoot: string): CommandContractContext {
	const commands = readTomlTableIfExists(projectRoot, COMMANDS_RELATIVE_PATH);

	if (!commands || !isRecord(commands.intents)) {
		return {
			path: COMMANDS_RELATIVE_PATH,
			exists: safeExists(projectRoot, COMMANDS_RELATIVE_PATH),
			intents: [],
			runnable_intents: [],
		};
	}

	const intents: IntentContext[] = [];
	const runnableIntents: string[] = [];

	for (const [name, intent] of Object.entries(commands.intents).sort(([left], [right]) => left.localeCompare(right))) {
		if (!isRecord(intent)) {
			continue;
		}

		const status = readString(intent, 'status') ?? 'unknown';
		const lifecycle = readString(intent, 'lifecycle') ?? null;
		const runPolicy = readString(intent, 'run_policy') ?? null;

		intents.push({
			name,
			status,
			lifecycle,
			run_policy: runPolicy,
			description: readString(intent, 'description') ?? null,
		});

		if (isRunnableIntent(intent)) {
			runnableIntents.push(name);
		}
	}

	return {
		path: COMMANDS_RELATIVE_PATH,
		exists: true,
		intents,
		runnable_intents: runnableIntents,
	};
}

function readLatestRunContext(projectRoot: string): LatestRunContext {
	const latestPath = path.join(projectRoot, ...LATEST_RUN_RELATIVE_PATH.split('/'));

	if (!existsSync(latestPath)) {
		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: false,
		};
	}

	try {
		const parsed = JSON.parse(readFileSync(latestPath, 'utf8')) as unknown;

		if (!isRecord(parsed)) {
			throw new Error('latest run receipt must contain a JSON object');
		}

		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: true,
			valid: true,
			intent: typeof parsed.intent === 'string' ? parsed.intent : 'unknown',
			status: typeof parsed.status === 'string' ? parsed.status : 'unknown',
			timed_out: parsed.timed_out === true,
			exit_code: typeof parsed.exit_code === 'number' ? parsed.exit_code : null,
			finished_at: typeof parsed.finished_at === 'string' ? parsed.finished_at : null,
			duration_ms: typeof parsed.duration_ms === 'number' ? parsed.duration_ms : null,
		};
	} catch (error) {
		return {
			path: LATEST_RUN_RELATIVE_PATH,
			exists: true,
			valid: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

export function getAgentContext(projectRoot: string): AgentContext {
	const mustflow = readTomlTableIfExists(projectRoot, MUSTFLOW_RELATIVE_PATH);
	const authority = isRecord(mustflow?.authority) ? mustflow.authority : undefined;
	const capabilities = isRecord(mustflow?.capabilities) ? mustflow.capabilities : undefined;
	const readOrder = mustflow ? readStringArray(mustflow, 'read_order') ?? [] : [];
	const optionalReadOrder = mustflow ? readStringArray(mustflow, 'optional_read_order') ?? [] : [];
	const lockInspection = inspectManifestLock(projectRoot);
	const lock = lockInspection.readResult.kind === 'present' ? lockInspection.readResult.lock : undefined;

	return {
		schema_version: CONTEXT_SCHEMA_VERSION,
		command: 'context',
		mustflow_root: path.resolve(projectRoot),
		installed: safeExists(projectRoot, 'AGENTS.md') && safeExists(projectRoot, '.mustflow'),
		manifest_lock: lockInspection.readResult.kind,
		template: lock ? { id: lock.templateId, version: lock.templateVersion } : null,
		authority: readScalarObject(authority),
		capabilities: readScalarObject(capabilities),
		read_order: readPathContext(projectRoot, readOrder),
		optional_read_order: readPathContext(projectRoot, optionalReadOrder),
		command_contract: readCommandContractContext(projectRoot),
		latest_run: readLatestRunContext(projectRoot),
		issues: lockInspection.issues,
	};
}
