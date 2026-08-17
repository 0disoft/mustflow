import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const ciWorkflow = readFileSync(path.join(projectRoot, '.github', 'workflows', 'ci.yml'), 'utf8');

// --- minimal glob matcher for the paths-filter minimap globs used in ci.yml ---
// Supports ** (any depth), * (within a segment), and ? (single char).
function globToRegExp(glob) {
	let source = '';
	for (let i = 0; i < glob.length; i += 1) {
		const char = glob[i];
		if (char === '*') {
			if (glob[i + 1] === '*') {
				i += 1;
				if (glob[i + 1] === '/') {
					i += 1;
					source += '(?:.*/)?';
				} else {
					source += '.*';
				}
			} else {
				source += '[^/]*';
			}
		} else if (char === '?') {
			source += '[^/]';
		} else {
			source += /[.+^${}()|[\]\\]/.test(char) ? `\\${char}` : char;
		}
	}
	return new RegExp(`^${source}$`, 'u');
}

function extractFilters(workflow) {
	const lines = workflow.split('\n');
	const filterStart = lines.findIndex((line) => line.includes('filters: |'));
	assert.ok(filterStart >= 0, 'ci.yml should declare a filters block scalar');

	const filters = new Map();
	let currentName = null;

	for (let i = filterStart + 1; i < lines.length; i += 1) {
		const line = lines[i];
		if (/^\s{0,10}\S/.test(line)) {
			break; // block scalar ended (next top-level or 8-space key)
		}
		const nameMatch = /^\s{12}([a-z_]+):\s*$/.exec(line);
		if (nameMatch) {
			currentName = nameMatch[1];
			filters.set(currentName, []);
			continue;
		}
		const itemMatch = /^\s{14}-\s+'([^']+)'$/.exec(line);
		if (itemMatch && currentName) {
			filters.get(currentName).push(itemMatch[1]);
		}
	}

	assert.ok(filters.size > 0, 'ci.yml filters block should declare at least one filter');
	return filters;
}

function matchingFilters(filters, changedPath) {
	const matched = [];
	for (const [name, globs] of filters) {
		if (globs.some((glob) => globToRegExp(glob).test(changedPath))) {
			matched.push(name);
		}
	}
	return matched.sort();
}

test('ci path filter covers every gate-relevant surface', () => {
	const filters = extractFilters(ciWorkflow);

	assert.deepEqual(filters.get('source'), [
		'src/**',
		'scripts/**',
		'tests/**',
		'.mustflow/config/**',
		'.mustflow/docs/**',
		'package.json',
		'bun.lock',
	]);
	assert.deepEqual(filters.get('skills'), [
		'.mustflow/skills/**',
		'templates/default/locales/en/.mustflow/skills/**',
		'templates/default/manifest.toml',
		'templates/default/i18n.toml',
	]);
	assert.ok(filters.get('docs').includes('docs-site/src/content/docs/**'));
	assert.ok(filters.get('package').includes('templates/**'));
	assert.ok(filters.get('windows').includes('tests/cli/*windows*.test.js'));
	assert.ok(filters.get('site').includes('docs-site/**'));
});

test('ci path matrix maps changed paths to the expected gates', () => {
	const filters = extractFilters(ciWorkflow);

	const matrix = [
		{ path: 'src/cli/index.ts', expected: ['source'] },
		{ path: 'src/cli/lib/process-win.ts', expected: ['source', 'windows'] },
		{ path: 'src/core/windows-api.ts', expected: ['source', 'windows'] },
		{ path: 'tests/cli/schema-contracts.test.js', expected: ['source'] },
		{ path: 'tests/cli/windows-proc.test.js', expected: ['source', 'windows'] },
		{ path: 'scripts/guard-commit-message.mjs', expected: ['source'] },
		{ path: '.mustflow/config/commands.toml', expected: ['source'] },
		{ path: '.mustflow/docs/agent-workflow.md', expected: ['source'] },
		{ path: 'package.json', expected: ['source'] },
		{ path: 'bun.lock', expected: ['source'] },
		{ path: '.mustflow/skills/agent-operational-hygiene-review/SKILL.md', expected: ['skills'] },
		{ path: '.mustflow/skills/route-fixtures.json', expected: ['skills'] },
		{ path: 'templates/default/locales/en/.mustflow/skills/INDEX.md', expected: ['package', 'skills'] },
		{ path: 'templates/default/manifest.toml', expected: ['package', 'skills'] },
		{ path: 'templates/default/i18n.toml', expected: ['package', 'skills'] },
		{ path: 'README.md', expected: ['docs'] },
		{ path: 'docs-site/src/content/docs/guides/x.mdx', expected: ['docs', 'site'] },
		{ path: 'docs-site/src/components/X.tsx', expected: ['site'] },
		{ path: 'scripts/release-plan.mjs', expected: ['package', 'source'] },
		{ path: '.github/workflows/publish-npm.yml', expected: ['package'] },
		{ path: '.github/workflows/ci.yml', expected: [] },
	];

	for (const entry of matrix) {
		const matched = matchingFilters(filters, entry.path);
		assert.deepEqual(
			matched,
			entry.expected,
			`${entry.path} should gate ${entry.expected.join('+')} (matched ${matched.join('+')})`,
		);
	}
});

test('ci jobs wire the skills output into the validate gate', () => {
	assert.match(ciWorkflow, /skills: \$\{\{ steps\.filter\.outputs\.skills \}\}/u);
	assert.match(ciWorkflow, /needs\.changes\.outputs\.skills == 'true'/u);
	assert.match(ciWorkflow, /- name: Check skill contracts and route evaluation/u);
	assert.match(ciWorkflow, /run: bun run test:skill-contracts && bun run scripts\/evaluate-skill-routes\.ts/u);
});
