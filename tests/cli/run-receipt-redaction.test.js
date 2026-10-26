import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRunReceipt } from '../../dist/core/run-receipt.js';
import { REDACTED_SECRET_MARKER } from '../../dist/core/secret-redaction.js';

function receiptFor(argv) {
	return createRunReceipt({
		correlationId: 'fake-redaction-fixture', intent: 'check', status: 'passed', timedOut: false,
		startedAt: new Date('2026-01-01T00:00:00Z'), finishedAt: new Date('2026-01-01T00:00:01Z'),
		projectRoot: process.cwd(), cwd: process.cwd(), lifecycle: 'oneshot', runPolicy: 'agent_allowed',
		mode: 'argv', argv, envPolicy: 'minimal', envAllowlist: [], timeoutSeconds: 10,
		killAfterSeconds: 1, maxOutputBytes: 1024, successExitCodes: [0], exitCode: 0,
		signal: null, error: null, killMethod: null, stdout: '', stderr: '',
		writeDrift: { status: 'unavailable', declared_paths: [], observed_paths: [],
			undeclared_paths: [], has_undeclared_changes: false, reason: 'test_fixture' },
	});
}

test('receipt redaction uses credential options to hide split, short and Unicode argument values', (t) => {
	const cases = [
		['--password', 'FAKE_split_password_1'], ['--api-key', 'FAKE_split_api_key_2'],
		['--token', 'FAKE_split_token_3'], ['--secret', '가짜!'],
		['--password=', 'x!'], ['--api-key=', '가짜키!'],
		['--token=', 'FAKE_inline_token_7'], ['--private-key=', '가짜\n키자료'],
	];
	const argv = Object.freeze(['tool', ...cases.flatMap(([option, value]) =>
		option.endsWith('=') ? [option + value] : [option, value])]);
	const original = [...argv];
	const receipt = receiptFor(argv);
	const leakedArguments = cases.filter(([, value]) => receipt.argv.some((arg) => arg.includes(value))).length;
	t.diagnostic(JSON.stringify({ leakedArguments, redactionCount: receipt.redaction.redaction_count }));
	assert.equal(leakedArguments, 0);
	assert.equal(receipt.redaction.redaction_count, cases.length);
	assert.equal(receipt.redaction.fields.length, cases.length);
	assert.deepEqual(receipt.redaction.redaction_kinds, ['secret_key_value']);
	assert.deepEqual(argv, original);
	assert.equal(receipt.argv.length, argv.length);
});

test('receipt credential options preserve flag spelling and report the redacted argument index', () => {
	for (const flag of ['--api_key', '--API-KEY', '--apiToken', '--access-token', '--auth_token',
		'--secret', '--password', '--passwd', '--private-key', '--token']) {
		for (const value of ['x', '', '--starts-with-dashes', 'FAKE value !\n한글']) {
			for (const inline of [false, true]) {
				const input = inline ? ['tool', `${flag}=${value}`] : ['tool', flag, value];
				const expected = inline ? ['tool', `${flag}=${REDACTED_SECRET_MARKER}`] : ['tool', flag, REDACTED_SECRET_MARKER];
				const receipt = receiptFor(input);
				assert.deepEqual(receipt.argv, expected);
				assert.deepEqual(receipt.redaction.fields, [`argv.${inline ? 1 : 2}`]);
				assert.equal(receipt.redaction.redaction_count, 1);
			}
		}
	}
});

test('receipt redaction protects values after consecutive credential flags', () => {
	const receipt = receiptFor(['tool', '--password', '--token', 'FAKE_consecutive_option_value']);
	assert.deepEqual(receipt.argv, ['tool', '--password', REDACTED_SECRET_MARKER, REDACTED_SECRET_MARKER]);
	assert.deepEqual(receipt.redaction.fields, ['argv.2', 'argv.3']);
	assert.equal(receipt.redaction.redaction_count, 2);
	assert.deepEqual(receiptFor(['tool', '--password', '--token=FAKE_inline_value']).argv,
		['tool', '--password', REDACTED_SECRET_MARKER]);
});

test('receipt redaction preserves ordinary arguments, similar option names and a missing credential value', () => {
	const argv = ['tool', '--input', 'normal.txt', '--password-file', 'safe.txt', '--token-count', '3', '--password'];
	const receipt = receiptFor(argv);
	assert.deepEqual(receipt.argv, argv);
	assert.equal(receipt.redaction.redacted, false);
	assert.deepEqual(receipt.redaction.fields, []);
	assert.equal(receiptFor(undefined).argv, undefined);
	assert.deepEqual(receiptFor([]).argv, []);
});
