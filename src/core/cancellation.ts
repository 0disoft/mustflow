import { setTimeout as sleep } from 'node:timers/promises';

export function interruptionError(): NodeJS.ErrnoException {
	return Object.assign(new Error('Command interrupted'), { code: 'EINTERRUPTED' });
}

export function throwIfInterrupted(signal?: AbortSignal): void {
	if (signal?.aborted) throw interruptionError();
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
