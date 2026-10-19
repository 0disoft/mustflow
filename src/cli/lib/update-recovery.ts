import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import path from 'node:path';

import {
	ensureFileTargetInsideWithoutSymlinks,
	readFileInsideWithoutSymlinks,
	removeFileInsideWithoutSymlinks,
	writeFileInsideWithoutSymlinks,
} from './filesystem.js';

interface Mutation {
	readonly original: Buffer | undefined;
	readonly originalHash: string | null;
	readonly nextHash: string | null;
}

function contentHash(content: Buffer | string | undefined): string | null {
	return content === undefined ? null : createHash('sha256').update(content).digest('hex');
}

export class UpdateRecovery {
	private readonly mutations = new Map<string, Mutation>();

	constructor(private readonly projectRoot: string, private readonly backupRoot: string) {}

	private read(filePath: string): Buffer | undefined {
		ensureFileTargetInsideWithoutSymlinks(this.projectRoot, filePath, { allowMissingLeaf: true });
		return existsSync(filePath) ? readFileInsideWithoutSymlinks(this.projectRoot, filePath) : undefined;
	}

	private prepare(relativePath: string, nextHash: string | null): void {
		const original = this.read(path.join(this.backupRoot, relativePath));
		const originalHash = contentHash(original);
		if (contentHash(this.read(path.join(this.projectRoot, relativePath))) !== originalHash) {
			throw new Error(`File changed after update backup: ${relativePath}`);
		}
		this.mutations.set(relativePath, { original, originalHash, nextHash });
	}

	prepareWrite(relativePath: string, content: Buffer | string): void {
		this.prepare(relativePath, contentHash(content));
	}

	prepareRemoval(relativePath: string): void {
		this.prepare(relativePath, null);
	}

	assertApplied(): void {
		for (const [relativePath, mutation] of this.mutations) {
			if (contentHash(this.read(path.join(this.projectRoot, relativePath))) !== mutation.nextHash) {
				throw new Error(`File changed after update write: ${relativePath}`);
			}
		}
	}

	rollback(): string[] {
		const failures: string[] = [];
		for (const [relativePath, mutation] of [...this.mutations].reverse()) {
			try {
				const target = path.join(this.projectRoot, relativePath);
				const currentHash = contentHash(this.read(target));
				if (currentHash === mutation.originalHash) continue;
				if (currentHash !== mutation.nextHash) {
					throw new Error('File changed after update attempt; preserved for manual recovery');
				}
				if (mutation.original === undefined) {
					removeFileInsideWithoutSymlinks(this.projectRoot, target);
				} else {
					writeFileInsideWithoutSymlinks(this.projectRoot, target, mutation.original);
				}
			} catch (error) {
				failures.push(`${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
			}
		}
		return failures;
	}
}
