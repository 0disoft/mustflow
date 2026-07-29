import assert from 'node:assert/strict';
import test from 'node:test';

import {
	buildNativeCrashExternalValidationReport,
	classifyFormatRecognitionProbe,
	classifySemanticStructureProbe,
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

test('independent semantic parser facts can complete a fixture lane', () => {
	const expected = {
		format: 'elf-core',
		class_bits: 64,
		note_types: [1, 1397311305, 1179208773],
	};
	const lane = classifySemanticStructureProbe({
		fixture: 'elf64-core',
		tool: 'rust-minidump+goblin',
		toolPath: '/tools/native-crash-fixture-parser',
		expected,
		observed: JSON.stringify({ note_types: expected.note_types, class_bits: 64, format: 'elf-core' }),
		exitCode: 0,
	});
	assert.equal(lane.status, 'passed');
	assert.equal(lane.reason, 'independent_semantic_parser_match');
});

test('complete semantic coverage promotes supporting format-only lanes to an overall pass', () => {
	const semanticLane = classifySemanticStructureProbe({
		fixture: 'elf64-core',
		tool: 'rust-minidump+goblin',
		toolPath: 'tools/native-crash-fixture-parser',
		expected: { format: 'elf-core', class_bits: 64 },
		observed: '{"class_bits":64,"format":"elf-core"}',
		exitCode: 0,
	});
	const report = buildNativeCrashExternalValidationReport([
		classifyFormatRecognitionProbe(validProbe),
		semanticLane,
	]);
	assert.equal(report.ok, true);
	assert.equal(report.complete, true);
	assert.equal(report.overall_status, 'passed');
	assert.equal(nativeCrashExternalValidationExitCode(report), 0);
});

test('malformed or contradictory semantic parser output fails closed', () => {
	for (const observed of ['not json', '{"format":"elf-core","class_bits":32}']) {
		const lane = classifySemanticStructureProbe({
			fixture: 'elf64-core',
			tool: 'rust-minidump+goblin',
			toolPath: '/tools/native-crash-fixture-parser',
			expected: { format: 'elf-core', class_bits: 64 },
			observed,
			exitCode: 0,
		});
		assert.equal(lane.status, 'failed');
	}
});
