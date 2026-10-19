import { existsSync } from 'node:fs';
import path from 'node:path';
import { FileMutationRecovery } from './file-mutation-recovery.js';
import {
	createBackupDirectory,
	readFileInsideWithoutSymlinks,
	writeFileInsideWithoutSymlinks,
} from './filesystem.js';

export class InitRecovery {
	private readonly journal: FileMutationRecovery;
	private backupRoot: string | undefined;

	constructor(private readonly projectRoot: string, backupRoot?: string) {
		this.backupRoot = backupRoot;
		this.journal = new FileMutationRecovery(projectRoot, {
			operation: 'init',
			saveOriginal: (relativePath, original) => {
				if (original === undefined) return;
				this.backupRoot ??= createBackupDirectory(projectRoot);
				const backupPath = path.join(this.backupRoot, relativePath);
				if (existsSync(backupPath)) {
					if (!readFileInsideWithoutSymlinks(projectRoot, backupPath).equals(original)) {
						throw new Error(`File changed after init backup: ${relativePath}`);
					}
				} else {
					writeFileInsideWithoutSymlinks(projectRoot, backupPath, original);
				}
			},
		});
	}

	write(relativePath: string, content: string | Buffer): void {
		const target = path.join(this.projectRoot, relativePath);
		if (existsSync(target) && readFileInsideWithoutSymlinks(this.projectRoot, target).equals(Buffer.from(content))) return;
		this.journal.prepareWrite(relativePath, content);
		writeFileInsideWithoutSymlinks(this.projectRoot, target, content);
	}

	assertApplied(): void {
		this.journal.assertApplied();
	}

	recover(error: unknown): Error {
		const failures = this.journal.rollback();
		const result = failures.length === 0 ? 'Init changes rolled back.'
			: `Automatic recovery incomplete: ${failures.join('; ')}.`;
		const backup = this.backupRoot ? ` Recovery backup: ${this.backupRoot}` : '';
		return new Error(`Init failed: ${error instanceof Error ? error.message : String(error)}. ${result}${backup}`, { cause: error });
	}
}
