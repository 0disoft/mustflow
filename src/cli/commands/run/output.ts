import type { BoundedOutputSnapshot } from '../../../core/bounded-output.js';
import type { Reporter } from '../../lib/reporter.js';

const OUTPUT_LIMIT_ERROR_CODE = 'ENOBUFS';
const OUTPUT_LIMIT_ERROR_MESSAGE = /\bmaxBuffer\b.*\bexceeded\b/i;

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
