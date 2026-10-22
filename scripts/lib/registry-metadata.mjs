import { request } from 'node:https';

export function readRegistryMetadata(url, {
	timeoutMs = 30_000,
	maxBytes = 32 * 1024 * 1024,
	signal,
	requestImpl = request,
} = {}) {
	if (!Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 2_147_483_647) {
		throw new RangeError('Invalid registry request timeout');
	}
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError('Invalid registry response size limit');
	return new Promise((resolve, reject) => {
		let registryRequest;
		let response;
		let settled = false;
		const finish = (error, value) => {
			if (settled) return;
			settled = true;
			clearTimeout(timer);
			signal?.removeEventListener('abort', onAbort);
			if (error) {
				response?.destroy();
				registryRequest?.destroy();
				reject(error);
			} else {
				resolve(value);
			}
		};
		const onAbort = () => finish(Object.assign(new Error('Registry request interrupted', { cause: signal.reason }), { code: 'EINTERRUPTED' }));
		const timer = setTimeout(() => finish(Object.assign(new Error(`npm registry request timed out after ${timeoutMs}ms`), { code: 'ETIMEDOUT' })), timeoutMs);
		signal?.addEventListener('abort', onAbort, { once: true });
		if (signal?.aborted) { onAbort(); return; }
		try {
			registryRequest = requestImpl(url, { headers: {
				accept: 'application/vnd.npm.install-v1+json, application/json', connection: 'close',
			} }, (incoming) => {
				response = incoming;
				const chunks = [];
				let bytes = 0;
				incoming.on('error', (cause) => finish(new Error('npm registry response failed', { cause })));
				incoming.once('aborted', () => finish(new Error('npm registry response aborted before completion')));
				incoming.once('close', () => {
					if (!incoming.complete) finish(new Error('npm registry response closed before completion'));
				});
				if (settled) { incoming.destroy(); return; }
				incoming.on('data', (chunk) => {
					if (settled) return;
					const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
					bytes += buffer.byteLength;
					if (bytes > maxBytes) { finish(new Error(`npm registry response exceeds ${maxBytes} bytes`)); return; }
					chunks.push(buffer);
				});
				incoming.once('end', () => {
					if (settled) return;
					if (incoming.complete === false) { finish(new Error('npm registry response incomplete')); return; }
					if (incoming.statusCode === 404) { finish(null, { exists: false, versions: {} }); return; }
					if (!incoming.statusCode || incoming.statusCode < 200 || incoming.statusCode >= 300) {
						finish(new Error(`npm registry returned HTTP ${incoming.statusCode ?? 'unknown'}`));
						return;
					}
					try {
						const metadata = JSON.parse(Buffer.concat(chunks).toString('utf8'));
						const versions = metadata && typeof metadata === 'object' && metadata.versions && typeof metadata.versions === 'object'
							? metadata.versions : {};
						finish(null, { exists: true, versions });
					} catch (cause) {
						finish(new Error('Invalid npm registry JSON response', { cause }));
					}
				});
			});
			registryRequest.on('error', (cause) => finish(new Error('npm registry request failed', { cause })));
			if (settled) registryRequest.destroy();
			else registryRequest.end();
		} catch (cause) {
			finish(new Error('npm registry request failed', { cause }));
		}
	});
}
