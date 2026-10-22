import { performance } from 'node:perf_hooks';
import { processStartTokensProveMismatch } from './process-identity.js';

/** Cached observations can confirm an owner, but cannot prove that it is stale. */
export class ProcessStartTokenCache {
	readonly #cache = new Map<number, { readAt: number; token: string | null }>();
	constructor(
		readonly readToken: (pid: number) => string | null,
		readonly now: () => number = () => performance.now(),
		readonly ttlMs = 1000,
	) {}

	readForOwner(pid: number, expectedToken: string): string | null {
		const cached = this.#cache.get(pid);
		const age = cached ? this.now() - cached.readAt : Infinity;
		if (cached && age >= 0 && age <= this.ttlMs && !processStartTokensProveMismatch(expectedToken, cached.token)) {
			return cached.token;
		}
		const token = this.readToken(pid);
		this.#cache.set(pid, { readAt: this.now(), token });
		return token;
	}
}
