import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { assertMatchesSchema } from '../helpers/json-schema.js';
import { createTempProject, projectRoot, removeTempProject, runCli } from './helpers/cli-harness.js';
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

test('plugin build creates a separate validated portable output', () => {
	const fixture = createTempProject('mustflow-agent-plugin-');
	try {
		mkdirSync(path.join(fixture, '.mustflow', 'skills', 'example-review'), { recursive: true });
		mkdirSync(path.join(fixture, 'plugin-bundles'), { recursive: true });
		writeFileSync(path.join(fixture, 'package.json'), '{"version":"1.2.3"}\n');
		writeFileSync(path.join(fixture, '.mustflow', 'skills', 'example-review', 'SKILL.md'), [
			'---',
			'name: example-review',
			'description: Example review skill.',
			'---',
			'',
			'# Example review',
			'',
		].join('\n'));
		const bundle = {
			schema_version: '1',
			kind: 'agent_plugin_bundle',
			plugin: {
				name: 'example-review', description: 'Example.', homepage: 'https://example.com',
				repository: 'https://example.com/repo', license: 'MIT',
			},
			version_source: { file: 'package.json', json_pointer: '/version' },
			output_directory: 'dist/agent-plugins/example-review',
			skills: [{ name: 'example-review', source: '.mustflow/skills/example-review/SKILL.md' }],
			mcp_servers: [],
			authority: {
				skill_source_of_truth: '.mustflow/skills', command_contract: '.mustflow/config/commands.toml',
				plugin_permissions_authoritative: false, secrets_embedded: false,
			},
			provenance: {
				specification: 'https://agent-plugins.org/specification', specification_version: '1.0.0',
				checked_at: '2026-08-08', source_refresh: 'user_supplied_snapshot',
			},
		};
		writeFileSync(path.join(fixture, 'plugin-bundles', 'example.bundle.json'), `${JSON.stringify(bundle, null, 2)}\n`);

		const result = runCli(fixture, ['plugin', 'build', '--bundle', 'plugin-bundles/example.bundle.json', '--json']);
		assert.equal(result.status, 0, result.stderr || result.stdout);
		const report = JSON.parse(result.stdout);
		assertMatchesSchema(schemaRoot, 'agent-plugin-build-report.schema.json', report);
		assert.equal(report.source_refresh, 'user_supplied_snapshot');
		assert.deepEqual(report.issues, ['official_schema_live_refresh_unavailable']);
		const outputRoot = path.join(fixture, 'dist', 'agent-plugins', 'example-review');
		assert.deepEqual(JSON.parse(readFileSync(path.join(outputRoot, 'plugin.json'), 'utf8')), {
			name: 'example-review', version: '1.2.3', description: 'Example.', homepage: 'https://example.com',
			repository: 'https://example.com/repo', license: 'MIT',
		});
		assert.equal(existsSync(path.join(outputRoot, 'skills', 'example-review', 'SKILL.md')), true);
		assert.equal(existsSync(path.join(outputRoot, '.mustflow', 'config', 'commands.toml')), false);
	} finally {
		removeTempProject(fixture);
	}
});
