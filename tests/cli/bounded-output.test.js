import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { BoundedOutputBuffer, decodeUtf8Tail } from '../../dist/core/bounded-output.js';

test('bounded output owns its retained bytes when the caller reuses an input buffer', () => {
	const output = new BoundedOutputBuffer(4);
	const input = Buffer.from('original');
	output.append(input);
	assert.equal(output.toSnapshot().tail, 'inal');
	input.fill(120);
	assert.deepEqual(output.toSnapshot(), { bytes: 8, tail: 'inal' });
});

test('bounded output does not retain a large input backing store for a small tail', () => {
	const moduleUrl = new URL('../../dist/core/bounded-output.js', import.meta.url).href;
	const source = `
import { BoundedOutputBuffer } from ${JSON.stringify(moduleUrl)};
const output = new BoundedOutputBuffer(65536);
global.gc();
const baseline = process.memoryUsage().arrayBuffers;
function appendLargeChunk() { output.append(Buffer.alloc(32 * 1024 * 1024, 97)); }
appendLargeChunk();
global.gc();
const retained = process.memoryUsage().arrayBuffers - baseline;
const snapshot = output.toSnapshot();
console.log(JSON.stringify({ retained, bytes: snapshot.bytes, tailBytes: Buffer.byteLength(snapshot.tail) }));
`;
	const result = spawnSync(process.execPath, ['--expose-gc', '--input-type=module', '-e', source], {
		encoding: 'utf8', timeout: 15_000, windowsHide: true,
	});
	assert.equal(result.status, 0, result.stderr || result.error?.message);
	const sample = JSON.parse(result.stdout);
	assert.equal(sample.bytes, 32 * 1024 * 1024);
	assert.equal(sample.tailBytes, 65536);
	assert.ok(sample.retained <= 2 * 65536, `retained ${sample.retained} bytes for a 65536-byte tail`);
});

test('bounded output matches a byte-tail reference through growth, wrapping and UTF-8 splits', () => {
	let seed = 0x4d46544c;
	const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed; };
	const text = Buffer.from('한글🙂abc'.repeat(200));
	for (const limit of [0, 1, 2, 5, 127, 65536]) {
		const output = new BoundedOutputBuffer(limit);
		let reference = Buffer.alloc(0);
		let totalBytes = 0;
		assert.deepEqual(output.toSnapshot(), { bytes: 0, tail: '' });
		for (let index = 0; index < 300; index++) {
			const start = random() % text.byteLength;
			const chunk = text.subarray(start, start + random() % 1024);
			output.append(chunk);
			totalBytes += chunk.byteLength;
			reference = Buffer.concat([reference, chunk]);
			if (reference.byteLength > limit) reference = reference.subarray(reference.byteLength - limit);
			assert.deepEqual(output.toSnapshot(), { bytes: totalBytes, tail: decodeUtf8Tail(reference, limit).text });
		}
	}
});

test('bounded output handles string chunks, zero capacity and a large final replacement', () => {
	for (const limit of [0, 5, 128]) {
		const output = new BoundedOutputBuffer(limit);
		const chunks = ['한', '', 'abcd', '🙂', 'z'.repeat(300)];
		for (const chunk of chunks) output.append(chunk);
		const combined = Buffer.from(chunks.join(''));
		assert.deepEqual(output.toSnapshot(), { bytes: combined.byteLength, tail: decodeUtf8Tail(combined, limit).text });
	}
});
