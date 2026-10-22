import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { createChangeClassificationReport } from '../../dist/core/change-classification.js';
import { createChangeVerificationReport } from '../../dist/core/change-verification.js';
import { createClassifyOutput } from '../../dist/cli/commands/classify.js';
import { readInputFromClassificationReport } from '../../dist/cli/commands/verify/input.js';

function contract(intents = {}) {
	return {
		defaults: {},
		intents: {
			check: {
				status: 'configured', lifecycle: 'oneshot', run_policy: 'agent_allowed',
				description: 'Check changes', argv: [process.execPath, '-e', ''], cwd: '.',
				timeout_seconds: 10, stdin: 'closed', success_exit_codes: [0], writes: [],
				network: false, destructive: false,
				required_after: ['code_change', 'security_change', 'migration_change', 'business_change'],
			},
			...intents,
		},
	};
}

test('ordinary code, authentication and migrations have path-based risk independent of source layout', () => {
	for (const [file, expected] of [
		['src/button.ts', 'medium'], ['app/button.ts', 'medium'],
		['src/auth/session.ts', 'high'], ['app/auth/session.ts', 'high'],
		['packages/accounts/src/auth/session.ts', 'high'], ['services/orders/migrations/001.sql', 'critical'],
		['migrations/001.sql', 'critical'],
	]) {
		const classification = createChangeClassificationReport('paths', [file]);
		const report = createChangeVerificationReport(classification, contract(), tmpdir());
		assert.equal(report.risk_assessment.level, expected, file);
	}
});

test('project rules declare reasons and risk without weakening built-in security rules', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-project-risk-'));
	try {
		mkdirSync(path.join(root, '.mustflow', 'config'), { recursive: true });
		writeFileSync(path.join(root, '.mustflow', 'config', 'mustflow.toml'), `
[[classification.rules]]
id = "payroll"
paths = ["services/payroll/**"]
reasons = ["business_change"]
risk = "high"

[[classification.rules]]
id = "ordinary"
paths = ["**/auth/**"]
reasons = ["code_change"]
risk = "low"
`);
		const classification = createClassifyOutput(root, 'paths', ['services/payroll/run.ts']);
		assert.equal(classification.classifications[0].surface.riskLevel, 'high');
		assert.match(classification.classifications[0].surface.kind, /payroll/u);
		assert.ok(classification.summary.validationReasons.includes('business_change'));
		assert.equal(createChangeVerificationReport(classification, contract(), root).risk_assessment.level, 'high');
		writeFileSync(path.join(root, 'classification.json'), JSON.stringify(classification));
		const restored = readInputFromClassificationReport(root, 'classification.json');
		assert.equal(createChangeVerificationReport(restored.classificationReport, contract(), root).risk_assessment.level, 'high');
		const authentication = createClassifyOutput(root, 'paths', ['app/auth/session.ts']);
		assert.equal(authentication.classifications[0].surface.riskLevel, 'high');
		assert.ok(authentication.summary.validationReasons.includes('security_change'));
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test('invalid project classification rules stop classification instead of lowering risk', () => {
	const root = mkdtempSync(path.join(tmpdir(), 'mustflow-invalid-risk-'));
	try {
		mkdirSync(path.join(root, '.mustflow', 'config'), { recursive: true });
		writeFileSync(path.join(root, '.mustflow', 'config', 'mustflow.toml'), `
[[classification.rules]]
id = "invalid"
paths = ["../outside/**"]
reasons = ["code_change"]
risk = "low"
`);
		assert.throws(() => createClassifyOutput(root, 'paths', ['src/button.ts']), /invalid_classification_rule/u);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});
