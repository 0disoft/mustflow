import { timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Reporter } from './reporter.js';

export const DASHBOARD_HTTP_POLICY = Object.freeze({
	tokenBytes: 18,
	maxRequestBytes: 64 * 1024,
	headersTimeoutMs: 10_000,
	requestTimeoutMs: 30_000,
	keepAliveTimeoutMs: 1_000,
});

export interface DashboardHttpContext {
	readonly token: string;
	readonly reporter: Pick<Reporter, 'stderr'>;
	readonly renderHome: () => Promise<string>;
	readonly readStatus: () => Promise<unknown>;
	readonly readPreferences: () => unknown;
	readonly updatePreferences: (payload: unknown) => unknown;
	readonly readDocReview: (url: URL) => unknown;
	readonly markDocReview: (payload: unknown) => void;
	readonly openMustflow: () => 'opened' | 'missing' | 'unavailable';
}

function sendJson(response: ServerResponse, statusCode: number, value: unknown): void {
	if (response.destroyed || response.writableEnded) return;
	const body = JSON.stringify(value);
	response.writeHead(statusCode, {
		'cache-control': 'no-store',
		'content-type': 'application/json; charset=utf-8',
	});
	response.end(body);
}

function sendText(response: ServerResponse, statusCode: number, value: string): void {
	if (response.destroyed || response.writableEnded) return;
	response.writeHead(statusCode, {
		'cache-control': 'no-store',
		'content-type': 'text/plain; charset=utf-8',
	});
	response.end(value);
}

function sendBadRequest(response: ServerResponse): void {
	sendText(response, 400, 'Bad request');
}

function isDashboardBadRequestError(error: unknown, message: string): boolean {
	return (
		error instanceof SyntaxError ||
		message === 'Request body is too large.' ||
		message === 'Invalid review status.' ||
		message === 'Request body must be a JSON object.' ||
		message === 'Request body must include an updates array.' ||
		message === 'Each update must be a JSON object.' ||
		message === 'Each update must include an id.' ||
		message === 'Bulk documentation review updates require a separate confirmed flow.' ||
		message.startsWith('Unknown dashboard preference: ') ||
		message.endsWith(' is locked in the dashboard.') ||
		message.endsWith(' is required.') ||
		message.endsWith(' must be a boolean.') ||
		message.endsWith(' must be an integer.') ||
		message.endsWith(' must be a string.') ||
		message.endsWith(' must not be empty.') ||
		/^.+ must be at (?:least|most) \d+\.$/u.test(message) ||
		/^.+ must be one of: .+\.$/u.test(message) ||
		message.startsWith('status must be ') ||
		message.startsWith('reviewerKind must be ')
	);
}

function isAuthorized(request: IncomingMessage, token: string): boolean {
	const rawToken = request.headers['x-mustflow-dashboard-token'];
	const candidate = Array.isArray(rawToken) ? rawToken[0] : rawToken;
	if (typeof candidate !== 'string') {
		return false;
	}

	const expected = Buffer.from(token);
	const actual = Buffer.from(candidate);
	return expected.byteLength === actual.byteLength && timingSafeEqual(actual, expected);
}

async function readRequestJson(request: IncomingMessage): Promise<unknown> {
	const chunks: Buffer[] = [];
	let totalBytes = 0;

	for await (const chunk of request) {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
		totalBytes += buffer.byteLength;

		if (totalBytes > DASHBOARD_HTTP_POLICY.maxRequestBytes) {
			throw new Error('Request body is too large.');
		}

		chunks.push(buffer);
	}

	const rawBody = Buffer.concat(chunks).toString('utf8');
	return rawBody.trim().length === 0 ? {} : JSON.parse(rawBody);
}

async function handlePreferences(request: IncomingMessage, response: ServerResponse, context: DashboardHttpContext): Promise<void> {
	if (request.method === 'GET') {
		sendJson(response, 200, context.readPreferences());
		return;
	}
	if (request.method === 'POST') {
		const body = await readRequestJson(request);
		sendJson(response, 200, context.updatePreferences(body));
		return;
	}
	sendText(response, 404, 'Not found');
}

async function handleDocReview(request: IncomingMessage, response: ServerResponse, url: URL, context: DashboardHttpContext): Promise<void> {
	if (request.method === 'GET') {
		sendJson(response, 200, context.readDocReview(url));
		return;
	}
	if (request.method === 'POST') {
		const body = await readRequestJson(request);
		context.markDocReview(body);
		sendJson(response, 200, context.readDocReview(url));
		return;
	}
	sendText(response, 404, 'Not found');
}

function handleOpenMustflow(request: IncomingMessage, response: ServerResponse, context: DashboardHttpContext): void {
	if (request.method !== 'POST') {
		sendText(response, 405, 'Method not allowed');
		return;
	}
	const result = context.openMustflow();
	if (result === 'missing') {
		sendText(response, 404, '.mustflow folder not found');
		return;
	}
	if (result === 'unavailable') {
		sendText(response, 500, 'No file manager opener is available for this platform');
		return;
	}
	sendJson(response, 200, { opened: true });
}

const PROTECTED_PATHS = new Set(['/api/status', '/api/preferences', '/api/open-mustflow', '/api/docs/review']);

async function routeDashboardRequest(request: IncomingMessage, response: ServerResponse, url: URL, context: DashboardHttpContext): Promise<void> {
	if (request.method === 'GET' && url.pathname === '/') {
		const html = await context.renderHome();
		if (response.destroyed || response.writableEnded) return;
		response.writeHead(200, { 'cache-control': 'no-store', 'content-type': 'text/html; charset=utf-8' });
		response.end(html);
		return;
	}
	if (request.method === 'GET' && url.pathname === '/favicon.ico') {
		response.writeHead(204, { 'cache-control': 'no-store' });
		response.end();
		return;
	}
	if (!PROTECTED_PATHS.has(url.pathname)) {
		sendText(response, 404, 'Not found');
		return;
	}
	if (!isAuthorized(request, context.token)) {
		sendText(response, 403, 'Forbidden');
		return;
	}
	switch (url.pathname) {
		case '/api/preferences': return handlePreferences(request, response, context);
		case '/api/docs/review': return handleDocReview(request, response, url, context);
		case '/api/open-mustflow': return handleOpenMustflow(request, response, context);
		case '/api/status':
			if (request.method === 'GET') {
				sendJson(response, 200, await context.readStatus());
				return;
			}
	}
	sendText(response, 404, 'Not found');
}

export function createDashboardRequestHandler(context: DashboardHttpContext): (request: IncomingMessage, response: ServerResponse) => Promise<void> {
	return async (request, response) => {
		try {
			const url = new URL(request.url ?? '/', 'http://localhost');
			await routeDashboardRequest(request, response, url, context);
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (response.destroyed || response.writableEnded) return;
			if (response.headersSent) {
				response.destroy();
				return;
			}
			if (isDashboardBadRequestError(error, message)) {
				sendBadRequest(response);
				return;
			}
			context.reporter.stderr(message);
			sendText(response, 500, 'Internal server error');
		}
	};
}
