import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRunReceipt } from '../../dist/core/run-receipt.js';
import { REDACTED_SECRET_MARKER, redactSecretLikeText, textContainsSecretLike } from '../../dist/core/secret-redaction.js';

function receiptFor(argv, overrides = {}) {
	return createRunReceipt({
		correlationId: 'fake-redaction-fixture', intent: 'check', status: 'passed', timedOut: false,
		startedAt: new Date('2026-01-01T00:00:00Z'), finishedAt: new Date('2026-01-01T00:00:01Z'),
		projectRoot: process.cwd(), cwd: process.cwd(), lifecycle: 'oneshot', runPolicy: 'agent_allowed',
		mode: 'argv', argv, envPolicy: 'minimal', envAllowlist: [], timeoutSeconds: 10,
		killAfterSeconds: 1, maxOutputBytes: 1024, successExitCodes: [0], exitCode: 0,
		signal: null, error: null, killMethod: null, stdout: '', stderr: '',
		writeDrift: { status: 'unavailable', declared_paths: [], observed_paths: [],
			undeclared_paths: [], has_undeclared_changes: false, reason: 'test_fixture' },
		...overrides,
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

test('shared redaction hides quoted and prefixed credential keys in every receipt field', (t) => {
	const cases = [
		['DATABASE_PASSWORD=', 'FAKE_prefix_password_01', ''],
		['CLOUDFLARE_API_TOKEN=', 'FAKE_prefix_api_token_02', ''],
		['MY_PRIVATE_KEY=', 'FAKE_prefix_private_key_03', ''],
		['MY_AUTH_TOKEN=', 'FAKE_prefix_auth_token_04', ''],
		['{"password":"', 'FAKE_json_password_05', '"}'],
		['{"api_key":"', 'FAKE_json_api_key_06', '"}'],
		['{"DATABASE_PASSWORD":"', 'FAKE_json_prefixed_password_07', '"}'],
		["'auth-token': '", 'FAKE_yaml_auth_token_08', "'"],
	];
	let leakedValues = 0;
	for (const [prefix, secret, suffix] of cases) {
		const input = prefix + secret + suffix;
		const receipt = receiptFor(['tool', input], { stdout: input, stderr: input, error: input });
		const shellReceipt = receiptFor(undefined, { mode: 'shell', cmd: input });
		const fields = [receipt.argv[1], receipt.stdout.tail, receipt.stderr.tail, receipt.error, shellReceipt.cmd];
		leakedValues += fields.filter(value => value.includes(secret)).length;
	}
	t.diagnostic(JSON.stringify({ assignments: cases.length, receiptFields: 5, leakedValues }));
	assert.equal(leakedValues, 0);
	for (const [prefix, secret, suffix] of cases) {
		const input = prefix + secret + suffix;
		assert.equal(textContainsSecretLike(input), true);
		assert.deepEqual(redactSecretLikeText(input), {
			text: prefix + REDACTED_SECRET_MARKER + suffix, redacted: true,
			redactionCount: 1, redactionKinds: ['secret_key_value'],
		});
	}
});

test('shared redaction preserves ordinary keys and keeps masked JSON valid', () => {
	const ordinary = JSON.stringify({ password_file: 'safe-file.txt', passwordLength: 12,
		DATABASE_PASSWORD_HINT: 'FAKE_hint_value', CLOUD_API_TOKEN_COUNT: 100, filename: 'normal.txt' });
	assert.equal(redactSecretLikeText(ordinary).text, ordinary);
	assert.equal(textContainsSecretLike(ordinary), false);
	const input = JSON.stringify({ DATABASE_PASSWORD: 'FAKE_json_password_09', filename: 'normal.txt' });
	assert.deepEqual(JSON.parse(redactSecretLikeText(input).text), {
		DATABASE_PASSWORD: REDACTED_SECRET_MARKER, filename: 'normal.txt',
	});
});

test('shared redaction removes complete quoted secrets from every receipt field', (t) => {
	const values = ['FAKEprefix!remaining-sensitive', '가짜 비밀번호!', 'x!',
		'FAKE_escaped_"quote"_remaining', 'FAKE_backslash_\\remaining', 'FAKE_line\nremaining'];
	let exposedFields = 0;
	for (const secret of values) {
		const input = JSON.stringify({ password: secret, filename: 'ordinary.txt' });
		const receipt = receiptFor(['tool', input], { stdout: input, stderr: input, error: input });
		const shellReceipt = receiptFor(undefined, { mode: 'shell', cmd: input });
		for (const output of [receipt.argv[1], receipt.stdout.tail, receipt.stderr.tail, receipt.error, shellReceipt.cmd]) {
			const parsed = JSON.parse(output);
			if (parsed.password !== REDACTED_SECRET_MARKER) exposedFields++;
			assert.equal(parsed.filename, 'ordinary.txt');
		}
	}
	t.diagnostic(JSON.stringify({ quotedValues: values.length, receiptFields: 5, exposedFields }));
	assert.equal(exposedFields, 0);
});

test('shared redaction handles escaped single quotes and preserves empty or already masked values', () => {
	for (const value of ['FAKEprefix!remaining', '가짜 비밀번호!', 'x!', "FAKE_escaped_\\'quote_remaining"]) {
		const input = `DATABASE_PASSWORD='${value}' next=ordinary`;
		assert.equal(textContainsSecretLike(input), true);
		assert.deepEqual(redactSecretLikeText(input), {
			text: `DATABASE_PASSWORD='${REDACTED_SECRET_MARKER}' next=ordinary`,
			redacted: true, redactionCount: 1, redactionKinds: ['secret_key_value'],
		});
	}
	for (const value of ['', REDACTED_SECRET_MARKER]) {
		for (const quote of ['"', "'"]) {
			const input = `password=${quote}${value}${quote}`;
			assert.equal(textContainsSecretLike(input), false);
			assert.deepEqual(redactSecretLikeText(input), {
				text: input, redacted: false, redactionCount: 0, redactionKinds: [],
			});
		}
	}
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
