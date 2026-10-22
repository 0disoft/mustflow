export const MAX_TIMER_DELAY_MS = 2_147_483_647;
export const TERMINATION_CONFIRMATION_FALLBACK_MS = 1000;
export const MAX_COMMAND_TIMEOUT_SECONDS = Math.floor(MAX_TIMER_DELAY_MS / 1000);
export const MAX_COMMAND_KILL_AFTER_SECONDS = Math.floor((MAX_TIMER_DELAY_MS - TERMINATION_CONFIRMATION_FALLBACK_MS) / 1000);

export function commandTimersAreSafe(timeoutSeconds: number, killAfterSeconds: number): boolean {
	return Number.isFinite(timeoutSeconds) && timeoutSeconds * 1000 >= 1 && timeoutSeconds * 1000 <= MAX_TIMER_DELAY_MS &&
		Number.isFinite(killAfterSeconds) && killAfterSeconds >= 0 && killAfterSeconds * 1000 + TERMINATION_CONFIRMATION_FALLBACK_MS <= MAX_TIMER_DELAY_MS;
}
