import { AsyncLocalStorage } from 'node:async_hooks';

const MAX_CACHE_BYTES = 16 * 1024 * 1024;
const MAX_ENTRY_BYTES = 1024 * 1024;
interface ReadCache {
	readonly entries: Map<string, Buffer>;
	bytes: number;
	hits: number;
	misses: number;
}
const scope = new AsyncLocalStorage<ReadCache>();

export function withFileReadCache<T>(callback: () => T): T {
	if (scope.getStore()) return callback();
	return scope.run({ entries: new Map(), bytes: 0, hits: 0, misses: 0 }, callback);
}

export function fileReadCacheStats(): { hits: number; misses: number; bytes: number } | null {
	const cache = scope.getStore();
	return cache ? { hits: cache.hits, misses: cache.misses, bytes: cache.bytes } : null;
}

// Call only after reopening the file and validating its current identity, safety,
// and read budget. The key must include the current descriptor's metadata.
export function reuseFileRead(key: string, read: () => Buffer): Buffer {
	const cache = scope.getStore();
	if (!cache) return read();
	const existing = cache.entries.get(key);
	if (existing) {
		cache.hits++;
		return Buffer.from(existing);
	}
	cache.misses++;
	const value = read();
	if (value.byteLength <= MAX_ENTRY_BYTES) {
		if (cache.bytes + value.byteLength > MAX_CACHE_BYTES) {
			cache.entries.clear();
			cache.bytes = 0;
		}
		cache.entries.set(key, Buffer.from(value));
		cache.bytes += value.byteLength;
	}
	return value;
}
