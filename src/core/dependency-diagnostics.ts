import { randomUUID } from 'node:crypto';

export class DependencyFailure extends Error {
	readonly diagnosticId: string;
	constructor(readonly dependency: string, readonly stage: string, cause: unknown) {
		const id = randomUUID();
		super(`${dependency} unavailable (${stage}; diagnostic ${id})`, { cause });
		this.name = 'DependencyFailure';
		this.diagnosticId = id;
	}
}

function diagnosticCode(cause: object): string {
	if (cause instanceof Error) {
		if (/file is not a database/iu.test(cause.message)) return 'SQLITE_NOTADB';
		if (/database disk image is malformed/iu.test(cause.message)) return 'SQLITE_CORRUPT';
		if (/no such (?:table|column)/iu.test(cause.message)) return 'SQLITE_SCHEMA';
	}
	if ('code' in cause) return String(cause.code);
	return cause instanceof Error ? cause.name : '';
}

// Log types/codes, not exception messages that may contain credentials or source content.
export function formatDependencyFailure(error: DependencyFailure): string {
	const codes: string[] = [];
	const seen = new Set<unknown>();
	let cause: unknown = error.cause;
	while (cause && typeof cause === 'object' && !seen.has(cause) && seen.size < 8) {
		seen.add(cause);
		const code = diagnosticCode(cause);
		if (/^[A-Za-z_][A-Za-z0-9_]{0,63}$/u.test(code)) codes.push(code);
		cause = 'cause' in cause ? cause.cause : null;
	}
	return `${error.message}${codes.length ? ` [${codes.join(' -> ')}]` : ''}`;
}
