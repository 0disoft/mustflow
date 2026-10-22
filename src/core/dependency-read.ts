import { setTimeout as sleep } from 'node:timers/promises';
import { interruptionError } from './cancellation.js';

export interface DependencyReadOptions {
	readonly signal?: AbortSignal;
	readonly timeoutMs?: number;
	readonly maxRetries?: 0 | 1 | 2;
	readonly fetch?: typeof fetch;
}

export class DependencyHttpError extends Error {
	constructor(readonly status: number, message: string, readonly retryAfterMs = 0) {
		super(message);
		this.name = 'DependencyHttpError';
	}
}

function validateTimeout(timeoutMs: number): void {
	if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647) {
		throw new RangeError('Dependency timeout must be between 1 and 2147483647 milliseconds.');
	}
}

export async function withDependencyDeadline<T>(
	options: Pick<DependencyReadOptions, 'signal' | 'timeoutMs'>,
	work: (signal: AbortSignal) => Promise<T>,
): Promise<T> {
	const timeoutMs = options.timeoutMs ?? 3_000;
	validateTimeout(timeoutMs);
	const controller = new AbortController();
	const onAbort = (): void => controller.abort(interruptionError(options.signal?.reason));
	options.signal?.addEventListener('abort', onAbort, { once: true });
	if (options.signal?.aborted) onAbort();
	const timer = setTimeout(() => controller.abort(Object.assign(
		new Error(`Dependency operation timed out after ${timeoutMs}ms`), { name: 'TimeoutError', code: 'ETIMEDOUT' },
	)), timeoutMs);
	try {
		controller.signal.throwIfAborted();
		return await waitForDependency(work(controller.signal), controller.signal);
	} finally {
		clearTimeout(timer);
		options.signal?.removeEventListener('abort', onAbort);
	}
}

function waitForDependency<T>(work: Promise<T>, signal: AbortSignal): Promise<T> {
	return new Promise((resolve, reject) => {
		const cleanup = (): void => signal.removeEventListener('abort', onAbort);
		const onAbort = (): void => { cleanup(); reject(signal.reason); };
		signal.addEventListener('abort', onAbort, { once: true });
		work.then((value) => { cleanup(); resolve(value); }, (error) => { cleanup(); reject(error); });
		if (signal.aborted) onAbort();
	});
}

function retryable(error: unknown): boolean {
	if (error instanceof DependencyHttpError) return [408, 429, 502, 503, 504].includes(error.status);
	if (!error || typeof error !== 'object') return false;
	if ('code' in error && ['EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT']
		.includes(String(error.code))) return true;
	return 'cause' in error && error.cause !== error && !!error.cause &&
		typeof error.cause === 'object' && 'code' in error.cause &&
		['EAI_AGAIN', 'ECONNRESET', 'ECONNREFUSED', 'ETIMEDOUT', 'UND_ERR_SOCKET', 'UND_ERR_CONNECT_TIMEOUT'].includes(String(error.cause.code));
}

function discardBody(response: Response | undefined): void {
	if (response?.body && !response.body.locked) void response.body.cancel().catch(() => undefined);
}

// This adapter only issues GET requests; mutation workflows must never be passed to its retry loop.
export async function readHttp<T>(
	url: string,
	consume: (response: Response, signal: AbortSignal) => Promise<T>,
	options: DependencyReadOptions & { readonly headers?: Record<string, string> } = {},
): Promise<T> {
	const maxRetries = options.maxRetries ?? 1;
	if (![0, 1, 2].includes(maxRetries)) throw new RangeError('Dependency reads allow at most two retries.');
	return withDependencyDeadline(options, async (signal) => {
		for (let attempt = 0; ; attempt += 1) {
			let response: Response | undefined;
			try {
				signal.throwIfAborted();
				response = await (options.fetch ?? globalThis.fetch)(url, { method: 'GET', headers: options.headers, signal });
				signal.throwIfAborted();
				return await consume(response, signal);
			} catch (error) {
				signal.throwIfAborted();
				if (attempt >= maxRetries || !retryable(error)) {
					if (error instanceof DependencyHttpError) throw error;
					throw new Error(`Dependency read failed: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
				}
				// Release the failed response before waiting or starting another request.
				discardBody(response);
				response = undefined;
				const retryAfter = error instanceof DependencyHttpError ? error.retryAfterMs : 0;
				await sleep(Math.max(retryAfter, 100 * 2 ** attempt + Math.floor(Math.random() * 100)), undefined, { signal });
			} finally {
				discardBody(response);
			}
		}
	});
}

export function httpFailure(response: Response, message: string): DependencyHttpError {
	const header = response.headers?.get('retry-after');
	const seconds = header === null || header === undefined ? NaN : Number(header);
	const delay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(header ?? '') - Date.now();
	return new DependencyHttpError(response.status, message, Math.max(0, Math.min(2_147_483_647, Number.isFinite(delay) ? delay : 0)));
}

export async function readBoundedResponseText(response: Response, maxBytes: number, signal: AbortSignal): Promise<string> {
	// Keep injected fetch implementations that expose only text()/json() compatible.
	if (!response.body) {
		const text = await response.text();
		if (Buffer.byteLength(text) > maxBytes) throw new Error(`Dependency response exceeds ${maxBytes} bytes`);
		return text;
	}
	const reader = response.body.getReader();
	const chunks: Uint8Array[] = [];
	let bytes = 0;
	let complete = false;
	const cancel = (): void => { void reader.cancel(signal.reason).catch(() => undefined); };
	signal.addEventListener('abort', cancel, { once: true });
	try {
		signal.throwIfAborted();
		while (true) {
			const chunk = await reader.read();
			signal.throwIfAborted();
			if (chunk.done) { complete = true; break; }
			bytes += chunk.value.byteLength;
			if (bytes > maxBytes) throw new Error(`Dependency response exceeds ${maxBytes} bytes`);
			chunks.push(chunk.value);
		}
		return Buffer.concat(chunks).toString('utf8');
	} finally {
		signal.removeEventListener('abort', cancel);
		if (!complete) cancel();
		reader.releaseLock();
	}
}
