import assert from 'node:assert/strict';
import path from 'node:path';
import { test } from 'node:test';
import { pathToFileURL } from 'node:url';
import { createTempProject, projectRoot, removeTempProject } from './helpers/cli-harness.js';

async function importPathScope() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'path-scope.js')).href);
}

async function importCommandEffects() {
	return import(pathToFileURL(path.join(projectRoot, 'dist', 'core', 'command-effects.js')).href);
}

test('path scopes normalize separators and preserve the supported scope kind', async () => {
	const { parsePathScope } = await importPathScope();

	assert.deepEqual(parsePathScope('./dist/file.js'), {
		kind: 'literal',
		root: 'dist/file.js',
		expression: 'dist/file.js',
	});
	assert.deepEqual(parsePathScope('.\\dist\\**'), {
		kind: 'subtree',
		root: 'dist',
		expression: 'dist/**',
	});
});

test('path scopes reject traversal absolute paths and unsupported wildcard syntax', async () => {
	const { parsePathScope, PathScopeParseError } = await importPathScope();
	const cases = [
		['', 'path_scope_empty'],
		['.', 'path_scope_empty'],
		['../dist', 'path_scope_traversal'],
		['dist/../cache', 'path_scope_traversal'],
		['/dist/file.js', 'path_scope_absolute'],
		['C:\\dist\\file.js', 'path_scope_absolute'],
		['\\\\server\\share', 'path_scope_absolute'],
		['src/**/*.ts', 'path_scope_unsupported_pattern'],
		['src/*.ts', 'path_scope_unsupported_pattern'],
		['src//file.ts', 'path_scope_unsupported_pattern'],
	];

	for (const [input, code] of cases) {
		assert.throws(
			() => parsePathScope(input),
			(error) => error instanceof PathScopeParseError && error.code === code && error.input === input,
			input,
		);
	}
});

test('path scope containment uses segment boundaries instead of string prefixes', async () => {
	const { parsePathScope, pathScopeContainsPath } = await importPathScope();
	const dist = parsePathScope('dist/**');

	assert.equal(pathScopeContainsPath(dist, 'dist'), true);
	assert.equal(pathScopeContainsPath(dist, 'dist/file.js'), true);
	assert.equal(pathScopeContainsPath(dist, 'dist/nested/file.js'), true);
	assert.equal(pathScopeContainsPath(dist, 'dist-old/file.js'), false);
	assert.equal(pathScopeContainsPath(parsePathScope('dist/file.js'), 'dist/file.js'), true);
	assert.equal(pathScopeContainsPath(parsePathScope('dist/file.js'), 'dist/other.js'), false);
	assert.throws(() => pathScopeContainsPath(dist, 'dist/**'), /path_scope_unsupported_pattern/u);
});

test('path scope intersection detects parent child overlap and keeps siblings independent', async () => {
	const { parsePathScope, pathScopesIntersect } = await importPathScope();
	const cases = [
		['dist/**', 'dist/file.js', true],
		['dist/**', 'dist/nested/**', true],
		['dist/a/**', 'dist/b/**', false],
		['dist/a/**', 'dist/ab/file.js', false],
		['dist/file.js', 'dist/file.js', true],
		['dist/file.js', 'dist/other.js', false],
	];

	for (const [leftExpression, rightExpression, expected] of cases) {
		const left = parsePathScope(leftExpression);
		const right = parsePathScope(rightExpression);
		assert.equal(pathScopesIntersect(left, right, { caseSensitive: true }), expected);
		assert.equal(pathScopesIntersect(right, left, { caseSensitive: true }), expected);
	}
});

test('path scope comparison folds case only when the platform policy is insensitive', async () => {
	const { parsePathScope, pathScopeContainsPath, pathScopesIntersect } = await importPathScope();
	const upper = parsePathScope('Dist/**');
	const lower = parsePathScope('dist/file.js');

	assert.equal(pathScopesIntersect(upper, lower, { caseSensitive: true }), false);
	assert.equal(pathScopesIntersect(upper, lower, { caseSensitive: false }), true);
	assert.equal(pathScopeContainsPath(upper, 'DIST/file.js', { caseSensitive: true }), false);
	assert.equal(pathScopeContainsPath(upper, 'DIST/file.js', { caseSensitive: false }), true);
});

test('command effects conflict on overlapping scopes even when their derived locks differ', async () => {
	const { commandEffectsConflict } = await importCommandEffects();
	const effect = (pathExpression, access = 'write') => ({
		intent: pathExpression,
		source: 'effects',
		access,
		mode: access,
		path: pathExpression,
		lock: `path:${pathExpression}`,
		concurrency: 'shared',
	});

	assert.equal(commandEffectsConflict(effect('dist/**'), effect('dist/file.js')), true);
	assert.equal(commandEffectsConflict(effect('dist/a/**'), effect('dist/b/**')), false);
	assert.equal(commandEffectsConflict(effect('dist/**', 'read'), effect('dist/file.js', 'read')), false);
	assert.equal(commandEffectsConflict(effect('dist/**', 'read'), effect('dist/file.js')), true);
});

test('command effect normalization rejects unsupported middle-glob scopes', async () => {
	const projectPath = createTempProject('mustflow-path-scope-contract-');
	const { normalizeCommandEffects, validateCommandEffects } = await importCommandEffects();
	const contract = {
		defaults: {},
		resources: {},
		intents: {
			invalid: {
				writes: ['src/**/*.ts'],
			},
		},
	};

	try {
		assert.throws(
			() => normalizeCommandEffects(projectPath, contract, 'invalid'),
			/path_scope_unsupported_pattern:src\/\*\*\/\*\.ts/u,
		);
		assert.match(
			validateCommandEffects(projectPath, { intents: contract.intents })[0]?.message ?? '',
			/path_scope_unsupported_pattern:src\/\*\*\/\*\.ts/u,
		);
	} finally {
		removeTempProject(projectPath);
	}
});
