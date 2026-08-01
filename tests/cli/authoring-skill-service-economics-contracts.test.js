import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..', '..');

function read(relativePath) {
	return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

const technologySourcePath = '.mustflow/skills/technology-stack-selection/SKILL.md';
const technologyTemplatePath =
	'templates/default/locales/en/.mustflow/skills/technology-stack-selection/SKILL.md';
const cloudSourcePath = '.mustflow/skills/cloud-cost-guardrail-review/SKILL.md';
const cloudTemplatePath =
	'templates/default/locales/en/.mustflow/skills/cloud-cost-guardrail-review/SKILL.md';

test('keeps service economics skill sources synchronized with install templates', () => {
	assert.equal(read(technologyTemplatePath), read(technologySourcePath));
	assert.equal(read(cloudTemplatePath), read(cloudSourcePath));
});

test('technology selection compares equivalent outcomes, operating envelopes, and exit tax', () => {
	const skill = read(technologySourcePath);

	for (const contract of [
		'full_cost_per_accepted_outcome',
		'performance_envelope',
		'normal, growth, incident, and decline scenarios',
		'p50, p95, p99',
		'failure semantics',
		'break-even utilization',
		'exit_tax',
		'export, restore',
	]) {
		assert.match(skill, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
	}

	assert.match(skill, /Provider price-sheet units are inputs, not the comparison unit/i);
	assert.match(skill, /Do not average scores until hard rejection criteria have been applied/i);
	assert.match(skill, /do not announce a\s+permanent winner/i);
	assert.match(skill, /choose only `experiment_first` or `defer`/i);
});

test('cloud cost review models bill amplification and commits only stable floor demand', () => {
	const skill = read(cloudSourcePath);

	for (const contract of [
		'Scenario-bill model',
		'normal, growth, incident, and decline',
		'free-tier credits',
		'plan cliffs',
		'billing_efficiency',
		'stable baseline spend',
		'break-even utilization',
	]) {
		assert.match(skill, new RegExp(contract.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'));
	}

	assert.match(skill, /reserve only the conservative load that survives low-demand periods/i);
});
