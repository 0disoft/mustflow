import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { parse } from 'smol-toml';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');
const schemaRoot = path.join(projectRoot, 'schemas');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-schema-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runCli(cwd, args) {
	return spawnSync(process.execPath, [cliPath, ...args], {
		cwd,
		encoding: 'utf8',
	});
}

function initProject(projectPath) {
	const result = runCli(projectPath, ['init', '--yes']);
	assert.equal(result.status, 0, result.stderr || result.stdout);
}

function appendIntent(projectPath, text) {
	const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
	const commands = readFileSync(commandsPath, 'utf8');
	writeFileSync(commandsPath, `${commands}\n${text.trim()}\n`);
}

function readJsonSchema(fileName) {
	const schemaPath = path.join(schemaRoot, fileName);
	assert.equal(existsSync(schemaPath), true, `${fileName} should exist`);

	const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
	assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
	assert.equal(schema.type, 'object');

	return schema;
}

function typeMatches(expected, value) {
	if (expected === 'array') {
		return Array.isArray(value);
	}

	if (expected === 'integer') {
		return Number.isInteger(value);
	}

	if (expected === 'number') {
		return typeof value === 'number' && Number.isFinite(value);
	}

	if (expected === 'object') {
		return value !== null && typeof value === 'object' && !Array.isArray(value);
	}

	if (expected === 'null') {
		return value === null;
	}

	return typeof value === expected;
}

function resolveRef(rootSchema, ref) {
	const parts = ref.split('/');
	assert.equal(parts[0], '#', `only local refs are supported in tests: ${ref}`);

	return parts.slice(1).reduce((current, part) => current?.[part], rootSchema);
}

function validateJsonSchema(rootSchema, value) {
	const errors = [];

	function validate(schema, candidate, pointer) {
		if (schema.$ref) {
			validate(resolveRef(rootSchema, schema.$ref), candidate, pointer);
			return;
		}

		if (schema.anyOf) {
			const matched = schema.anyOf.some((option) => {
				const before = errors.length;
				validate(option, candidate, pointer);
				const ok = errors.length === before;
				errors.length = before;
				return ok;
			});

			if (!matched) {
				errors.push(`${pointer} did not match any allowed shape`);
			}
			return;
		}

		if (schema.oneOf) {
			const matchCount = schema.oneOf.filter((option) => {
				const before = errors.length;
				validate(option, candidate, pointer);
				const ok = errors.length === before;
				errors.length = before;
				return ok;
			}).length;

			if (matchCount !== 1) {
				errors.push(`${pointer} matched ${matchCount} oneOf shapes`);
			}
			return;
		}

		if (Object.hasOwn(schema, 'const') && candidate !== schema.const) {
			errors.push(`${pointer} expected const ${JSON.stringify(schema.const)}`);
		}

		if (schema.enum && !schema.enum.includes(candidate)) {
			errors.push(`${pointer} expected one of ${schema.enum.join(', ')}`);
		}

		if (schema.type) {
			const types = Array.isArray(schema.type) ? schema.type : [schema.type];

			if (!types.some((type) => typeMatches(type, candidate))) {
				errors.push(`${pointer} expected type ${types.join('|')}`);
				return;
			}
		}

		if (Array.isArray(schema.required) && typeMatches('object', candidate)) {
			for (const key of schema.required) {
				if (!Object.hasOwn(candidate, key)) {
					errors.push(`${pointer}.${key} is required`);
				}
			}
		}

		if (schema.properties && typeMatches('object', candidate)) {
			for (const [key, propertySchema] of Object.entries(schema.properties)) {
				if (Object.hasOwn(candidate, key)) {
					validate(propertySchema, candidate[key], `${pointer}.${key}`);
				}
			}
		}

		if (schema.items && Array.isArray(candidate)) {
			candidate.forEach((item, index) => validate(schema.items, item, `${pointer}[${index}]`));
		}

		if (typeMatches('object', candidate)) {
			const propertyNames = Object.keys(schema.properties ?? {});
			const patternEntries = Object.entries(schema.patternProperties ?? {}).map(([pattern, propertySchema]) => ({
				pattern: new RegExp(pattern),
				propertySchema,
			}));

			for (const [key, nestedValue] of Object.entries(candidate)) {
				if (propertyNames.includes(key)) {
					continue;
				}

				const patternMatch = patternEntries.find((entry) => entry.pattern.test(key));
				if (patternMatch) {
					validate(patternMatch.propertySchema, nestedValue, `${pointer}.${key}`);
					continue;
				}

				if (schema.additionalProperties === false) {
					errors.push(`${pointer}.${key} is not allowed`);
				} else if (typeMatches('object', schema.additionalProperties)) {
					validate(schema.additionalProperties, nestedValue, `${pointer}.${key}`);
				}
			}
		}
	}

	validate(rootSchema, value, '$');
	return errors;
}

function assertMatchesSchema(fileName, value) {
	const schema = readJsonSchema(fileName);
	const errors = validateJsonSchema(schema, value);

	assert.deepEqual(errors, []);
}

test('doctor json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['doctor', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('doctor-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('context json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('context-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('context cache-profile json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['context', '--json', '--cache-profile', 'all']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('context-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('run receipt json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.echo_schema]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a schema test message."
argv = ['${process.execPath}', '-e', 'console.log("schema receipt")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
`,
		);

		const result = runCli(projectPath, ['run', 'echo_schema', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('run-receipt.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('command contract toml parse result matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const commandsPath = path.join(projectPath, '.mustflow', 'config', 'commands.toml');
		const commands = parse(readFileSync(commandsPath, 'utf8'));

		assertMatchesSchema('commands.schema.json', commands);
	} finally {
		removeTempProject(projectPath);
	}
});

test('contract lint json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['contract-lint', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('contract-lint-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('version sources json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['version-sources', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('version-sources-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('classify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['classify', 'README.md', 'schemas/classify-report.schema.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('classify-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('impact json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['impact', 'package.json', 'schemas/impact-report.schema.json', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('impact-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('docs review list json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['docs', 'review', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('docs-review-list.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'authority', 'AGENTS.md', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain command json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'command', 'mustflow_check', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain asset optimization json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'asset-optimization', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain retention json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'retention', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain skills json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'skills', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain skill json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'skill', 'code-review', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('explain surface json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['explain', 'surface', 'README.md', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('explain-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});

test('verify json output matches the published schema', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		appendIntent(
			projectPath,
			`
[intents.verify_schema]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Print a verify schema test message."
argv = ['${process.execPath}', '-e', 'console.log("verify schema")']
cwd = "."
timeout_seconds = 10
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
required_after = ["schema_verify"]
`,
		);

		const result = runCli(projectPath, ['verify', '--reason', 'schema_verify', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assertMatchesSchema('verify-report.schema.json', JSON.parse(result.stdout));
	} finally {
		removeTempProject(projectPath);
	}
});
