import { randomBytes } from 'node:crypto';

export const CORRELATION_ID_PATTERN = '^mf-[a-z][a-z0-9_-]*-[0-9a-f]{16}$';

const CORRELATION_ID_REGEX = new RegExp(CORRELATION_ID_PATTERN);

function normalizeCorrelationScope(scope: string): string {
	const normalized = scope
		.toLowerCase()
		.replace(/[^a-z0-9_-]+/g, '_')
		.replace(/^_+|_+$/g, '');

	return /^[a-z][a-z0-9_-]*$/.test(normalized) ? normalized : 'event';
}

export function createCorrelationId(scope: string): string {
	return `mf-${normalizeCorrelationScope(scope)}-${randomBytes(8).toString('hex')}`;
}

export function isCorrelationId(value: unknown): value is string {
	return typeof value === 'string' && CORRELATION_ID_REGEX.test(value);
}
