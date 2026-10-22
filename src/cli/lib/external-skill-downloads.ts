const EXTERNAL_SKILL_READ_CONCURRENCY = 4;
let activeReads = 0;
const pendingReads = new Set<() => void>();

async function acquireReadSlot(signal?: AbortSignal): Promise<() => void> {
	signal?.throwIfAborted();
	if (activeReads < EXTERNAL_SKILL_READ_CONCURRENCY) {
		activeReads += 1;
	} else {
		await new Promise<void>((resolve, reject) => {
			const start = (): void => {
				pendingReads.delete(start);
				signal?.removeEventListener('abort', abort);
				activeReads += 1;
				resolve();
			};
			const abort = (): void => {
				pendingReads.delete(start);
				signal?.removeEventListener('abort', abort);
				reject(signal?.reason);
			};
			pendingReads.add(start);
			signal?.addEventListener('abort', abort, { once: true });
			if (signal?.aborted) abort();
		});
	}
	return () => {
		activeReads -= 1;
		pendingReads.values().next().value?.();
	};
}

export async function withExternalSkillReadSlot<T>(signal: AbortSignal | undefined, read: () => Promise<T>): Promise<T> {
	const release = await acquireReadSlot(signal);
	try {
		signal?.throwIfAborted();
		return await read();
	} finally {
		release();
	}
}

export async function mapExternalSkillFiles<T, R>(
	values: readonly T[],
	signal: AbortSignal | undefined,
	read: (value: T, signal: AbortSignal) => Promise<R>,
): Promise<R[]> {
	const controller = new AbortController();
	const onAbort = (): void => controller.abort(signal?.reason);
	signal?.addEventListener('abort', onAbort, { once: true });
	if (signal?.aborted) onAbort();
	const results: R[] = new Array(values.length);
	let next = 0;
	let failed = false;
	let failure: unknown;
	const worker = async (): Promise<void> => {
		while (!controller.signal.aborted && next < values.length) {
			const index = next++;
			try {
				results[index] = await read(values[index], controller.signal);
			} catch (error) {
				if (!failed) {
					failed = true;
					failure = error;
					controller.abort(error);
				}
			}
		}
	};
	try {
		await Promise.all(Array.from({ length: Math.min(values.length, EXTERNAL_SKILL_READ_CONCURRENCY) }, worker));
		if (failed) throw failure;
		controller.signal.throwIfAborted();
		return results;
	} finally {
		signal?.removeEventListener('abort', onAbort);
	}
}
