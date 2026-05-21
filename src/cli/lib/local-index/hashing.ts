import { createHash } from 'node:crypto';

export function sha256Text(content: string): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

export function sha256Bytes(content: Uint8Array): string {
	return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}
