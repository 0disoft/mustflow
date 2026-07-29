import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildNativeCrashExternalValidationReport,
	classifyFormatRecognitionProbe,
	nativeCrashExternalValidationExitCode,
	skippedExternalValidationLane,
} from '../../dist/core/native-crash-fixture-external-validation.js';

const validProbe = {
	fixture: 'elf64-core',
	tool: 'file',
	toolPath: '/usr/bin/file',
	expected: 'ELF 64-bit LSB core file, x86-64, version 1 (SYSV), SVR4-style',
	observed: 'ELF 64-bit LSB core file, x86-64, version 1 (SYSV), SVR4-style\n',
	exitCode: 0,
};

test('format recognition stays partial because file does not validate semantic payloads', () => {
	assert.deepEqual(classifyFormatRecognitionProbe(validProbe), {
		fixture: 'elf64-core',
		capability: 'format-recognition',
		tool: 'file',
		tool_path: '/usr/bin/file',
		status: 'partial',
		reason: 'format_recognition_only',
		expected: validProbe.expected,
		observed: validProbe.expected,
	});
});

test('external parser output drift is a failure rather than a partial pass', () => {
	const lane = classifyFormatRecognitionProbe({ ...validProbe, observed: 'ELF data' });
	assert.equal(lane.status, 'failed');
	assert.equal(lane.reason, 'format_output_mismatch');
	const report = buildNativeCrashExternalValidationReport([lane]);
	assert.equal(report.ok, false);
	assert.equal(report.complete, false);
	assert.equal(report.overall_status, 'failed');
	assert.equal(nativeCrashExternalValidationExitCode(report), 1);
});

test('missing semantic parsers produce a successful but incomplete partial report', () => {
	const report = buildNativeCrashExternalValidationReport([
		classifyFormatRecognitionProbe(validProbe),
		skippedExternalValidationLane('elf64-core', 'semantic-structure', 'semantic_parser_not_installed'),
	]);
	assert.equal(report.ok, true);
	assert.equal(report.complete, false);
	assert.equal(report.overall_status, 'partial');
	assert.equal(nativeCrashExternalValidationExitCode(report), 2);
});

test('no installed external parser reports skipped with exit code two', () => {
	const report = buildNativeCrashExternalValidationReport([
		skippedExternalValidationLane('windows-minidump', 'format-recognition', 'file_not_installed'),
	]);
	assert.equal(report.ok, true);
	assert.equal(report.complete, false);
	assert.equal(report.overall_status, 'skipped');
	assert.equal(nativeCrashExternalValidationExitCode(report), 2);
});
