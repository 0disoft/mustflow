import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('../..', import.meta.url)));
const cliPath = path.join(projectRoot, 'dist', 'cli', 'index.js');

function createTempProject() {
	return mkdtempSync(path.join(tmpdir(), 'mustflow-init-'));
}

function removeTempProject(projectPath) {
	rmSync(projectPath, { recursive: true, force: true });
}

function runInit(cwd, args = ['--yes'], options = {}) {
	return spawnSync(process.execPath, [cliPath, 'init', ...args], {
		cwd,
		encoding: 'utf8',
		...options,
	});
}

function readText(filePath) {
	return readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
}

test('copies the default agent workflow into an empty project', () => {
	const projectPath = createTempProject();

	try {
		const result = runInit(projectPath);

		assert.equal(result.status, 0);
		assert.match(result.stdout, /Created AGENTS\.md/);
		assert.ok(existsSync(path.join(projectPath, 'AGENTS.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'commands.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'config', 'technology.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'context', 'INDEX.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'context', 'PROJECT.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'docs', 'agent-workflow.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'INDEX.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'router.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'routes.toml')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'code-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'database-change-safety', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'source-anchor-authoring', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'test-design-guard', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'test-maintenance', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'vertical-slice-tdd', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'version-freshness-check', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'security-flow-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'module-boundary-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'change-blast-radius-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'business-rule-leakage-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'payment-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'credit-ledger-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'api-misuse-resistance-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'api-access-control-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'file-upload-security-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'error-message-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'memory-lifetime-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'desktop-memory-footprint-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'hot-path-performance-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'api-request-performance-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'web-render-performance-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'core-web-vitals-field-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'image-delivery-performance-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'client-bundle-pruning-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'frame-render-performance-review', 'SKILL.md')));
		assert.ok(
			existsSync(
				path.join(projectPath, '.mustflow', 'skills', 'desktop-background-process-stability-review', 'SKILL.md'),
			),
		);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'desktop-auto-update-safety-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'frontend-state-ownership-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'frontend-stress-layout-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'frontend-accessibility-tree-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'frontend-localization-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'cache-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'quadratic-scan-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'type-state-modeling-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'race-condition-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'concurrency-invariant-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'failure-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'idempotency-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'observability-debuggability-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'incident-triage-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'deployment-rollout-safety-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'retry-policy-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'queue-processing-integrity-review', 'SKILL.md')));
		assert.ok(
			existsSync(path.join(projectPath, '.mustflow', 'skills', 'transaction-boundary-integrity-review', 'SKILL.md')),
		);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'testability-boundary-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'database-query-bottleneck-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'database-json-modeling-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'deletion-lifecycle-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'database-lock-contention-review', 'SKILL.md')));
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'docs-prose-review', 'SKILL.md')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'external-skill-intake', 'SKILL.md')), false);
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'skills', 'multi-agent-work-coordination', 'SKILL.md')),
			false,
		);
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'skills', 'project-context-authoring', 'SKILL.md')),
			false,
		);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'readme-authoring', 'SKILL.md')), false);
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'skills', 'search-ad-content-authoring', 'SKILL.md')),
			false,
		);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'skill-authoring', 'SKILL.md')), false);
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'skills', 'frontend-render-stability', 'SKILL.md')),
			false,
		);
		assert.equal(
			existsSync(path.join(projectPath, '.mustflow', 'skills', 'service-boundary-architecture', 'SKILL.md')),
			false,
		);
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'backend-reliability-change', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'backend-log-evidence-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'prompt-contract-quality-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'llm-hallucination-control-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'llm-token-cost-control-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'llm-response-latency-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'agent-execution-control-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'agent-eval-integrity-review', 'SKILL.md')));
		assert.ok(existsSync(path.join(projectPath, '.mustflow', 'skills', 'support-surface-advisor', 'SKILL.md')));
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'llm-service-ux-review', 'SKILL.md')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'ui-quality-gate', 'SKILL.md')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'visual-review-artifact', 'SKILL.md')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'web-asset-optimization', 'SKILL.md')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'skills', 'test-authoring', 'SKILL.md')), false);
		assert.ok(existsSync(path.join(projectPath, '.gitignore')));
		assert.equal(existsSync(path.join(projectPath, 'README.md')), false);
		assert.equal(existsSync(path.join(projectPath, 'DESIGN.md')), false);
		assert.equal(existsSync(path.join(projectPath, 'ROADMAP.md')), false);
		assert.equal(existsSync(path.join(projectPath, 'schemas')), false);
		assert.equal(existsSync(path.join(projectPath, '.mustflow', 'schemas')), false);
		assert.equal(existsSync(path.join(projectPath, 'REPO_MAP.md')), false);

		const gitignore = readText(path.join(projectPath, '.gitignore'));
		assert.match(gitignore, /# mustflow:start schema=1/);
		assert.match(gitignore, /\.mustflow\/cache\//);
		assert.match(gitignore, /\.mustflow\/state\//);
		assert.match(gitignore, /\.mustflow\/backups\//);
		assert.match(gitignore, /\.mustflow\/worklogs\//);
		assert.match(gitignore, /\.mustflow\/plans\//);
		assert.match(gitignore, /\.mustflow\/tasks\//);
		assert.match(gitignore, /\.mustflow\/work-items\//);
		assert.doesNotMatch(gitignore, /^repos\//m);

		const preferences = readFileSync(path.join(projectPath, '.mustflow', 'config', 'preferences.toml'), 'utf8');
		assert.match(preferences, /\[project\]/);
		assert.match(preferences, /convention_mode = "bootstrap"/);
		assert.match(preferences, /\[language\.code_comments\]/);
		assert.match(preferences, /\[language\.memory\]/);
		assert.match(preferences, /summary = "agent_response"/);
		assert.match(preferences, /fallback = "en"/);
		assert.match(preferences, /auto_stage = false/);
		assert.match(preferences, /\[git\.commit_message\]/);
		assert.match(preferences, /suggest = "when_changes_made"/);
		assert.match(preferences, /\[reporting\.commit_suggestion\]/);
		assert.match(preferences, /\[testing\.authoring\]/);
		assert.match(preferences, /new_test_policy = "evidence_required"/);
		assert.match(preferences, /prefer_existing_tests = true/);

		const technology = readFileSync(path.join(projectPath, '.mustflow', 'config', 'technology.toml'), 'utf8');
		assert.match(technology, /schema_version = "1"/);
		assert.match(technology, /low-authority hints/);
		assert.match(technology, /authority = "hint"/);

		const commands = readFileSync(path.join(projectPath, '.mustflow', 'config', 'commands.toml'), 'utf8');
		assert.match(commands, /\[intents\.mustflow_doctor\]/);
		assert.match(commands, /argv = \["mf", "doctor", "--json"\]/);
		assert.match(commands, /\[intents\.prompt_cache_audit\]/);
		assert.match(commands, /argv = \["mf", "context", "--json", "--cache-profile", "all", "--cache-audit"\]/);
		assert.match(commands, /\[intents\.mustflow_update_dry_run\]/);
		assert.match(commands, /argv = \["mf", "update", "--dry-run", "--json"\]/);
		assert.match(commands, /\[intents\.mustflow_update_apply\]/);
		assert.match(commands, /argv = \["mf", "update", "--apply", "--json"\]/);
		assert.match(commands, /\[intents\.changes_status\]/);
		assert.match(commands, /argv = \["git", "status", "--short"\]/);
		assert.match(commands, /\[intents\.changes_diff_summary\]/);
		assert.match(commands, /\[intents\.test\][\s\S]*?status = "configured"/);
		assert.match(commands, /\[intents\.test\][\s\S]*?argv = \["bun", "test"\]/);
		assert.match(commands, /\[intents\.test_related\]/);
		assert.match(commands, /\[intents\.test_related\][\s\S]*?status = "configured"/);
		assert.match(commands, /\[intents\.test_related\][\s\S]*?argv = \["bun", "test"\]/);
		assert.match(commands, /\[intents\.test_fast\][\s\S]*?status = "configured"/);
		assert.match(commands, /\[intents\.test_fast\][\s\S]*?argv = \["bun", "test"\]/);
		assert.match(commands, /\[intents\.test_audit\]/);
		assert.match(commands, /\[intents\.snapshot_update\]/);
		assert.match(commands, /\[intents\.asset_optimize\]/);
		assert.match(commands, /required_after = \["image_asset_change", "web_asset_change"\]/);
		assert.match(commands, /\[intents\.git_commit\]/);
		assert.match(commands, /status = "manual_only"/);

		const skillsIndex = readText(path.join(projectPath, '.mustflow', 'skills', 'INDEX.md'));
		assert.match(skillsIndex, /## Route Category Gate/);
		assert.match(skillsIndex, /### General Code Change/);
		assert.match(skillsIndex, /### Tests and Regression/);
		assert.match(skillsIndex, /### Architecture Patterns/);
		assert.match(skillsIndex, /\| UI and Assets \|/);
		assert.match(skillsIndex, /### UI and Assets/);
		assert.match(skillsIndex, /\.mustflow\/skills\/code-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/database-change-safety\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/database-query-bottleneck-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/database-json-modeling-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/deletion-lifecycle-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/database-lock-contention-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/cache-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/security-flow-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/module-boundary-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/change-blast-radius-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/business-rule-leakage-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/payment-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/credit-ledger-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/api-misuse-resistance-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/api-access-control-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/file-upload-security-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/error-message-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/desktop-memory-footprint-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/api-request-performance-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/race-condition-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/concurrency-invariant-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/failure-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/idempotency-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/backend-log-evidence-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/observability-debuggability-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/incident-triage-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/deployment-rollout-safety-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/retry-policy-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/queue-processing-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/transaction-boundary-integrity-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/testability-boundary-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/test-design-guard\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/type-state-modeling-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/web-render-performance-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/core-web-vitals-field-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/image-delivery-performance-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/client-bundle-pruning-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/frame-render-performance-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/desktop-background-process-stability-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/desktop-auto-update-safety-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/frontend-state-ownership-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/frontend-stress-layout-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/frontend-accessibility-tree-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/frontend-localization-review\/SKILL\.md/);
		assert.match(skillsIndex, /\.mustflow\/skills\/vertical-slice-tdd\/SKILL\.md/);

		const skillRoutes = readText(path.join(projectPath, '.mustflow', 'skills', 'routes.toml'));
		assert.match(skillRoutes, /\[routes\."code-review"\]/);
		assert.match(skillRoutes, /category = "general_code"/);
		assert.match(skillRoutes, /\[routes\."desktop-memory-footprint-review"\]/);
		assert.match(skillRoutes, /\[routes\."api-request-performance-review"\]/);
		assert.match(skillRoutes, /\[routes\."web-render-performance-review"\]/);
		assert.match(skillRoutes, /\[routes\."core-web-vitals-field-review"\]/);
		assert.match(skillRoutes, /\[routes\."image-delivery-performance-review"\]/);
		assert.match(skillRoutes, /\[routes\."client-bundle-pruning-review"\]/);
		assert.match(skillRoutes, /\[routes\."frame-render-performance-review"\]/);
		assert.match(skillRoutes, /\[routes\."desktop-background-process-stability-review"\]/);
		assert.match(skillRoutes, /\[routes\."desktop-auto-update-safety-review"\]/);
		assert.match(skillRoutes, /\[routes\."frontend-state-ownership-review"\]/);
		assert.match(skillRoutes, /\[routes\."frontend-stress-layout-review"\]/);
		assert.match(skillRoutes, /\[routes\."frontend-accessibility-tree-review"\]/);
		assert.match(skillRoutes, /\[routes\."frontend-localization-review"\]/);
		assert.match(skillRoutes, /\[routes\."idempotency-integrity-review"\]/);
		assert.match(skillRoutes, /\[routes\."backend-log-evidence-review"\]/);
		assert.match(skillRoutes, /\[routes\."observability-debuggability-review"\]/);
		assert.match(skillRoutes, /\[routes\."incident-triage-review"\]/);
		assert.match(skillRoutes, /\[routes\."deployment-rollout-safety-review"\]/);
		assert.match(skillRoutes, /\[routes\."retry-policy-integrity-review"\]/);
		assert.match(skillRoutes, /\[routes\."queue-processing-integrity-review"\]/);
		assert.match(skillRoutes, /\[routes\."transaction-boundary-integrity-review"\]/);
		assert.match(skillRoutes, /\[routes\."database-json-modeling-review"\]/);
		assert.match(skillRoutes, /\[routes\."deletion-lifecycle-review"\]/);
		assert.match(skillRoutes, /\[routes\."database-lock-contention-review"\]/);
		assert.doesNotMatch(skillRoutes, /\[routes\."architecture-deepening-review"\]/);
		assert.doesNotMatch(skillRoutes, /\[routes\."web-asset-optimization"\]/);

		const mustflowConfig = readText(path.join(projectPath, '.mustflow', 'config', 'mustflow.toml'));
		assert.match(mustflowConfig, /optional_read_order = \[\n  "\.mustflow\/context\/INDEX\.md",/);
		assert.match(mustflowConfig, /"\.mustflow\/config\/technology\.toml"/);
		assert.match(mustflowConfig, /\[context\]/);
		assert.match(mustflowConfig, /root = "\.mustflow\/context"/);
		assert.match(mustflowConfig, /read_policy = "task_relevant_only"/);
		assert.match(mustflowConfig, /authority = "contextual"/);
		assert.match(mustflowConfig, /"ROADMAP\.md"/);
		assert.match(mustflowConfig, /\[testing\]/);
		assert.match(mustflowConfig, /policy = "behavior_contract"/);
		assert.match(mustflowConfig, /stale_test_action = "update_remove_or_report"/);
		assert.match(mustflowConfig, /turn_threshold = 8/);
		assert.match(mustflowConfig, /tool_call_threshold = 16/);
		assert.match(mustflowConfig, /output_bytes_threshold = 100000/);
		assert.match(mustflowConfig, /\[refresh\.levels\.edit\]/);
		assert.match(mustflowConfig, /\[refresh\.levels\.report\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.recent\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.mid\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.long\]/);
		assert.doesNotMatch(mustflowConfig, /\[compaction\.raw_retention\]/);
		assert.match(mustflowConfig, /max_iterations = 6/);
		assert.match(mustflowConfig, /max_wall_clock_minutes = 60/);
		assert.match(mustflowConfig, /max_command_runs = 20/);
		assert.match(mustflowConfig, /max_total_output_mb = 8/);
		assert.match(mustflowConfig, /max_failures_per_intent = 2/);
		assert.match(mustflowConfig, /on_limit = "stop_and_report"/);
		assert.match(mustflowConfig, /\[retention\.run_receipts\]\nstore = "repo_local_ignored"/);
		assert.match(mustflowConfig, /\[retention\.knowledge\]\nenabled = false\nstore = "repo_local_ignored"/);
		assert.match(mustflowConfig, /\[retention\.handoffs\]\nstore = "repo_local_ignored"/);
		assert.doesNotMatch(mustflowConfig, /store = "project"/);

		const lock = readFileSync(path.join(projectPath, '.mustflow', 'config', 'manifest.lock.toml'), 'utf8');
		assert.match(lock, /schema_version = "1"/);
		assert.match(lock, /\[template\]/);
		assert.match(lock, /id = "default"/);
		assert.match(lock, /profile = "minimal"/);
		assert.match(lock, /locale = "en"/);
		assert.match(lock, /\[files\."AGENTS\.md"\]/);
		assert.match(lock, /last_action = "created"/);
		assert.match(lock, /content_hash = "sha256:[a-f0-9]{64}"/);
		assert.doesNotMatch(lock, /\[files\."\.gitignore"\]/);

		const agents = readFileSync(path.join(projectPath, 'AGENTS.md'), 'utf8');
		assert.match(agents, /mf doctor/);
		assert.match(agents, /locale: en/);
		assert.match(agents, /auto_bump = true/);
		assert.match(agents, /require_user_confirmation = false/);
		assert.doesNotMatch(agents, /Do not change version files unless the user explicitly requests/);
	} finally {
		removeTempProject(projectPath);
	}
});
