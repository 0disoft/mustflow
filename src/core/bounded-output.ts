export interface BoundedOutputSnapshot {
	readonly bytes: number;
	readonly tail: string;
}

export class BoundedOutputBuffer {
	readonly #maxTailBytes: number;
	#chunks: Buffer[] = [];
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

		while (this.#tailBytes > this.#maxTailBytes && this.#chunks.length > 0) {
			const first = this.#chunks[0];
			const overflow = this.#tailBytes - this.#maxTailBytes;

			if (!first) {
				break;
			}

			if (first.byteLength <= overflow) {
				this.#chunks.shift();
				this.#tailBytes -= first.byteLength;
				continue;
			}

			this.#chunks[0] = first.subarray(overflow);
			this.#tailBytes -= overflow;
		}
	}

	toSnapshot(): BoundedOutputSnapshot {
		return {
			bytes: this.#bytes,
			tail: Buffer.concat(this.#chunks, this.#tailBytes).toString('utf8'),
		};
	}
}
