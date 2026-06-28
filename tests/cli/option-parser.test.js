import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
	formatCliOptionParseError,
	getParsedCliStringOption,
	hasCliOptionToken,
	hasParsedCliOption,
	parseNonNegativeIntegerCliOption,
	parseCliOptions,
	parsePositiveIntegerCliOption,
} from '../../dist/cli/lib/option-parser.js';

const commonOptions = [
	{ name: '--json', kind: 'boolean' },
	{ name: '--help', kind: 'boolean', aliases: ['-h'] },
	{ name: '--write', kind: 'string' },
];

test('parses boolean flags, aliases, and string values', () => {
	const parsed = parseCliOptions(['--json', '-h', '--write', 'report.json'], commonOptions);

	assert.equal(parsed.error, null);
	assert.equal(hasParsedCliOption(parsed, '--json'), true);
	assert.equal(hasParsedCliOption(parsed, '--help'), true);
	assert.equal(getParsedCliStringOption(parsed, '--write'), 'report.json');
});

test('parses inline string option values', () => {
	const parsed = parseCliOptions(['--write=report.json'], commonOptions);

	assert.equal(parsed.error, null);
	assert.equal(getParsedCliStringOption(parsed, '--write'), 'report.json');
});

test('detects help aliases without treating inline values as required', () => {
	assert.equal(hasCliOptionToken(['--help'], '--help', ['-h']), true);
	assert.equal(hasCliOptionToken(['-h'], '--help', ['-h']), true);
	assert.equal(hasCliOptionToken(['--help=true'], '--help', ['-h']), true);
	assert.equal(hasCliOptionToken(['--json'], '--help', ['-h']), false);
});

test('preserves unknown-option behavior for unsupported flags and positionals', () => {
	const unknownFlag = parseCliOptions(['--bad'], commonOptions);
	const positional = parseCliOptions(['extra'], commonOptions);
	const booleanWithValue = parseCliOptions(['--json=true'], commonOptions);

	assert.deepEqual(unknownFlag.error, { kind: 'unknown_option', option: '--bad' });
	assert.deepEqual(positional.error, { kind: 'unknown_option', option: 'extra' });
	assert.deepEqual(booleanWithValue.error, { kind: 'unknown_option', option: '--json=true' });
});

test('allows positionals when a command opts into positional arguments', () => {
	const parsed = parseCliOptions(['--json', 'src/index.ts'], commonOptions, { allowPositionals: true });

	assert.equal(parsed.error, null);
	assert.equal(hasParsedCliOption(parsed, '--json'), true);
	assert.deepEqual(parsed.positionals, ['src/index.ts']);
});

test('passes unknown options through for global option extraction', () => {
	const parsed = parseCliOptions(
		['check', '--json', '--lang=ko', '--bad'],
		[{ name: '--lang', kind: 'string' }],
		{ allowPositionals: true, allowUnknownOptions: true },
	);

	assert.equal(parsed.error, null);
	assert.deepEqual(parsed.positionals, ['check', '--json', '--bad']);
	assert.deepEqual(parsed.occurrences, [{ name: '--lang', value: 'ko', token: '--lang=ko' }]);
	assert.equal(getParsedCliStringOption(parsed, '--lang'), 'ko');
});

test('reports missing values with localized common option errors', () => {
	const parsed = parseCliOptions(['--write'], commonOptions);

	assert.deepEqual(parsed.error, { kind: 'missing_value', option: '--write' });
	assert.equal(formatCliOptionParseError(parsed.error, 'en'), 'Missing value for --write');
	assert.equal(formatCliOptionParseError(parsed.error, 'ko'), '--write 값이 없습니다');
});

test('parses positive integer options with script-pack localized errors', () => {
	assert.deepEqual(
		parsePositiveIntegerCliOption(null, '--max-files', 'secretRiskScan.error.invalidPositiveInteger', 'en'),
		{ value: null },
	);
	assert.deepEqual(
		parsePositiveIntegerCliOption('42', '--max-files', 'secretRiskScan.error.invalidPositiveInteger', 'en'),
		{ value: 42 },
	);
	assert.deepEqual(
		parsePositiveIntegerCliOption('0', '--max-files', 'secretRiskScan.error.invalidPositiveInteger', 'en'),
		{ value: null, error: '--max-files must be a positive safe integer: 0' },
	);
	assert.deepEqual(
		parsePositiveIntegerCliOption('01', '--max-files', 'secretRiskScan.error.invalidPositiveInteger', 'en'),
		{ value: null, error: '--max-files must be a positive safe integer: 01' },
	);
	assert.deepEqual(
		parsePositiveIntegerCliOption('9007199254740993', '--max-files', 'secretRiskScan.error.invalidPositiveInteger', 'en'),
		{ value: null, error: '--max-files must be a positive safe integer: 9007199254740993' },
	);
});

test('parses non-negative integer options with script-pack localized errors', () => {
	assert.deepEqual(
		parseNonNegativeIntegerCliOption(null, '--min', 'textBudget.error.invalidNumber', 'en'),
		{ value: null },
	);
	assert.deepEqual(
		parseNonNegativeIntegerCliOption('0', '--min', 'textBudget.error.invalidNumber', 'en'),
		{ value: 0 },
	);
	assert.deepEqual(
		parseNonNegativeIntegerCliOption('42', '--min', 'textBudget.error.invalidNumber', 'en'),
		{ value: 42 },
	);
	assert.deepEqual(
		parseNonNegativeIntegerCliOption('-1', '--min', 'textBudget.error.invalidNumber', 'en'),
		{ value: null, error: '--min must be a non-negative safe integer: -1' },
	);
	assert.deepEqual(
		parseNonNegativeIntegerCliOption('01', '--min', 'textBudget.error.invalidNumber', 'en'),
		{ value: null, error: '--min must be a non-negative safe integer: 01' },
	);
	assert.deepEqual(
		parseNonNegativeIntegerCliOption('9007199254740993', '--min', 'textBudget.error.invalidNumber', 'en'),
		{ value: null, error: '--min must be a non-negative safe integer: 9007199254740993' },
	);
});
