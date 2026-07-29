import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
	MAX_NATIVE_CRASH_EVIDENCE_BYTES,
	validateNativeCrashEvidence,
	validateNativeCrashEvidenceJson,
} from '../../dist/core/native-crash-evidence.js';
import { assertMatchesSchema, readJsonSchema, validateJsonSchema } from '../helpers/json-schema.js';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const schemaRoot = path.join(projectRoot, 'schemas');

function identity(value = 'ABCD1234EF5678901') {
	return { scheme: 'pe_guid_age', value, verified: true };
}

function symbols(value = 'ABCD1234EF5678901') {
	return {
		status: 'matched',
		expected_identity: identity(value),
		observed_identity: identity(value),
		symbol_file_sha256: `sha256:${'b'.repeat(64)}`,
		detail: null,
	};
}

function validEvidence() {
	return {
		schema_version: '1',
		kind: 'native_crash_evidence',
		captured_at: '2026-07-29T10:15:30.000Z',
		source: {
			kind: 'windows_minidump',
			artifact: {
				sha256: `sha256:${'a'.repeat(64)}`,
				size_bytes: 16384,
				original_name: 'game-crash.dmp',
			},
			tool: {
				name: 'DbgHelp',
				version: '10.0',
				command_fingerprint: null,
			},
		},
		target: {
			platform: 'windows',
			architecture: 'x86_64',
			process_id: 4242,
			crashed_thread_id: '17',
		},
		binary: {
			module_id: 'main',
			name: 'game.exe',
			path: 'bin/game.exe',
			identity: identity(),
		},
		symbols: symbols(),
		exception: {
			kind: 'exception',
			code: '0xc0000005',
			fault_address: '0x0000000000000010',
			instruction_address: '0x00007ff612341234',
			description: 'Access violation reading address 0x10',
		},
		registers: {
			status: 'available',
			values: {
				rip: '0x00007ff612341234',
				rsp: '0x000000aabbccddee',
				rcx: '0x0000000000000000',
			},
			unavailable_reason: null,
		},
		modules: [
			{
				id: 'main',
				name: 'game.exe',
				path: 'bin/game.exe',
				base_address: '0x00007ff612340000',
				end_address: '0x00007ff6127f0000',
				identity: identity(),
				symbols: symbols(),
			},
		],
		threads: [
			{
				id: '17',
				crashed: true,
				name: 'render',
				stack_status: 'available',
				frames: [
					{
						index: 0,
						instruction_address: '0x00007ff612341234',
						module_id: 'main',
						symbol: 'Renderer::Submit',
						source_file: 'src/render/renderer.cpp',
						source_line: 281,
						inline: false,
					},
				],
			},
		],
		sanitizer: null,
		redaction: {
			applied: true,
			fields: ['binary.path', 'modules[0].path'],
			raw_environment_included: false,
			raw_memory_included: false,
		},
	};
}

test('accepts analysis-ready native crash evidence and matches the packaged schema', () => {
	const evidence = validEvidence();
	const result = validateNativeCrashEvidence(evidence);

	assert.deepEqual(result, {
		schema_version: '1',
		ok: true,
		readiness: 'ready',
		issues: [],
	});
	assertMatchesSchema(schemaRoot, 'native-crash-evidence.schema.json', evidence);
});

test('keeps valid but incomplete captures distinct from rejected evidence', () => {
	const evidence = validEvidence();
	evidence.binary.identity = { scheme: 'unknown', value: null, verified: false };
	evidence.modules[0].identity = { scheme: 'unknown', value: null, verified: false };
	evidence.registers = { status: 'unavailable', values: {}, unavailable_reason: 'minidump omitted context' };
	evidence.threads[0].stack_status = 'partial';
	evidence.threads[0].frames = [];
	evidence.symbols.status = 'partial';
	evidence.modules[0].symbols.status = 'not_requested';

	const result = validateNativeCrashEvidence(evidence);
	assert.equal(result.ok, true);
	assert.equal(result.readiness, 'incomplete');
	assert.deepEqual(
		new Set(result.issues.map((issue) => issue.code)),
		new Set([
			'binary_identity_unverified',
			'module_identity_unverified',
			'register_state_incomplete',
			'crashed_stack_incomplete',
			'symbol_resolution_incomplete',
		]),
	);
});

test('rejects symbol identities and frame addresses that contradict captured modules', () => {
	const evidence = validEvidence();
	evidence.symbols.expected_identity = identity('OTHER1111');
	evidence.symbols.observed_identity = identity('OTHER1111');
	evidence.modules[0].symbols.expected_identity = identity('OTHER2222');
	evidence.modules[0].symbols.observed_identity = identity('OTHER2222');
	evidence.threads[0].frames[0].instruction_address = '0x00007ff700000000';

	const result = validateNativeCrashEvidence(evidence);
	const codes = new Set(result.issues.map((issue) => issue.code));

	assert.equal(result.readiness, 'rejected');
	assert.ok(codes.has('binary_symbol_identity_mismatch'));
	assert.ok(codes.has('module_symbol_identity_mismatch'));
	assert.ok(codes.has('frame_address_outside_module'));
});

test('rejects invalid module ranges and impossible capture dates', () => {
	const evidence = validEvidence();
	evidence.captured_at = '2026-99-99T10:15:30Z';
	evidence.modules[0].base_address = '0x2000';
	evidence.modules[0].end_address = '0x1000';

	const result = validateNativeCrashEvidence(evidence);
	const codes = new Set(result.issues.map((issue) => issue.code));

	assert.equal(result.readiness, 'rejected');
	assert.ok(codes.has('invalid_date_time'));
	assert.ok(codes.has('invalid_module_address_range'));
});

test('rejects symbol, binary module, crashed-thread, and raw-data contradictions', () => {
	const evidence = validEvidence();
	evidence.symbols.status = 'mismatched';
	evidence.symbols.observed_identity = identity('WRONG1111');
	evidence.modules[0].identity = identity('WRONG2222');
	evidence.target.crashed_thread_id = '99';
	evidence.redaction.raw_memory_included = true;

	const result = validateNativeCrashEvidence(evidence);
	const codes = new Set(result.issues.map((issue) => issue.code));

	assert.equal(result.ok, false);
	assert.equal(result.readiness, 'rejected');
	assert.ok(codes.has('symbol_identity_mismatch'));
	assert.ok(codes.has('binary_module_identity_mismatch'));
	assert.ok(codes.has('crashed_thread_id_mismatch'));
	assert.ok(codes.has('unsafe_raw_data_included'));
});

test('rejects schema drift, unknown fields, invalid frame references, and malformed JSON', () => {
	const evidence = validEvidence();
	evidence.schema_version = '2';
	evidence.untrusted_extension = true;
	evidence.threads[0].frames[0].module_id = 'missing';
	evidence.threads[0].frames[0].index = 3;

	const result = validateNativeCrashEvidence(evidence);
	const codes = new Set(result.issues.map((issue) => issue.code));
	assert.equal(result.readiness, 'rejected');
	assert.ok(codes.has('invalid_schema_version'));
	assert.ok(codes.has('unknown_field'));
	assert.ok(codes.has('unknown_frame_module'));
	assert.ok(codes.has('non_contiguous_frame_index'));

	const malformed = validateNativeCrashEvidenceJson('{');
	assert.equal(malformed.readiness, 'rejected');
	assert.equal(malformed.issues[0].code, 'invalid_json');
});

test('bounds evidence input size before JSON parsing', () => {
	const oversized = `{"padding":"${'x'.repeat(MAX_NATIVE_CRASH_EVIDENCE_BYTES)}"}`;
	const result = validateNativeCrashEvidenceJson(oversized);

	assert.equal(result.ok, false);
	assert.equal(result.readiness, 'rejected');
	assert.equal(result.issues[0].code, 'evidence_too_large');
});

test('schema itself rejects a raw-memory inclusion claim', () => {
	const schema = readJsonSchema(schemaRoot, 'native-crash-evidence.schema.json');
	const evidence = validEvidence();
	evidence.redaction.raw_memory_included = true;

	assert.notDeepEqual(validateJsonSchema(schema, evidence, schemaRoot), []);
});
