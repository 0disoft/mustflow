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
	#buffer = Buffer.alloc(0);
	#writeOffset = 0;
	#tailBytes = 0;
	#bytes = 0;

	constructor(maxTailBytes: number) {
		this.#maxTailBytes = Math.max(0, Math.trunc(maxTailBytes));
	}

	append(chunk: string | Buffer): void {
		const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk, 'utf8');

		this.#bytes += buffer.byteLength;

		if (this.#maxTailBytes === 0 || buffer.byteLength === 0) {
			return;
		}

		const start = Math.max(0, buffer.byteLength - this.#maxTailBytes);
		const length = buffer.byteLength - start;
		this.#ensureCapacity(Math.min(this.#maxTailBytes, this.#tailBytes + length));
		const firstLength = Math.min(length, this.#buffer.byteLength - this.#writeOffset);
		buffer.copy(this.#buffer, this.#writeOffset, start, start + firstLength);
		buffer.copy(this.#buffer, 0, start + firstLength);
		this.#writeOffset = (this.#writeOffset + length) % this.#buffer.byteLength;
		this.#tailBytes = Math.min(this.#buffer.byteLength, this.#tailBytes + length);
	}

	toSnapshot(): BoundedOutputSnapshot {
		const bytes = Buffer.allocUnsafeSlow(this.#tailBytes);
		this.#copyTail(bytes);
		const tail = decodeUtf8Tail(bytes, this.#maxTailBytes);

		return {
			bytes: this.#bytes,
			tail: tail.text,
		};
	}

	#copyTail(target: Buffer): void {
		if (this.#tailBytes === 0) return;
		const start = (this.#writeOffset - this.#tailBytes + this.#buffer.byteLength) % this.#buffer.byteLength;
		const firstLength = Math.min(this.#tailBytes, this.#buffer.byteLength - start);
		this.#buffer.copy(target, 0, start, start + firstLength);
		this.#buffer.copy(target, firstLength, 0, this.#tailBytes - firstLength);
	}

	#ensureCapacity(requiredBytes: number): void {
		if (requiredBytes <= this.#buffer.byteLength) return;
		const capacity = Math.min(this.#maxTailBytes, Math.max(requiredBytes, this.#buffer.byteLength * 2));
		const next = Buffer.allocUnsafeSlow(capacity);
		this.#copyTail(next);
		this.#buffer = next;
		this.#writeOffset = this.#tailBytes;
	}
}
