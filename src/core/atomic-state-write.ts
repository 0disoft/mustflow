import { randomBytes } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { writeUtf8FileInsideWithoutSymlinks } from './safe-filesystem.js';

export function createStateRunId(prefix: 'run' | 'verify'): string {
	const timestamp = new Date().toISOString().replaceAll(/[:.]/g, '-');
	return `${prefix}-${timestamp}-${process.pid}-${randomBytes(6).toString('hex')}`;
}

export function atomicWriteTextFile(targetPath: string, content: string): void {
	const targetDirectory = path.dirname(targetPath);
	mkdirSync(targetDirectory, { recursive: true });
	writeUtf8FileInsideWithoutSymlinks(targetDirectory, targetPath, content);
}

export function atomicWriteJsonFile(targetPath: string, value: unknown): void {
	atomicWriteTextFile(targetPath, `${JSON.stringify(value, null, 2)}\n`);
}
