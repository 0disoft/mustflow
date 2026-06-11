import { createInterface } from 'node:readline';

import { apiReportActionSpec, isApiReportAction, type ApiReportAction } from './actions.js';
import { printUsageError } from '../../lib/cli-output.js';
import {
	formatCliOptionParseError,
	hasParsedCliOption,
	parseCliOptions,
	type CliOptionSpec,
} from '../../lib/option-parser.js';
import { isRecord } from '../../lib/command-contract.js';
import { t, type CliLang } from '../../lib/i18n.js';
import type { Reporter } from '../../lib/reporter.js';

const API_SERVE_SCHEMA_VERSION = '1';
const API_SERVE_OPTIONS: readonly CliOptionSpec[] = [
	{ name: '--stdio', kind: 'boolean' },
	{ name: '--help', kind: 'boolean', aliases: ['-h'] },
];

interface ApiServeRequest {
	readonly id?: string | number | null;
	readonly action?: unknown;
	readonly changed?: unknown;
}

interface ApiServePolicy {
	readonly mode: 'read_only';
	readonly executes_commands: false;
	readonly direct_commands_allowed: false;
	readonly raw_output_included: false;
	readonly hidden_reasoning_included: false;
}

interface ApiServeError {
	readonly code:
		| 'invalid_json'
		| 'invalid_request'
		| 'unknown_action'
		| 'action_requires_changed'
		| 'action_does_not_accept_changed'
		| 'report_unavailable';
	readonly message: string;
}

interface ApiServeResponseBase {
	readonly schema_version: typeof API_SERVE_SCHEMA_VERSION;
	readonly command: 'api serve';
	readonly transport: 'stdio';
	readonly id: string | number | null;
	readonly policy: ApiServePolicy;
}

interface ApiServeSuccessResponse extends ApiServeResponseBase {
	readonly ok: true;
	readonly result: unknown;
}

interface ApiServeErrorResponse extends ApiServeResponseBase {
	readonly ok: false;
	readonly error: ApiServeError;
}

type ApiServeResponse = ApiServeSuccessResponse | ApiServeErrorResponse;

interface ParsedApiServeRequestLine {
	readonly request: ApiServeRequest | null;
	readonly error: ApiServeErrorResponse | null;
}

export interface ApiServeRuntime {
	readonly createReport: (action: ApiReportAction) => unknown;
	readonly getHelp: (lang: CliLang) => string;
}

function createApiServePolicy(): ApiServePolicy {
	return {
		mode: 'read_only',
		executes_commands: false,
		direct_commands_allowed: false,
		raw_output_included: false,
		hidden_reasoning_included: false,
	};
}

function createApiServeError(id: string | number | null, code: ApiServeError['code'], message: string): ApiServeErrorResponse {
	return {
		schema_version: API_SERVE_SCHEMA_VERSION,
		command: 'api serve',
		transport: 'stdio',
		id,
		ok: false,
		policy: createApiServePolicy(),
		error: {
			code,
			message,
		},
	};
}

function createApiServeSuccess(id: string | number | null, result: unknown): ApiServeSuccessResponse {
	return {
		schema_version: API_SERVE_SCHEMA_VERSION,
		command: 'api serve',
		transport: 'stdio',
		id,
		ok: true,
		policy: createApiServePolicy(),
		result,
	};
}

function readApiServeId(request: unknown): string | number | null {
	if (!isRecord(request) || !Object.hasOwn(request, 'id')) {
		return null;
	}

	const value = request.id;
	if (typeof value === 'string' || typeof value === 'number' || value === null) {
		return value;
	}

	return null;
}

function parseApiServeRequestLine(line: string): ParsedApiServeRequestLine {
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return {
			request: null,
			error: createApiServeError(null, 'invalid_json', `Invalid JSON request: ${message}`),
		};
	}

	const id = readApiServeId(parsed);
	if (!isRecord(parsed)) {
		return {
			request: null,
			error: createApiServeError(id, 'invalid_request', 'Request must be a JSON object.'),
		};
	}

	return {
		request: {
			id,
			action: parsed.action,
			changed: parsed.changed,
		},
		error: null,
	};
}

function createApiServeResponse(request: ApiServeRequest, runtime: ApiServeRuntime): ApiServeResponse {
	const id = typeof request.id === 'string' || typeof request.id === 'number' || request.id === null ? request.id : null;

	if (typeof request.action !== 'string') {
		return createApiServeError(id, 'invalid_request', 'Request field "action" must be a string.');
	}

	if (!isApiReportAction(request.action)) {
		return createApiServeError(id, 'unknown_action', `Unknown api action: ${request.action}`);
	}

	const spec = apiReportActionSpec(request.action);
	if (spec.requiresChanged && request.changed !== true) {
		return createApiServeError(id, 'action_requires_changed', `${request.action} requires changed: true.`);
	}

	if (!spec.requiresChanged && request.changed === true) {
		return createApiServeError(id, 'action_does_not_accept_changed', `${request.action} does not accept changed: true.`);
	}

	try {
		return createApiServeSuccess(id, runtime.createReport(request.action));
	} catch (error) {
		return createApiServeError(id, 'report_unavailable', error instanceof Error ? error.message : String(error));
	}
}

function writeApiServeResponse(response: ApiServeResponse, reporter: Reporter): void {
	const line = `${JSON.stringify(response)}\n`;
	if (reporter.writeStdout) {
		reporter.writeStdout(line);
		return;
	}

	reporter.stdout(line.trimEnd());
}

export async function runApiServe(
	args: readonly string[],
	reporter: Reporter,
	lang: CliLang,
	runtime: ApiServeRuntime,
): Promise<number> {
	const parsed = parseCliOptions(args, API_SERVE_OPTIONS);

	if (hasParsedCliOption(parsed, '--help')) {
		reporter.stdout(runtime.getHelp(lang));
		return 0;
	}

	if (parsed.error) {
		printUsageError(reporter, formatCliOptionParseError(parsed.error, lang), 'mf api --help', runtime.getHelp(lang), lang);
		return 1;
	}

	if (!hasParsedCliOption(parsed, '--stdio')) {
		printUsageError(reporter, t(lang, 'api.error.serveRequiresStdio'), 'mf api --help', runtime.getHelp(lang), lang);
		return 1;
	}

	const input = createInterface({
		input: process.stdin,
		crlfDelay: Infinity,
	});

	for await (const rawLine of input) {
		const line = rawLine.trim();
		if (line.length === 0) {
			continue;
		}

		const parsed = parseApiServeRequestLine(line);
		if (parsed.error) {
			writeApiServeResponse(parsed.error, reporter);
			continue;
		}

		if (!parsed.request) {
			writeApiServeResponse(createApiServeError(null, 'invalid_request', 'Request must be a JSON object.'), reporter);
			continue;
		}

		writeApiServeResponse(createApiServeResponse(parsed.request, runtime), reporter);
	}

	return 0;
}
