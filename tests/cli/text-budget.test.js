import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';

import { createTempProject, initProject, removeTempProject, runCli } from './run-support.js';

function runTextBudgetJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runGeneratedBoundaryJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'repo/generated-boundary', 'check', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeOutlineJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/outline', 'scan', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runCodeSymbolReadJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'run', 'code/symbol-read', 'read', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runScriptPackSuggestJson(projectPath, args) {
	const result = runCli(projectPath, ['script-pack', 'suggest', ...args, '--json']);
	return { result, report: JSON.parse(result.stdout) };
}

function runGit(projectPath, args) {
	return spawnSync('git', ['-C', projectPath, ...args], {
		cwd: projectPath,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe'],
		windowsHide: true,
	});
}

function commitGitBaseline(projectPath) {
	for (const args of [
		['init'],
		['config', 'user.email', 'mustflow-tests@example.invalid'],
		['config', 'user.name', 'mustflow tests'],
		['add', '.'],
		['commit', '-m', 'baseline'],
	]) {
		const result = runGit(projectPath, args);
		assert.equal(result.status, 0, result.stderr || result.stdout);
	}
}

test('script-pack catalog exposes routing metadata for agent script selection', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'list', '--json']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		const report = JSON.parse(result.stdout);
		const codePack = report.packs.find((pack) => pack.id === 'code');
		const codeOutline = codePack?.scripts.find((script) => script.ref === 'code/outline');

		assert.ok(codeOutline, 'code/outline should be listed');
		assert.equal(codeOutline.read_only, true);
		assert.equal(codeOutline.mutates, false);
		assert.equal(codeOutline.network, false);
		assert.deepEqual(codeOutline.phases, ['before_change', 'during_change', 'review']);
		assert.ok(codeOutline.use_when.some((hint) => hint.includes('symbol headers')));
		assert.ok(codeOutline.inputs.includes('max_files'));
		assert.ok(codeOutline.outputs.includes('symbol_outline'));
		assert.ok(codeOutline.outputs.includes('source_anchors'));
		assert.ok(codeOutline.related_skills.includes('codebase-orientation'));
		assert.equal(codeOutline.risk_level, 'low');
		assert.equal(codeOutline.cost, 'low');
		assert.equal(codeOutline.report_schema_file, 'code-outline-report.schema.json');

		const codeSymbolRead = codePack?.scripts.find((script) => script.ref === 'code/symbol-read');

		assert.ok(codeSymbolRead, 'code/symbol-read should be listed');
		assert.match(codeSymbolRead.usage, /--anchor <id>/u);
		assert.equal(codeSymbolRead.read_only, true);
		assert.equal(codeSymbolRead.mutates, false);
		assert.equal(codeSymbolRead.network, false);
		assert.deepEqual(codeSymbolRead.phases, ['before_change', 'during_change', 'review']);
		assert.ok(codeSymbolRead.inputs.includes('anchor_id'));
		assert.ok(codeSymbolRead.inputs.includes('start_line'));
		assert.ok(codeSymbolRead.outputs.includes('source_snippet'));
		assert.ok(codeSymbolRead.related_skills.includes('typescript-code-change'));
		assert.equal(codeSymbolRead.risk_level, 'low');
		assert.equal(codeSymbolRead.cost, 'low');
		assert.equal(codeSymbolRead.report_schema_file, 'code-symbol-read-report.schema.json');

		const corePack = report.packs.find((pack) => pack.id === 'core');
		const textBudget = corePack?.scripts.find((script) => script.ref === 'core/text-budget');

		assert.ok(textBudget, 'core/text-budget should be listed');
		assert.equal(textBudget.read_only, true);
		assert.equal(textBudget.mutates, false);
		assert.equal(textBudget.network, false);
		assert.deepEqual(textBudget.phases, ['before_change', 'after_change', 'review']);
		assert.ok(textBudget.use_when.some((hint) => hint.includes('text budgets')));
		assert.ok(textBudget.inputs.includes('json_pointer'));
		assert.ok(textBudget.outputs.includes('json_report'));
		assert.ok(textBudget.related_skills.includes('docs-prose-review'));
		assert.equal(textBudget.risk_level, 'low');
		assert.equal(textBudget.cost, 'low');
		assert.equal(textBudget.report_schema_file, 'text-budget-report.schema.json');

		const repoPack = report.packs.find((pack) => pack.id === 'repo');
		const generatedBoundary = repoPack?.scripts.find((script) => script.ref === 'repo/generated-boundary');

		assert.ok(generatedBoundary, 'repo/generated-boundary should be listed');
		assert.equal(generatedBoundary.read_only, true);
		assert.equal(generatedBoundary.mutates, false);
		assert.equal(generatedBoundary.network, false);
		assert.deepEqual(generatedBoundary.phases, ['before_change', 'after_change', 'review']);
		assert.ok(generatedBoundary.use_when.some((hint) => hint.includes('generated')));
		assert.ok(generatedBoundary.inputs.includes('path'));
		assert.ok(generatedBoundary.outputs.includes('json_report'));
		assert.ok(generatedBoundary.related_skills.includes('completion-evidence-gate'));
		assert.equal(generatedBoundary.risk_level, 'low');
		assert.equal(generatedBoundary.cost, 'low');
		assert.equal(generatedBoundary.report_schema_file, 'generated-boundary-report.schema.json');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline scans source symbols with stable path, line, and hash metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'sample.ts'),
			[
				'export async function loadThing(id: string) {',
				'  return id.toUpperCase();',
				'}',
				'',
				'export class ThingBox {',
				'  value = 1;',
				'}',
				'',
				'type LocalShape = { value: number };',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'outline');
		assert.equal(report.script_ref, 'code/outline');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.files[0].path, 'src/sample.ts');
		assert.equal(report.files[0].language, 'typescript');
		assert.match(report.files[0].sha256, /^sha256:[a-f0-9]{64}$/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
		assert.deepEqual(report.anchors, []);

		const loadThing = report.symbols.find((symbol) => symbol.name === 'loadThing');
		assert.ok(loadThing, 'loadThing should be outlined');
		assert.equal(loadThing.kind, 'function');
		assert.equal(loadThing.exported, true);
		assert.equal(loadThing.async, true);
		assert.equal(loadThing.start_line, 1);
		assert.equal(loadThing.end_line, 3);
		assert.equal(loadThing.path, 'src/sample.ts');
		assert.equal(loadThing.return_type, null);
		assert.equal(loadThing.return_behavior, 'value');
		assert.equal(loadThing.return_count, 1);
		assert.deepEqual(loadThing.return_lines, [2]);
		assert.equal(loadThing.return_preview, 'id.toUpperCase()');
		assert.match(loadThing.content_sha256, /^sha256:[a-f0-9]{64}$/u);

		const thingBox = report.symbols.find((symbol) => symbol.name === 'ThingBox');
		assert.ok(thingBox, 'ThingBox should be outlined');
		assert.equal(thingBox.kind, 'class');
		assert.equal(thingBox.start_line, 5);
		assert.equal(thingBox.end_line, 7);
		assert.equal(thingBox.return_type, null);
		assert.equal(thingBox.return_behavior, 'unknown');
		assert.equal(thingBox.return_count, 0);
		assert.deepEqual(thingBox.return_lines, []);
		assert.equal(thingBox.return_preview, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports source anchors with conservative target symbol metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.ts'),
			[
				'/**',
				' * mf:anchor auth.session.resolve',
				' * purpose: Resolve validated auth session.',
				' * search: auth, session, resolve',
				' * invariant: Session resolution must stay after request validation.',
				' * risk: authz, security',
				' */',
				'export function resolveSession(token: string): string {',
				'  return token.trim();',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src/anchored.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.anchors.length, 1);

		const anchor = report.anchors[0];
		assert.equal(anchor.id, 'auth.session.resolve');
		assert.equal(anchor.path, 'src/anchored.ts');
		assert.equal(anchor.line_start, 2);
		assert.equal(anchor.line_end, 6);
		assert.equal(anchor.purpose, 'Resolve validated auth session.');
		assert.deepEqual(anchor.search, ['auth', 'session', 'resolve']);
		assert.equal(anchor.invariant, 'Session resolution must stay after request validation.');
		assert.deepEqual(anchor.risk, ['authz', 'security']);
		assert.equal(anchor.navigation_only, true);
		assert.equal(anchor.can_instruct_agent, false);
		assert.equal(anchor.target_kind, 'function');
		assert.equal(anchor.target_name, 'resolveSession');
		assert.equal(anchor.target_start_line, 8);

		const target = report.symbols.find((symbol) => symbol.name === 'resolveSession');
		assert.ok(target, 'resolveSession should be outlined');
		assert.equal(anchor.target_symbol_id, target.id);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports explicit return annotations and return behavior metadata', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'returns.ts'),
			[
				'export async function loadThing(id: string): Promise<string> {',
				'  return id.toUpperCase();',
				'}',
				'',
				'export function maybe(flag: boolean): string | undefined {',
				'  if (flag) return "yes";',
				'  return;',
				'}',
				'',
				'const expression = (value: number): number => value + 1;',
				'',
				'export function failFast(): never {',
				'  throw new Error("boom");',
				'}',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeOutlineJson(projectPath, ['src/returns.ts']);

		assert.equal(result.status, 0, result.stderr || result.stdout);

		const loadThing = report.symbols.find((symbol) => symbol.name === 'loadThing');
		assert.ok(loadThing, 'loadThing should be outlined');
		assert.equal(loadThing.return_type, 'Promise<string>');
		assert.equal(loadThing.return_behavior, 'value');
		assert.equal(loadThing.return_count, 1);
		assert.deepEqual(loadThing.return_lines, [2]);
		assert.equal(loadThing.return_preview, 'id.toUpperCase()');

		const maybe = report.symbols.find((symbol) => symbol.name === 'maybe');
		assert.ok(maybe, 'maybe should be outlined');
		assert.equal(maybe.return_type, 'string | undefined');
		assert.equal(maybe.return_behavior, 'mixed');
		assert.equal(maybe.return_count, 2);
		assert.deepEqual(maybe.return_lines, [6, 7]);
		assert.equal(maybe.return_preview, '"yes"');

		const expression = report.symbols.find((symbol) => symbol.name === 'expression');
		assert.ok(expression, 'expression should be outlined');
		assert.equal(expression.return_type, 'number');
		assert.equal(expression.return_behavior, 'value');
		assert.equal(expression.return_count, 0);
		assert.deepEqual(expression.return_lines, []);
		assert.equal(expression.return_preview, 'value + 1');

		const failFast = report.symbols.find((symbol) => symbol.name === 'failFast');
		assert.ok(failFast, 'failFast should be outlined');
		assert.equal(failFast.return_type, 'never');
		assert.equal(failFast.return_behavior, 'throws_only');
		assert.equal(failFast.return_count, 0);
		assert.deepEqual(failFast.return_lines, []);
		assert.equal(failFast.return_preview, null);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves a symbol by start line and returns only the bounded snippet', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'sample.ts'),
			[
				'const before = 1;',
				'',
				'export function target(value: string): string {',
				'  return value.trim();',
				'}',
				'',
				'const after = 2;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.ts',
			'--start-line',
			'3',
			'--context-lines',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'code');
		assert.equal(report.script_id, 'symbol-read');
		assert.equal(report.script_ref, 'code/symbol-read');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.target.path, 'src/sample.ts');
		assert.equal(report.target.resolved_start_line, 3);
		assert.equal(report.target.resolved_end_line, 5);
		assert.equal(report.target.context_start_line, 2);
		assert.equal(report.target.context_end_line, 6);
		assert.equal(report.target.symbol.name, 'target');
		assert.equal(report.target.symbol.return_type, 'string');
		assert.equal(report.target.symbol.return_behavior, 'value');
		assert.equal(report.target.symbol.return_count, 1);
		assert.deepEqual(report.target.symbol.return_lines, [4]);
		assert.equal(report.target.symbol.return_preview, 'value.trim()');
		assert.equal(report.snippet.start_line, 2);
		assert.equal(report.snippet.end_line, 6);
		assert.match(report.snippet.text, /export function target/u);
		assert.doesNotMatch(report.snippet.text, /const after = 2/u);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read resolves a source anchor to its target symbol snippet', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'anchored.ts'),
			[
				'const before = 1;',
				'',
				'/**',
				' * mf:anchor auth.session.resolve',
				' * purpose: Resolve validated auth session.',
				' * search: auth, session, resolve',
				' * invariant: Session resolution must stay after request validation.',
				' * risk: authz, security',
				' */',
				'export function resolveSession(token: string): string {',
				'  return token.trim();',
				'}',
				'',
				'const after = 2;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'--anchor',
			'auth.session.resolve',
			'--context-lines',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.policy.anchor_id, 'auth.session.resolve');
		assert.equal(report.policy.start_line, null);
		assert.equal(report.target.requested_anchor_id, 'auth.session.resolve');
		assert.equal(report.target.requested_start_line, null);
		assert.equal(report.target.anchor.id, 'auth.session.resolve');
		assert.equal(report.target.anchor.navigation_only, true);
		assert.equal(report.target.anchor.can_instruct_agent, false);
		assert.equal(report.target.path, 'src/anchored.ts');
		assert.equal(report.target.resolved_start_line, 10);
		assert.equal(report.target.resolved_end_line, 12);
		assert.equal(report.target.context_start_line, 9);
		assert.equal(report.target.context_end_line, 13);
		assert.equal(report.target.symbol.name, 'resolveSession');
		assert.equal(report.target.symbol.return_type, 'string');
		assert.equal(report.target.symbol.return_preview, 'token.trim()');
		assert.equal(report.snippet.start_line, 9);
		assert.equal(report.snippet.end_line, 13);
		assert.match(report.snippet.text, /export function resolveSession/u);
		assert.doesNotMatch(report.snippet.text, /const before = 1/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects source anchors without a target symbol', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(
			path.join(projectPath, 'src', 'floating.ts'),
			[
				'/**',
				' * mf:anchor auth.session.floating',
				' * purpose: This anchor intentionally has no declaration target.',
				' * search: auth, floating',
				' * risk: security',
				' */',
				'const ordinaryValue = 1;',
				'',
			].join('\n'),
		);

		const { result, report } = runCodeSymbolReadJson(projectPath, ['--anchor', 'auth.session.floating']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.target.anchor.id, 'auth.session.floating');
		assert.equal(report.target.resolved_start_line, null);
		assert.equal(report.target.symbol, null);
		assert.equal(report.snippet, null);
		assert.equal(report.findings[0].code, 'code_symbol_read_anchor_without_symbol');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects mixing source-anchor and explicit line selection modes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.ts'), 'export const one = 1;\n');

		const result = runCli(projectPath, [
			'script-pack',
			'run',
			'code/symbol-read',
			'read',
			'src/sample.ts',
			'--anchor',
			'auth.session.resolve',
			'--start-line',
			'1',
		]);

		assert.equal(result.status, 1);
		assert.match(result.stderr, /Use either --anchor <id> or <path> with --start-line/);
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read can read an explicit line range when no symbol starts there', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.js'), 'const one = 1;\nconst two = 2;\n');

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.js',
			'--start-line',
			'1',
			'--end-line',
			'1',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.target.language, 'javascript');
		assert.equal(report.target.symbol, null);
		assert.equal(report.snippet.text, 'const one = 1;');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports unsupported files with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'notes.md'), '# Notes\n');

		const { result, report } = runCodeOutlineJson(projectPath, ['notes.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'code_outline_unsupported_file');
		assert.equal(report.findings[0].path, 'notes.md');
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-outline reports max-files truncation with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'one.ts'), 'export const one = 1;\n');
		writeFileSync(path.join(projectPath, 'src', 'two.ts'), 'export const two = 2;\n');

		const { result, report } = runCodeOutlineJson(projectPath, ['src', '--max-files', '1']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.files.length, 1);
		assert.ok(report.findings.some((finding) => finding.code === 'code_outline_max_files_exceeded'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('code-symbol-read rejects explicit ranges outside the file', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'src'));
		writeFileSync(path.join(projectPath, 'src', 'sample.ts'), 'export const one = 1;\n');

		const { result, report } = runCodeSymbolReadJson(projectPath, [
			'src/sample.ts',
			'--start-line',
			'10',
			'--end-line',
			'10',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.target, null);
		assert.equal(report.snippet, null);
		assert.equal(report.findings[0].code, 'code_symbol_read_invalid_range');
		assert.equal(report.findings[0].start_line, 10);
		assert.equal(report.findings[0].end_line, 10);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget passes multilingual grapheme budgets', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'intro.txt'), '가나다👨‍👩‍👧‍👦');

		const { result, report } = runTextBudgetJson(projectPath, [
			'intro.txt',
			'--exact',
			'4',
			'--unit',
			'grapheme',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'core');
		assert.equal(report.script_id, 'text-budget');
		assert.equal(report.script_ref, 'core/text-budget');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.metrics[0].value, 4);
		assert.equal(report.metrics[0].unit, 'grapheme');
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget reports budget violations with a stable finding code', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'summary.txt'), 'too long');

		const { result, report } = runTextBudgetJson(projectPath, [
			'summary.txt',
			'--max',
			'3',
			'--unit',
			'grapheme',
		]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'text_budget_above_max');
		assert.equal(report.findings[0].actual, 8);
		assert.equal(report.findings[0].expected, 3);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget checks JSON string fields by JSON pointer', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'package.json'), `${JSON.stringify({ description: '짧은 소개' }, null, 2)}\n`);

		const { result, report } = runTextBudgetJson(projectPath, [
			'package.json',
			'--json-pointer',
			'/description',
			'--max',
			'5',
			'--unit',
			'word',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.policy.json_pointer, '/description');
		assert.equal(report.metrics[0].value, 2);
		assert.equal(report.metrics[0].path, 'package.json');
		assert.deepEqual(report.findings, []);
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget reports stable error finding codes', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'bad-json.json'), '{');
		writeFileSync(path.join(projectPath, 'data.json'), `${JSON.stringify({ description: 'hello', count: 3 }, null, 2)}\n`);

		const cases = [
			{
				name: 'path traversal',
				args: ['../outside.txt', '--max', '10'],
				code: 'text_budget_unreadable',
				pointer: null,
			},
			{
				name: 'json parse failure',
				args: ['bad-json.json', '--json-pointer', '/description', '--max', '10'],
				code: 'text_budget_json_parse_failed',
				pointer: '/description',
			},
			{
				name: 'invalid json pointer',
				args: ['data.json', '--json-pointer', 'description', '--max', '10'],
				code: 'text_budget_json_pointer_invalid',
				pointer: 'description',
			},
			{
				name: 'missing json pointer',
				args: ['data.json', '--json-pointer', '/missing', '--max', '10'],
				code: 'text_budget_json_pointer_missing',
				pointer: '/missing',
			},
			{
				name: 'non-string json pointer target',
				args: ['data.json', '--json-pointer', '/count', '--max', '10'],
				code: 'text_budget_json_pointer_not_string',
				pointer: '/count',
			},
		];

		for (const testCase of cases) {
			const { result, report } = runTextBudgetJson(projectPath, testCase.args);

			assert.equal(result.status, 1, `${testCase.name}: ${result.stderr || result.stdout}`);
			assert.equal(report.status, 'error', testCase.name);
			assert.equal(report.ok, false, testCase.name);
			assert.equal(report.findings[0].code, testCase.code, testCase.name);
			assert.equal(report.findings[0].severity, 'high', testCase.name);
			assert.equal(report.findings[0].json_pointer, testCase.pointer, testCase.name);
			assert.equal(report.findings[0].metric, null, testCase.name);
			assert.equal(report.findings[0].actual, null, testCase.name);
			assert.equal(report.findings[0].expected, null, testCase.name);
			assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u, testCase.name);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget checks every public counting unit', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		writeFileSync(path.join(projectPath, 'units.txt'), 'a😊\n');

		const cases = [
			['code-point', 3],
			['utf16', 4],
			['utf8-byte', 6],
			['line', 2],
		];

		for (const [unit, expected] of cases) {
			const { result, report } = runTextBudgetJson(projectPath, [
				'units.txt',
				'--exact',
				String(expected),
				'--unit',
				unit,
			]);

			assert.equal(result.status, 0, `${unit}: ${result.stderr || result.stdout}`);
			assert.equal(report.status, 'passed', unit);
			assert.equal(report.metrics[0].unit, unit);
			assert.equal(report.metrics[0].value, expected);
		}
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget rejects calls without a declared budget', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'docs'));
		writeFileSync(path.join(projectPath, 'docs', 'intro.md'), 'hello');

		const result = runCli(projectPath, ['script-pack', 'run', 'core/text-budget', 'check', 'docs/intro.md']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.match(result.stderr, /Declare at least one text budget/u);
		assert.equal(result.stdout, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary passes ordinary editable files', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runGeneratedBoundaryJson(projectPath, ['AGENTS.md']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.pack_id, 'repo');
		assert.equal(report.script_id, 'generated-boundary');
		assert.equal(report.script_ref, 'repo/generated-boundary');
		assert.equal(report.status, 'passed');
		assert.equal(report.ok, true);
		assert.equal(report.policy.config_loaded, true);
		assert.equal(report.targets[0].path, 'AGENTS.md');
		assert.deepEqual(report.targets[0].matched_boundaries, []);
		assert.match(report.input_hash, /^sha256:[a-f0-9]{64}$/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary reports generated manifest-lock paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runGeneratedBoundaryJson(projectPath, ['.mustflow/config/manifest.lock.toml']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.equal(report.targets[0].path, '.mustflow/config/manifest.lock.toml');
		assert.ok(report.targets[0].matched_boundaries.includes('generated'));
		assert.ok(report.findings.some((finding) => finding.code === 'generated_boundary_generated_path'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary reports vendor paths', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		mkdirSync(path.join(projectPath, 'node_modules'));
		writeFileSync(path.join(projectPath, 'node_modules', 'example.js'), 'module.exports = 1;\n');

		const { result, report } = runGeneratedBoundaryJson(projectPath, ['node_modules/example.js']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'failed');
		assert.equal(report.ok, false);
		assert.ok(report.targets[0].matched_boundaries.includes('vendor'));
		assert.ok(report.findings.some((finding) => finding.code === 'generated_boundary_vendor_path'));
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest ranks helpers from path, skill, and phase evidence', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const { result, report } = runScriptPackSuggestJson(projectPath, [
			'--path',
			'.mustflow/config/manifest.lock.toml',
			'--skill',
			'template-install-surface-sync',
			'--phase',
			'before_change',
		]);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.command, 'script-pack');
		assert.equal(report.action, 'suggest');
		assert.equal(report.status, 'suggested');
		assert.equal(report.ok, true);
		assert.deepEqual(report.input.phases, ['before_change']);
		assert.deepEqual(report.input.skills, ['template-install-surface-sync']);
		assert.equal(report.input.paths[0], '.mustflow/config/manifest.lock.toml');
		assert.ok(report.analyzed_paths[0].surfaces.includes('generated'));
		assert.ok(report.analyzed_paths[0].surfaces.includes('config'));

		const [first] = report.suggestions;
		assert.equal(first.script_ref, 'repo/generated-boundary');
		assert.equal(first.read_only, true);
		assert.equal(first.mutates, false);
		assert.equal(first.network, false);
		assert.ok(first.matched_phases.includes('before_change'));
		assert.ok(first.matched_skills.includes('template-install-surface-sync'));
		assert.ok(first.matched_surfaces.includes('generated'));
		assert.equal(first.report_schema_file, 'generated-boundary-report.schema.json');
		assert.match(first.run_hint, /repo\/generated-boundary/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest can use current changed files without running scripts', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		commitGitBaseline(projectPath);
		writeFileSync(path.join(projectPath, 'README.md'), 'updated readme\n');
		const { result, report } = runScriptPackSuggestJson(projectPath, ['--changed', '--phase', 'after_change']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.equal(report.input.changed, true);
		assert.ok(report.input.paths.includes('README.md'));
		assert.ok(report.analyzed_paths.some((entry) => entry.path === 'README.md' && entry.surfaces.includes('docs')));
		assert.ok(report.suggestions.some((suggestion) => suggestion.script_ref === 'core/text-budget'));
		assert.equal(report.issues.length, 0);
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack suggest rejects missing and unknown selection inputs', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const missing = runCli(projectPath, ['script-pack', 'suggest']);
		assert.equal(missing.status, 1, missing.stderr || missing.stdout);
		assert.match(missing.stderr, /Provide at least one suggestion input/u);

		const unknownPhase = runCli(projectPath, ['script-pack', 'suggest', '--phase', 'before']);
		assert.equal(unknownPhase.status, 1, unknownPhase.stderr || unknownPhase.stdout);
		assert.match(unknownPhase.stderr, /Unknown script-pack phase: before/u);
	} finally {
		removeTempProject(projectPath);
	}
});

test('generated-boundary treats outside-root paths as errors', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const outsidePath = path.join(projectPath, '..', 'outside.txt');
		const { result, report } = runGeneratedBoundaryJson(projectPath, [outsidePath]);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.equal(report.status, 'error');
		assert.equal(report.ok, false);
		assert.equal(report.findings[0].code, 'generated_boundary_path_outside_root');
		assert.equal(report.findings[0].boundary, 'outside_root');
	} finally {
		removeTempProject(projectPath);
	}
});

test('script-pack run help does not treat --help as a script ref', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['script-pack', 'run', '--help']);

		assert.equal(result.status, 0, result.stderr || result.stdout);
		assert.match(result.stdout, /Usage: mf script-pack/);
		assert.match(result.stdout, /mf script-pack suggest --path src\/cli\/index\.ts --phase before_change/);
		assert.match(result.stdout, /mf script-pack run code\/outline scan src --json/);
		assert.match(result.stdout, /mf script-pack run code\/symbol-read read src\/cli\/index\.ts --start-line 25 --json/);
		assert.match(result.stdout, /mf script-pack run core\/text-budget --help/);
		assert.match(result.stdout, /mf script-pack run repo\/generated-boundary check src\/cli\/index\.ts --json/);
		assert.equal(result.stderr, '');
	} finally {
		removeTempProject(projectPath);
	}
});

test('text-budget is not exposed as a top-level command', () => {
	const projectPath = createTempProject();

	try {
		initProject(projectPath);
		const result = runCli(projectPath, ['text-budget', 'check', 'README.md', '--max', '100']);

		assert.equal(result.status, 1, result.stderr || result.stdout);
		assert.match(result.stderr, /Unknown command: text-budget/u);
	} finally {
		removeTempProject(projectPath);
	}
});
