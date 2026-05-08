import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

import { openPathInFileManager, openUrlInBrowser } from '../lib/browser-open.js';
import { printUsageError, renderHelp } from '../lib/cli-output.js';
import { renderDashboardHtml } from '../lib/dashboard-html.js';
import {
	readDashboardPreferences,
	updateDashboardPreferences,
	type DashboardPreferenceUpdate,
} from '../lib/dashboard-preferences.js';
import { t, type CliLang } from '../lib/i18n.js';
import { resolveMustflowRoot } from '../lib/project-root.js';
import type { Reporter } from '../lib/reporter.js';

interface DashboardOptions {
	readonly host: string;
	readonly port: number;
	readonly json: boolean;
	readonly openBrowser: boolean;
}

const DEFAULT_DASHBOARD_HOST = '127.0.0.1';
const DEFAULT_DASHBOARD_PORT = 0;
const MAX_REQUEST_BYTES = 64 * 1024;
const LOCAL_DASHBOARD_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

export function getDashboardHelp(lang: CliLang = 'en'): string {
	return renderHelp(
		{
			usage: 'mf dashboard [options]',
			summary: t(lang, 'dashboard.help.summary'),
			options: [
				{ label: '--host <host>', description: t(lang, 'dashboard.help.option.host') },
				{ label: '--port <port>', description: t(lang, 'dashboard.help.option.port') },
				{ label: '--no-open', description: t(lang, 'dashboard.help.option.noOpen') },
				{ label: '--json', description: t(lang, 'cli.option.json') },
				{ label: '-h, --help', description: t(lang, 'cli.option.help') },
			],
			examples: ['mf dashboard', 'mf dashboard --port 4173', 'mf dashboard --json'],
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
	let openBrowser = true;

	for (let index = 0; index < args.length; index += 1) {
		const arg = args[index];

		if (!arg) {
			continue;
		}

		if (arg === '--json') {
			json = true;
			openBrowser = false;
			continue;
		}

		if (arg === '--no-open') {
			openBrowser = false;
			continue;
		}

		if (arg === '--host') {
			const value = args[index + 1];
			if (!value || value.startsWith('-')) {
				return { error: t(lang, 'cli.error.missingValue', { option: '--host' }) };
			}
			host = value;
			index += 1;
			continue;
		}

		if (arg.startsWith('--host=')) {
			host = arg.slice('--host='.length);
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
			continue;
		}

		if (arg.startsWith('-')) {
			return { error: t(lang, 'cli.error.unknownOption', { option: arg }) };
		}

		return { error: t(lang, 'cli.error.unexpectedArgument', { argument: arg }) };
	}

	if (!LOCAL_DASHBOARD_HOSTS.has(host)) {
		return { error: t(lang, 'dashboard.error.nonLocalHost', { host }) };
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
				response.end(renderDashboardHtml(readDashboardPreferences(projectRoot), token));
				return;
			}

			if (request.method === 'GET' && requestUrl.pathname === '/favicon.ico') {
				response.writeHead(204, { 'cache-control': 'no-store' });
				response.end();
				return;
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

			sendText(response, 404, 'Not found');
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			sendText(response, 400, message);
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
