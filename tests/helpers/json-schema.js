import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

export function readJsonSchema(schemaRoot, fileName) {
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

export function validateJsonSchema(rootSchema, value) {
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

export function assertMatchesSchema(schemaRoot, fileName, value) {
	const schema = readJsonSchema(schemaRoot, fileName);
	const errors = validateJsonSchema(schema, value);

	assert.deepEqual(errors, []);
}
