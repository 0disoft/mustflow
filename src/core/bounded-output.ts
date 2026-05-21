export interface BoundedOutputSnapshot {
	readonly bytes: number;
	readonly tail: string;
}

function isUtf8ContinuationByte(value: number | undefined): boolean {
	return value !== undefined && (value & 0xc0) === 0x80;
}

function findUtf8TailStart(buffer: Buffer, startOffset: number): number {
	let start = Math.min(buffer.byteLength, Math.max(0, Math.trunc(startOffset)));

	while (start < buffer.byteLength && isUtf8ContinuationByte(buffer[start])) {
		start += 1;
	}

	return start;
}

export function decodeUtf8Tail(buffer: Buffer, maxTailBytes: number): { readonly text: string; readonly truncated: boolean } {
	if (maxTailBytes <= 0) {
		return { text: '', truncated: buffer.byteLength > 0 };
	}

	const rawStart = buffer.byteLength > maxTailBytes ? buffer.byteLength - maxTailBytes : 0;
	const start = findUtf8TailStart(buffer, rawStart);

	return {
		text: buffer.subarray(start).toString('utf8'),
		truncated: buffer.byteLength > maxTailBytes || start > 0,
	};
}

export class BoundedOutputBuffer {
	readonly #maxTailBytes: number;
	#chunks: Buffer[] = [];
	#headIndex = 0;
	#headOffset = 0;
	#tailBytes = 0;
	#bytes = 0;

	constructor(maxTailBytes: number) {
		this.#maxTailBytes = Math.max(0, maxTailBytes);
	}

	append(chunk: string | Buffer): void {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');

		this.#bytes += buffer.byteLength;

		if (this.#maxTailBytes === 0 || buffer.byteLength === 0) {
			return;
		}

		this.#chunks.push(buffer);
		this.#tailBytes += buffer.byteLength;

		while (this.#tailBytes > this.#maxTailBytes && this.#headIndex < this.#chunks.length) {
			const first = this.#chunks[this.#headIndex];
			const overflow = this.#tailBytes - this.#maxTailBytes;

			if (!first) {
				break;
			}

			const firstAvailableBytes = first.byteLength - this.#headOffset;

			if (firstAvailableBytes <= overflow) {
				this.#headIndex += 1;
				this.#headOffset = 0;
				this.#tailBytes -= firstAvailableBytes;
				continue;
			}

			this.#headOffset += overflow;
			this.#tailBytes -= overflow;
		}

		this.#compactRetainedChunks();
	}

	toSnapshot(): BoundedOutputSnapshot {
		const tail = decodeUtf8Tail(Buffer.concat(this.#retainedChunks(), this.#tailBytes), this.#maxTailBytes);

		return {
			bytes: this.#bytes,
			tail: tail.text,
		};
	}

	#retainedChunks(): Buffer[] {
		if (this.#tailBytes === 0 || this.#headIndex >= this.#chunks.length) {
			return [];
		}

		const chunks = this.#chunks.slice(this.#headIndex);
		if (this.#headOffset > 0 && chunks[0]) {
			chunks[0] = chunks[0].subarray(this.#headOffset);
		}

		return chunks;
	}

	#compactRetainedChunks(): void {
		if (this.#headIndex === 0) {
			return;
		}

		if (this.#headIndex < 64 && this.#headIndex * 2 < this.#chunks.length) {
			return;
		}

		this.#chunks = this.#chunks.slice(this.#headIndex);
		this.#headIndex = 0;
	}
}
