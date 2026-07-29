import assert from 'node:assert/strict';
import test from 'node:test';

import { collectNativeCrashEvidence } from '../../dist/core/native-crash-collectors.js';
import { validateNativeCrashEvidence } from '../../dist/core/native-crash-evidence.js';
import {
	buildRealisticElf32CoreFixture,
	buildRealisticElf64CoreFixture,
	buildRealisticMinidumpFixture,
	SANITIZER_CORPUS,
	sha256Hex,
} from './helpers/native-crash-fixtures.js';

function options(adapter, name) {
	return { adapter, originalName: name, capturedAt: '2026-07-29T00:00:00.000Z' };
}

test('realistic fixture builders are byte-for-byte deterministic', () => {
	const fixtures = [
		[buildRealisticMinidumpFixture(), 632, '3e18c161b3148d2bd39f8b142cccd0fb98b1f5d4849388062159df177561d47e'],
		[buildRealisticElf64CoreFixture(), 576, '379597531d17e54c0ffcaa562321deabd942c0f6725a447ee6c31ffd17a20639'],
		[buildRealisticElf32CoreFixture(), 84, 'a7ea27a0881273f4beaba7b04be73344960fa1e65a89c7f15db68e270e3b340f'],
	];
	for (const [bytes, size, hash] of fixtures) {
		assert.equal(bytes.length, size);
		assert.equal(sha256Hex(bytes), hash);
	}
});

test('collects a realistic Windows minidump while redacting paths and preserving identity', () => {
	const result = collectNativeCrashEvidence(buildRealisticMinidumpFixture(), options('windows-minidump', 'crash.dmp'));
	const validation = validateNativeCrashEvidence(result.evidence);
	assert.equal(validation.ok, true);
	assert.equal(validation.readiness, 'incomplete');
	assert.equal(result.evidence.target.architecture, 'x86_64');
	assert.equal(result.evidence.target.crashed_thread_id, '7');
	assert.deepEqual(result.evidence.threads.map((thread) => thread.id), ['7', '11']);
	assert.equal(result.evidence.exception.code, '0xc0000005');
	assert.equal(result.evidence.exception.instruction_address, '0x140001234');
	assert.equal(result.evidence.exception.fault_address, '0xdeadbeef');
	assert.equal(result.evidence.modules[0].name, 'mustflow-fixture.exe');
	assert.equal(result.evidence.modules[0].path, null);
	assert.equal(result.evidence.modules[0].base_address, '0x140000000');
	assert.equal(result.evidence.modules[0].end_address, '0x140010000');
	assert.deepEqual(result.evidence.modules[0].identity, {
		scheme: 'pe_guid_age', value: '11223344-5566-7788-99AA-BBCCDDEEFF00:3', verified: true,
	});
	assert.equal(result.evidence.redaction.applied, true);
	assert.deepEqual(result.evidence.redaction.fields, ['modules[0].path']);
	assert.ok(result.warnings.some((warning) => warning.includes('Absolute module paths')));
	assert.doesNotMatch(JSON.stringify(result.evidence), /C:\\fixture/u);
});

test('records a supplied executable as an unmatched candidate without replacing dump identity', () => {
	const result = collectNativeCrashEvidence(buildRealisticMinidumpFixture(), {
		...options('windows-minidump', 'crash.dmp'), binaryName: 'app.exe', binaryBytes: new TextEncoder().encode('candidate'),
	});
	const validation = validateNativeCrashEvidence(result.evidence);
	assert.equal(validation.ok, true);
	assert.equal(result.evidence.binary.identity.scheme, 'pe_guid_age');
	assert.equal(result.evidence.candidate_binary.name, 'app.exe');
	assert.equal(result.evidence.candidate_binary.binding_status, 'candidate_only');
	assert.ok(validation.issues.some((issue) => issue.code === 'candidate_binary_not_matched'));
});

test('collects realistic ELF64 notes without copying memory and supports exact ELF32 headers', () => {
	const elf64 = collectNativeCrashEvidence(buildRealisticElf64CoreFixture(), options('linux-core', 'core.x64'));
	const elf32 = collectNativeCrashEvidence(buildRealisticElf32CoreFixture(), options('linux-core', 'core.x86'));
	assert.equal(validateNativeCrashEvidence(elf64.evidence).ok, true);
	assert.equal(validateNativeCrashEvidence(elf32.evidence).ok, true);
	assert.equal(elf64.evidence.target.architecture, 'x86_64');
	assert.equal(elf64.evidence.modules[0].base_address, '0x400000');
	assert.equal(elf64.evidence.modules[0].end_address, '0x401000');
	assert.equal(elf32.evidence.target.architecture, 'x86');
	assert.equal(elf32.evidence.modules[0].base_address, '0x8048000');
	assert.equal(elf32.evidence.modules[0].end_address, '0x8049000');
});

test('normalizes realistic sanitizer dialects and removes absolute source paths', () => {
	const expected = {
		asan: ['address', 'heap-use-after-free'],
		tsan: ['thread', 'data'],
		msan: ['memory', 'use-of-uninitialized-value'],
		ubsan: ['undefined_behavior', 'runtime-error'],
		lsan: ['leak', 'detected'],
	};
	for (const [name, source] of Object.entries(SANITIZER_CORPUS)) {
		const result = collectNativeCrashEvidence(new TextEncoder().encode(source), options('sanitizer', `${name}.log`));
		const validation = validateNativeCrashEvidence(result.evidence);
		assert.equal(validation.ok, true, `${name}: ${JSON.stringify(validation.issues)}`);
		assert.equal(result.evidence.sanitizer.kind, expected[name][0]);
		assert.equal(result.evidence.sanitizer.error_class, expected[name][1]);
		assert.doesNotMatch(JSON.stringify(result.evidence), /(?:C:\\Users\\fixture|\/fixture\/project)/u);
		if (name !== 'lsan') assert.equal(result.evidence.redaction.applied, true);
	}
});

test('bounds sanitizer path redaction for adversarial separator-heavy input', { timeout: 2_000 }, () => {
	const adversarialPath = `/${'!/'.repeat(25_000)}!:not-a-line`;
	const source = [
		'ERROR: AddressSanitizer: heap-use-after-free',
		`SUMMARY: AddressSanitizer: ${adversarialPath}`,
		'',
	].join('\n');
	const startedAt = process.hrtime.bigint();
	const result = collectNativeCrashEvidence(new TextEncoder().encode(source), options('sanitizer', 'separator-heavy.log'));
	const elapsedMilliseconds = Number(process.hrtime.bigint() - startedAt) / 1_000_000;

	assert.equal(result.evidence.sanitizer.summary, adversarialPath);
	assert.equal(result.evidence.redaction.applied, false);
	assert.ok(elapsedMilliseconds < 1_000, `separator-heavy sanitizer redaction took ${elapsedMilliseconds.toFixed(2)}ms`);
});

test('bounds sanitizer frame materialization and reports truncation', () => {
	const frames = Array.from({ length: 2049 }, (_, index) => `    #${index} 0x${(0x500000 + index).toString(16)} in frame_${index}`).join('\n');
	const source = `WARNING: ThreadSanitizer: data race\n${frames}\nSUMMARY: ThreadSanitizer: data race\n`;
	const result = collectNativeCrashEvidence(new TextEncoder().encode(source), options('sanitizer', 'large-tsan.log'));
	assert.equal(result.evidence.threads[0].frames.length, 2048);
	assert.ok(result.warnings.some((warning) => warning.includes('truncated')));
});

test('rejects malformed structure, duplicate streams, odd UTF-16, and undersized ELF headers', () => {
	assert.throws(() => collectNativeCrashEvidence(new Uint8Array(), options('sanitizer', 'empty')));
	assert.throws(() => collectNativeCrashEvidence(new TextEncoder().encode('plain log'), options('sanitizer', 'plain.log')));
	assert.throws(() => collectNativeCrashEvidence(Buffer.from('MDMP'), options('windows-minidump', 'short.dmp')));
	assert.throws(() => collectNativeCrashEvidence(Buffer.from([0x7f, 0x45, 0x4c, 0x46]), options('linux-core', 'short.core')));

	const badVersion = buildRealisticMinidumpFixture();
	badVersion.writeUInt32LE(0, 4);
	assert.throws(() => collectNativeCrashEvidence(badVersion, options('windows-minidump', 'version.dmp')), /version signature/u);

	const duplicate = buildRealisticMinidumpFixture();
	duplicate.writeUInt32LE(7, 32 + 12);
	assert.throws(() => collectNativeCrashEvidence(duplicate, options('windows-minidump', 'duplicate.dmp')), /duplicate stream/u);

	const oddString = buildRealisticMinidumpFixture();
	oddString.writeUInt32LE(3, 516);
	assert.throws(() => collectNativeCrashEvidence(oddString, options('windows-minidump', 'odd-string.dmp')), /odd byte length/u);

	const undersized = buildRealisticElf64CoreFixture();
	undersized.writeUInt16LE(8, 54);
	assert.throws(() => collectNativeCrashEvidence(undersized, options('linux-core', 'small-phdr.core')), /smaller than/u);
});

test('rejects over-limit minidump counts instead of silently truncating evidence', () => {
	const excessiveStreams = Buffer.alloc(32);
	excessiveStreams.write('MDMP', 0, 'ascii');
	excessiveStreams.writeUInt32LE(0x0000a793, 4);
	excessiveStreams.writeUInt32LE(1025, 8);
	excessiveStreams.writeUInt32LE(32, 12);
	assert.throws(() => collectNativeCrashEvidence(excessiveStreams, options('windows-minidump', 'large.dmp')), /stream count exceeds/u);
});
