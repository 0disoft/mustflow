import { setTimeout as sleep } from 'node:timers/promises';

export function interruptionError(cause?: unknown): NodeJS.ErrnoException {
	return Object.assign(new Error('Command interrupted', { cause }), { code: 'EINTERRUPTED' });
}

export function throwIfInterrupted(signal?: AbortSignal): void {
	if (signal?.aborted) throw interruptionError(signal.reason);
}

export async function waitWithSignal(milliseconds: number, signal?: AbortSignal): Promise<void> {
	throwIfInterrupted(signal);
	try {
		await sleep(milliseconds, undefined, { signal });
	} catch (error) {
		throwIfInterrupted(signal);
		throw error;
	}
}
