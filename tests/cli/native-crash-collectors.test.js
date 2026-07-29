import assert from 'node:assert/strict';
import test from 'node:test';

import { collectNativeCrashEvidence } from '../../dist/core/native-crash-collectors.js';
import { validateNativeCrashEvidence } from '../../dist/core/native-crash-evidence.js';

function options(adapter, name) {
	return { adapter, originalName: name, capturedAt: '2026-07-29T00:00:00.000Z' };
}

function minidumpFixture() {
	const bytes = Buffer.alloc(256);
	bytes.write('MDMP', 0, 'ascii');
	bytes.writeUInt32LE(3, 8);
	bytes.writeUInt32LE(32, 12);
	// SystemInfo stream.
	bytes.writeUInt32LE(7, 32); bytes.writeUInt32LE(2, 36); bytes.writeUInt32LE(68, 40);
	bytes.writeUInt16LE(9, 68);
	// Exception stream with thread 7 and access violation at 0x1234.
	bytes.writeUInt32LE(6, 44); bytes.writeUInt32LE(56, 48); bytes.writeUInt32LE(72, 52);
	bytes.writeUInt32LE(7, 72); bytes.writeUInt32LE(0xc0000005, 80); bytes.writeBigUInt64LE(0x1234n, 96);
	bytes.writeUInt32LE(2, 104); bytes.writeBigUInt64LE(0n, 112); bytes.writeBigUInt64LE(0xdeadbeefn, 120);
	// Thread list.
	bytes.writeUInt32LE(3, 56); bytes.writeUInt32LE(52, 60); bytes.writeUInt32LE(128, 64);
	bytes.writeUInt32LE(1, 128); bytes.writeUInt32LE(7, 132);
	return bytes;
}

function elfCoreFixture() {
	const bytes = Buffer.alloc(128);
	bytes.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1], 0);
	bytes.writeUInt16LE(4, 16); // ET_CORE
	bytes.writeUInt16LE(62, 18); // x86_64
	bytes.writeBigUInt64LE(64n, 32);
	bytes.writeUInt16LE(56, 54);
	bytes.writeUInt16LE(1, 56);
	bytes.writeUInt32LE(1, 64); // PT_LOAD
	bytes.writeUInt32LE(5, 68); // executable, readable
	bytes.writeBigUInt64LE(0x400000n, 80);
	bytes.writeBigUInt64LE(0x1000n, 104);
	return bytes;
}

test('collects bounded sanitizer evidence without inventing symbol or binary identity', () => {
	const artifact = new TextEncoder().encode('==1==ERROR: AddressSanitizer: heap-use-after-free on address 0x1234\nREAD of size 4\n    #0 0x1234 in boom file.cc:4\nSUMMARY: AddressSanitizer: heap-use-after-free in boom\n');
	const result = collectNativeCrashEvidence(artifact, options('sanitizer', 'asan.log'));
	const validation = validateNativeCrashEvidence(result.evidence);
	assert.equal(validation.ok, true);
	assert.equal(validation.readiness, 'incomplete');
	assert.equal(result.evidence.source.kind, 'sanitizer_report');
	assert.equal(result.evidence.binary.identity.scheme, 'unknown');
	assert.ok(result.warnings.length > 0);
});

test('recognizes Windows minidump structure but keeps unavailable unwind incomplete', () => {
	const result = collectNativeCrashEvidence(minidumpFixture(), options('windows-minidump', 'crash.dmp'));
	const validation = validateNativeCrashEvidence(result.evidence);
	assert.equal(validation.ok, true);
	assert.equal(validation.readiness, 'incomplete');
	assert.equal(result.evidence.target.architecture, 'x86_64');
	assert.equal(result.evidence.target.crashed_thread_id, '7');
	assert.equal(result.evidence.exception.instruction_address, '0x1234');
	assert.equal(result.evidence.exception.fault_address, '0xdeadbeef');
});

test('records a supplied executable as an unmatched candidate without replacing dump identity', () => {
	const result = collectNativeCrashEvidence(minidumpFixture(), {
		...options('windows-minidump', 'crash.dmp'), binaryName: 'app.exe', binaryBytes: new TextEncoder().encode('candidate'),
	});
	const validation = validateNativeCrashEvidence(result.evidence);
	assert.equal(validation.ok, true);
	assert.equal(result.evidence.binary.identity.scheme, 'unknown');
	assert.equal(result.evidence.candidate_binary.name, 'app.exe');
	assert.equal(result.evidence.candidate_binary.binding_status, 'candidate_only');
	assert.ok(validation.issues.some((issue) => issue.code === 'candidate_binary_not_matched'));
});

test('recognizes ELF core architecture and executable load range', () => {
	const result = collectNativeCrashEvidence(elfCoreFixture(), options('linux-core', 'core'));
	const validation = validateNativeCrashEvidence(result.evidence);
	assert.equal(validation.ok, true);
	assert.equal(validation.readiness, 'incomplete');
	assert.equal(result.evidence.target.architecture, 'x86_64');
	assert.equal(result.evidence.modules[0].base_address, '0x400000');
	assert.equal(result.evidence.modules[0].end_address, '0x401000');
});

test('rejects empty, mislabeled, and truncated crash artifacts', () => {
	assert.throws(() => collectNativeCrashEvidence(new Uint8Array(), options('sanitizer', 'empty')));
	assert.throws(() => collectNativeCrashEvidence(new TextEncoder().encode('plain log'), options('sanitizer', 'plain.log')));
	assert.throws(() => collectNativeCrashEvidence(Buffer.from('MDMP'), options('windows-minidump', 'short.dmp')));
	assert.throws(() => collectNativeCrashEvidence(Buffer.from([0x7f, 0x45, 0x4c, 0x46]), options('linux-core', 'short.core')));
});

test('rejects over-limit minidump counts instead of silently truncating evidence', () => {
	const excessiveStreams = Buffer.alloc(32);
	excessiveStreams.write('MDMP', 0, 'ascii');
	excessiveStreams.writeUInt32LE(1025, 8);
	excessiveStreams.writeUInt32LE(32, 12);
	assert.throws(() => collectNativeCrashEvidence(excessiveStreams, options('windows-minidump', 'large.dmp')), /stream count exceeds/u);
});
