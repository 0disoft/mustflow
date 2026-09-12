import { performance } from 'node:perf_hooks';

export interface CheckProgressEvent {
	readonly phase: string;
	readonly state: 'started' | 'completed' | 'failed';
	readonly elapsed_ms: number;
}
export type CheckProgressObserver = (event: CheckProgressEvent) => void;

export function runCheckStage<T>(phase: string, observer: CheckProgressObserver | undefined, run: () => T): T {
	if (!observer) return run();
	const started = performance.now();
	observer({ phase, state: 'started', elapsed_ms: 0 });
	try {
		const result = run();
		observer({ phase, state: 'completed', elapsed_ms: Math.round(performance.now() - started) });
		return result;
	} catch (error) {
		observer({ phase, state: 'failed', elapsed_ms: Math.round(performance.now() - started) });
		throw error;
	}
}

export async function runAsyncCheckStage<T>(phase: string, observer: CheckProgressObserver | undefined, run: () => Promise<T>): Promise<T> {
	if (!observer) return run();
	const started = performance.now();
	observer({ phase, state: 'started', elapsed_ms: 0 });
	try {
		const result = await run();
		observer({ phase, state: 'completed', elapsed_ms: Math.round(performance.now() - started) });
		return result;
	} catch (error) {
		observer({ phase, state: 'failed', elapsed_ms: Math.round(performance.now() - started) });
		throw error;
	}
}
