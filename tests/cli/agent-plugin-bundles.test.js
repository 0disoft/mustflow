import assert from 'node:assert/strict';
import { cpSync, existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { assertMatchesSchema } from '../helpers/json-schema.js';
import { createTempProject, projectRoot, removeTempProject, runCli } from './helpers/cli-harness.js';
import { schemaRoot } from './helpers/schema-contracts.js';
import { buildAgentPluginBundle } from '../../dist/core/agent-plugin-bundle.js';

for (const linkedPath of ['dist', 'dist/agent-plugins', 'dist/agent-plugins/nested', 'dist/agent-plugins/nested/example-review']) {
	test(`plugin build rejects a linked output component: ${linkedPath}`, (t) => {
		const fixture = createTempProject('mustflow-plugin-linked-');
		const outside = createTempProject('mustflow-plugin-outside-');
		const link = path.join(fixture, linkedPath);
		try {
			const bundle = JSON.parse(readFileSync(path.join(projectRoot, 'plugin-bundles/mustflow-review.bundle.json'), 'utf8'));
			bundle.skills = bundle.skills.slice(0, 1);
			bundle.output_directory = 'dist/agent-plugins/nested/example-review';
			const skill = bundle.skills[0];
			cpSync(path.dirname(path.join(projectRoot, skill.source)), path.dirname(path.join(fixture, skill.source)), { recursive: true });
			writeFileSync(path.join(fixture, 'bundle.json'), JSON.stringify(bundle));
			writeFileSync(path.join(fixture, 'package.json'), '{"version":"1.2.3"}');
			const outsideOutput = path.join(outside, path.relative(link, path.join(fixture, bundle.output_directory)));
			mkdirSync(outsideOutput, { recursive: true });
			const sentinel = path.join(outsideOutput, 'keep.txt');
			writeFileSync(sentinel, 'external data must survive');
			mkdirSync(path.dirname(link), { recursive: true });
			symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
			let failure;
			try { buildAgentPluginBundle(fixture, 'bundle.json'); } catch (error) { failure = error; }
			const preserved = existsSync(sentinel) && readFileSync(sentinel, 'utf8') === 'external data must survive';
			t.diagnostic(JSON.stringify({ linkedPath, rejected: !!failure, externalFilePreserved: preserved }));
			assert.equal(preserved, true, 'build must preserve files outside the project');
			assert.match(failure?.message ?? '', /Path must not contain symlinks/u);
			assert.equal(existsSync(path.join(outsideOutput, 'plugin.json')), false);
		} finally {
			if (lstatSync(link, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(link);
			removeTempProject(fixture);
			removeTempProject(outside);
		}
	});
}

for (const depth of [1, 2, 3]) {
	test(`plugin build rejects linked source directories at depth ${depth}`, (t) => {
		const fixture = createTempProject('mustflow-plugin-source-');
		const outside = createTempProject('mustflow-plugin-external-source-');
		let link;
		let exportedDirectory;
		try {
			const bundle = JSON.parse(readFileSync(path.join(projectRoot, 'plugin-bundles/mustflow-review.bundle.json'), 'utf8'));
			bundle.skills = bundle.skills.slice(0, 1);
			const skill = bundle.skills[0];
			const linkedPath = path.dirname(skill.source).split(/[\\/]/u).slice(0, depth).join('/');
			link = path.join(fixture, linkedPath);
			const outsideSource = path.join(outside, path.relative(link, path.join(fixture, skill.source)));
			const original = `---\nname: ${skill.name}\ndescription: External fixture.\nrevision: 1\n---\n# External source\n`;
			mkdirSync(path.dirname(outsideSource), { recursive: true });
			writeFileSync(outsideSource, original);
			mkdirSync(path.dirname(link), { recursive: true });
			symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
			writeFileSync(path.join(fixture, 'bundle.json'), JSON.stringify(bundle));
			writeFileSync(path.join(fixture, 'package.json'), '{"version":"1.2.3"}');
			const output = path.join(fixture, bundle.output_directory);
			exportedDirectory = path.join(output, 'skills', skill.name);
			let failure;
			try { buildAgentPluginBundle(fixture, 'bundle.json'); } catch (error) { failure = error; }
			const externalSourceChanged = readFileSync(outsideSource, 'utf8') !== original;
			t.diagnostic(JSON.stringify({ linkedPath, rejected: !!failure, externalSourceChanged }));
			assert.equal(externalSourceChanged, false, 'plugin export must not overwrite external skill sources');
			assert.match(failure?.message ?? '', /Path must not contain symlinks/u);
			assert.equal(existsSync(output), false, 'reject linked sources before creating build output');
		} finally {
			if (exportedDirectory && lstatSync(exportedDirectory, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(exportedDirectory);
			if (link && lstatSync(link, { throwIfNoEntry: false })?.isSymbolicLink()) unlinkSync(link);
			removeTempProject(fixture);
			removeTempProject(outside);
		}
	});
}

test('plugin build validates all MCP inputs before replacing existing output', (t) => {
	const fixture = createTempProject('mustflow-plugin-mcp-preflight-');
	try {
		const bundle = JSON.parse(readFileSync(path.join(projectRoot, 'plugin-bundles/mustflow-review.bundle.json'), 'utf8'));
		bundle.skills = bundle.skills.slice(0, 1);
		const skill = bundle.skills[0];
		cpSync(path.dirname(path.join(projectRoot, skill.source)), path.dirname(path.join(fixture, skill.source)), { recursive: true });
		mkdirSync(path.join(fixture, 'plugin-bundles/mcp'), { recursive: true });
		writeFileSync(path.join(fixture, 'package.json'), '{"version":"1.2.3"}');
		const server = { command: 'node', args: ['server.js'] };
		writeFileSync(path.join(fixture, 'plugin-bundles/mcp/valid.json'), JSON.stringify(server));
		writeFileSync(path.join(fixture, 'plugin-bundles/mcp/broken.json'), '{ invalid JSON');
		const valid = { name: 'valid', source: 'plugin-bundles/mcp/valid.json' };
		const originalName = bundle.plugin.name;
		const output = path.join(fixture, bundle.output_directory);
		let damagedBuilds = 0;
		const cases = [
			[{ ...valid, name: 'invalid/name' }, /agent_plugin_mcp_name_invalid/u],
			[{ name: 'outside', source: '../outside.json' }, /agent_plugin_mcp_source_invalid/u],
			[{ name: 'missing', source: 'plugin-bundles/mcp/missing.json' }, /agent_plugin_mcp_source_invalid/u],
			[{ name: 'broken', source: 'plugin-bundles/mcp/broken.json' }, SyntaxError],
		];
		for (const [invalid, expectedError] of cases) {
			bundle.plugin.name = originalName;
			bundle.mcp_servers = [valid];
			writeFileSync(path.join(fixture, 'bundle.json'), JSON.stringify(bundle));
			assert.equal(buildAgentPluginBundle(fixture, 'bundle.json').ok, true);
			const snapshots = ['plugin.json', 'mcp.json', `skills/${skill.name}/SKILL.md`]
				.map(name => [path.join(output, name), readFileSync(path.join(output, name))]);
			bundle.plugin.name = 'replacement-plugin';
			bundle.mcp_servers = [valid, invalid];
			writeFileSync(path.join(fixture, 'bundle.json'), JSON.stringify(bundle));
			assert.throws(() => buildAgentPluginBundle(fixture, 'bundle.json'), expectedError);
			if (snapshots.some(([file, bytes]) => !existsSync(file) || !readFileSync(file).equals(bytes))) damagedBuilds++;
		}
		t.diagnostic(JSON.stringify({ rejectedInputs: cases.length, damagedBuilds }));
		assert.equal(damagedBuilds, 0, 'invalid MCP inputs must preserve the last successful build byte-for-byte');
		bundle.mcp_servers = [{ ...valid, name: 'replacement' }];
		writeFileSync(path.join(fixture, 'bundle.json'), JSON.stringify(bundle));
		assert.equal(buildAgentPluginBundle(fixture, 'bundle.json').ok, true);
		assert.deepEqual(JSON.parse(readFileSync(path.join(output, 'mcp.json'), 'utf8')), { mcpServers: { replacement: server } });
	} finally { removeTempProject(fixture); }
});

test('real bundled skills export portable string metadata without changing canonical files', () => {
	const fixture = createTempProject('mustflow-portable-real-');
	try {
		const bundle = JSON.parse(readFileSync(path.join(projectRoot, 'plugin-bundles/mustflow-review.bundle.json'), 'utf8'));
		mkdirSync(path.join(fixture, 'plugin-bundles'), { recursive: true });
		writeFileSync(path.join(fixture, 'plugin-bundles/review.json'), JSON.stringify(bundle));
		writeFileSync(path.join(fixture, 'package.json'), '{"version":"1.2.3"}');
		const originals = new Map();
		for (const skill of bundle.skills) {
			cpSync(path.dirname(path.join(projectRoot, skill.source)), path.dirname(path.join(fixture, skill.source)), { recursive: true });
			originals.set(skill.name, readFileSync(path.join(fixture, skill.source), 'utf8'));
		}
		assert.equal(buildAgentPluginBundle(fixture, 'plugin-bundles/review.json').validation.skills_valid, true);
		for (const skill of bundle.skills) {
			const exported = readFileSync(path.join(fixture, bundle.output_directory, 'skills', skill.name, 'SKILL.md'), 'utf8');
			const header = exported.split('\n---\n')[0];
			assert.doesNotMatch(header, /^(?:mustflow_doc|locale|canonical|revision|lifecycle|authority):/mu);
			assert.match(header, /compatibility: "Requires a mustflow-managed repository/u);
			assert.ok(JSON.parse(/^description: (.+)$/mu.exec(header)[1]).length <= 1024);
			if (skill.export_description) {
				assert.equal(JSON.parse(/^description: (.+)$/mu.exec(header)[1]), skill.export_description);
				assert.match(skill.export_description, /secrets, personal data, retention, access control/u);
				assert.match(skill.export_description, /vendor disclosure, or external disclosure/u);
				assert.equal(JSON.parse(/^  mustflow_description: (.+)$/mu.exec(header)[1]), /^description: (.+)$/mu.exec(originals.get(skill.name))[1].trimEnd());
			}
			const fields = [...header.matchAll(/^  ([a-z_]+): (.+)$/gmu)];
			assert.ok(fields.length > 0);
			assert.ok(fields.every(([, , value]) => typeof JSON.parse(value) === 'string'));
			const intentField = fields.find(([, key]) => key === 'mustflow_command_intents');
			assert.ok(Array.isArray(JSON.parse(JSON.parse(intentField[2]))));
			assert.equal(exported.split('\n---\n')[1], originals.get(skill.name).replaceAll('\r\n', '\n').split('\n---\n')[1]);
			assert.equal(readFileSync(path.join(fixture, skill.source), 'utf8'), originals.get(skill.name));
		}
		const first = bundle.skills[0];
		const portableOutput = path.join(fixture, bundle.output_directory, 'skills', first.name, 'SKILL.md');
		const before = readFileSync(portableOutput, 'utf8');
		const longDescription = 'Review inputs. ' + 'x'.repeat(1024) + ' Do not use for unrelated work.';
		writeFileSync(path.join(fixture, first.source), originals.get(first.name).replace(/^description:.*$/mu, 'description: ' + longDescription));
		assert.throws(() => buildAgentPluginBundle(fixture, 'plugin-bundles/review.json'), /export_description_required/u);
		assert.equal(readFileSync(portableOutput, 'utf8'), before);
		for (const invalid of ['', '   ', 'x'.repeat(1025)]) {
			bundle.skills[0].export_description = invalid;
			writeFileSync(path.join(fixture, 'plugin-bundles/review.json'), JSON.stringify(bundle));
			assert.throws(() => buildAgentPluginBundle(fixture, 'plugin-bundles/review.json'), /export_description_invalid/u);
			assert.equal(readFileSync(portableOutput, 'utf8'), before);
		}
		bundle.skills[0].export_description = 'Review inputs. Do not use for unrelated work.';
		writeFileSync(path.join(fixture, 'plugin-bundles/review.json'), JSON.stringify(bundle));
		assert.equal(buildAgentPluginBundle(fixture, 'plugin-bundles/review.json').ok, true);
		assert.ok(readFileSync(portableOutput, 'utf8').includes('description: "Review inputs. Do not use for unrelated work."'));
		assert.equal(JSON.parse(/^  mustflow_description: (.+)$/mu.exec(readFileSync(portableOutput, 'utf8'))[1]), longDescription);
		writeFileSync(path.join(fixture, first.source), originals.get(first.name).replace(/^description:.*$/mu, 'description: ""'));
		assert.throws(() => buildAgentPluginBundle(fixture, 'plugin-bundles/review.json'), /portable_fields_invalid/u);
	} finally { removeTempProject(fixture); }
});

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
