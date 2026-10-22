interface SnapshotEntry {
	readonly signature: string;
	promise: Promise<unknown>;
	expiresAt: number | null;
}

export class DashboardSnapshotCache {
	private readonly entries = new Map<string, SnapshotEntry>();

	constructor(private readonly ttlMs: number, private readonly now: () => number = Date.now) {}

	read<T>(key: string, signature: string, read: () => Promise<T>): Promise<T> {
		const cached = this.entries.get(key);
		if (cached && cached.signature === signature && (cached.expiresAt === null || cached.expiresAt > this.now())) {
			return cached.promise as Promise<T>;
		}
		const entry: SnapshotEntry = { signature, expiresAt: null, promise: Promise.resolve().then(read) };
		const promise = entry.promise.then((value) => {
			if (this.entries.get(key) === entry) {
				if (this.ttlMs === 0) this.entries.delete(key);
				else entry.expiresAt = this.now() + this.ttlMs;
			}
			return value as T;
		}, (error: unknown) => {
			if (this.entries.get(key) === entry) this.entries.delete(key);
			throw error;
		});
		entry.promise = promise;
		this.entries.set(key, entry);
		return promise;
	}
}
