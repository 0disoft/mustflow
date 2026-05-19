import { randomBytes } from 'node:crypto';
import { mkdirSync, renameSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';

function tempFilePath(targetPath: string): string {
	const suffix = `${process.pid}-${Date.now()}-${randomBytes(6).toString('hex')}`;
	return path.join(path.dirname(targetPath), `.${path.basename(targetPath)}.${suffix}.tmp`);
}

export function createStateRunId(prefix: 'run' | 'verify'): string {
	const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
	return `${prefix}-${timestamp}-${process.pid}-${randomBytes(6).toString('hex')}`;
}

export function atomicWriteTextFile(targetPath: string, content: string): void {
	mkdirSync(path.dirname(targetPath), { recursive: true });
	const temporaryPath = tempFilePath(targetPath);

	try {
		writeFileSync(temporaryPath, content, { encoding: 'utf8', flag: 'wx' });
		renameSync(temporaryPath, targetPath);
	} catch (error) {
		try {
			unlinkSync(temporaryPath);
		} catch {
			// Best-effort cleanup for a temporary file that may not have been created.
		}
		throw error;
	}
}

export function atomicWriteJsonFile(targetPath: string, value: unknown): void {
	atomicWriteTextFile(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}
