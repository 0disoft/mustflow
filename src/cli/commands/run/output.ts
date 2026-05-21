import type { BoundedOutputSnapshot } from '../../../core/bounded-output.js';
import type { Reporter } from '../../lib/reporter.js';

const OUTPUT_LIMIT_ERROR_CODE = 'ENOBUFS';
const OUTPUT_LIMIT_ERROR_MESSAGE = /\bmaxBuffer\b.*\bexceeded\b/i;
const OUTPUT_LIMIT_TERMINATION_MARKER =
	'[mustflow] output limit exceeded; terminating command before streaming more child output.';

export interface BufferedReporter {
	readonly reporter: Reporter;
	readonly stdout: () => string;
	readonly stderr: () => string;
}

export function emitOutput(
	reporter: Reporter,
	output: string | Buffer | BoundedOutputSnapshot | null,
	stream: 'stdout' | 'stderr',
): void {
	if (!output) {
		return;
	}

	const text = (typeof output === 'object' && 'tail' in output ? output.tail : output.toString()).trimEnd();

	if (text.length === 0) {
		return;
	}

	reporter[stream](text);
}

export function createBufferedReporter(): BufferedReporter {
	const stdout: string[] = [];
	const stderr: string[] = [];

	return {
		reporter: {
			stdout(message) {
				stdout.push(`${message}\n`);
			},
			stderr(message) {
				stderr.push(`${message}\n`);
			},
		},
		stdout() {
			return stdout.join('');
		},
		stderr() {
			return stderr.join('');
		},
	};
}

export function writeStreamChunk(reporter: Reporter, stream: 'stdout' | 'stderr', chunk: Buffer): void {
	if (stream === 'stdout') {
		if (reporter.writeStdout) {
			reporter.writeStdout(chunk);
			return;
		}

		reporter.stdout(chunk.toString());
		return;
	}

	if (reporter.writeStderr) {
		reporter.writeStderr(chunk);
		return;
	}

	reporter.stderr(chunk.toString());
}

function isUtf8ContinuationByte(value: number | undefined): boolean {
	return value !== undefined && (value & 0xc0) === 0x80;
}

function findUtf8PrefixEnd(buffer: Buffer, maxBytes: number): number {
	let end = Math.min(buffer.byteLength, Math.max(0, Math.trunc(maxBytes)));

	if (end >= buffer.byteLength) {
		return buffer.byteLength;
	}

	while (end > 0 && isUtf8ContinuationByte(buffer[end])) {
		end -= 1;
	}

	return end;
}

export function writeStreamChunkPrefix(
	reporter: Reporter,
	stream: 'stdout' | 'stderr',
	chunk: Buffer,
	maxBytes: number,
): void {
	const prefixEnd = findUtf8PrefixEnd(chunk, maxBytes);

	if (prefixEnd <= 0) {
		return;
	}

	writeStreamChunk(reporter, stream, chunk.subarray(0, prefixEnd));
}

export function writeOutputLimitTerminationMarker(reporter: Reporter): void {
	reporter.stderr(OUTPUT_LIMIT_TERMINATION_MARKER);
}

export function createOutputLimitError(stream: 'stdout' | 'stderr', maxOutputBytes: number): Error {
	return Object.assign(new Error(`${stream} exceeded per-stream max_output_bytes (${maxOutputBytes})`), {
		code: OUTPUT_LIMIT_ERROR_CODE,
	});
}

export function isOutputLimitExceededError(error: Error | undefined): boolean {
	if (!error) {
		return false;
	}

	const errorWithCode = error as NodeJS.ErrnoException;
	return errorWithCode.code === OUTPUT_LIMIT_ERROR_CODE || OUTPUT_LIMIT_ERROR_MESSAGE.test(error.message);
}
