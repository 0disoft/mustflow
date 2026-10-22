import type { RunTerminationReceipt } from '../../../core/run-receipt.js';

export interface CommandLifecycleState {
	readonly settled: boolean;
	readonly timedOut: boolean;
	readonly error?: Error;
	readonly terminationStarted: boolean;
	readonly childClosed: boolean;
	readonly closeStatus: number | null;
	readonly closeSignal: string | null;
}

export type CommandLifecycleEvent =
	| { readonly type: 'settle' | 'begin_termination' | 'timeout' }
	| { readonly type: 'abort' | 'output_limit' | 'parent_signal' | 'child_error'; readonly error: Error }
	| { readonly type: 'child_close'; readonly status: number | null; readonly signal: string | null };

export function createCommandLifecycleState(): CommandLifecycleState {
	return { settled: false, timedOut: false, terminationStarted: false, childClosed: false, closeStatus: null, closeSignal: null };
}

/** Returning the same state means that this event has already been handled or is ineligible. */
export function transitionCommandLifecycle(state: CommandLifecycleState, event: CommandLifecycleEvent): CommandLifecycleState {
	switch (event.type) {
		case 'settle': return state.settled ? state : { ...state, settled: true };
		case 'begin_termination': return state.terminationStarted ? state : { ...state, terminationStarted: true };
		case 'timeout': return state.settled || state.error ? state : { ...state, timedOut: true };
		case 'abort': return state.settled || state.terminationStarted ? state : { ...state, error: event.error };
		case 'output_limit': return state.settled || state.error ? state : { ...state, error: event.error };
		case 'parent_signal': return { ...state, error: state.error ?? event.error };
		case 'child_error': return { ...state, error: event.error };
		case 'child_close': return { ...state, childClosed: true, closeStatus: event.status, closeSignal: event.signal };
	}
}

export function commandLifecycleOutcome(state: CommandLifecycleState, status: number | null, signal: string | null): {
	readonly status: number | null; readonly signal: string | null; readonly error?: Error;
} {
	if (state.timedOut) {
		return { status: null, signal: null, error: Object.assign(new Error('Command timed out'), { code: 'ETIMEDOUT' }) };
	}
	return { status, signal, error: state.error };
}

export function shouldReleaseRunResources(termination: RunTerminationReceipt | null | undefined): boolean {
	return termination?.confirmed ?? true;
}
