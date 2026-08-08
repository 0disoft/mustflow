import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { assertMatchesSchema } from '../helpers/json-schema.js';
import { projectRoot } from './helpers/cli-harness.js';
import { schemaRoot } from './helpers/schema-contracts.js';

test('Agent Plugin bundle declarations are schema-valid and reference canonical skills', () => {
	const bundlePath = path.join(projectRoot, 'plugin-bundles', 'mustflow-review.bundle.json');
	const bundle = JSON.parse(readFileSync(bundlePath, 'utf8'));

	assertMatchesSchema(schemaRoot, 'agent-plugin-bundle.schema.json', bundle);
	assert.equal(new Set(bundle.skills.map((skill) => skill.name)).size, bundle.skills.length);
	for (const skill of bundle.skills) {
		assert.equal(path.basename(path.dirname(skill.source)), skill.name);
		assert.equal(existsSync(path.join(projectRoot, ...skill.source.split('/'))), true, skill.source);
	}
	assert.equal(bundle.authority.plugin_permissions_authoritative, false);
	assert.equal(bundle.authority.secrets_embedded, false);
});
