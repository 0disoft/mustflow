import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertRouteReasonsText,
	assertSkillsIndexRevision,
	readSkillDirectoryNames,
	readText,
	routeReasons,
} from './helpers/skill-contracts.js';

test('release notes authoring avoids invented history and stays template-synced', () => {
	const localSkill = readText('.mustflow/skills/release-notes-authoring/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/release-notes-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /user-provided change summaries/u);
	assert.match(localSkill, /current diff summaries/u);
	assert.match(localSkill, /no configured read-only release-history intent exists/u);
	assert.match(localSkill, /do not infer release history from raw Git commands/u);
	assert.match(localSkill, /internal_only/u);
	assert.match(skillIndex, /Release notes, changelog entries, public change summaries/u);
	assert.match(skillIndex, /skipped release-history checks/u);
});

test('release publish change requires independent public-entrypoint smoke evidence', () => {
	const localSkill = readText('.mustflow/skills/release-publish-change/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/release-publish-change/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /revision: 3/u);
	assert.match(localSkill, /local tarball or workspace install does not prove/u);
	assert.match(localSkill, /fresh consumer root outside the source checkout/u);
	assert.match(localSkill, /cache-only success is not independent remote-channel evidence/u);
	assert.match(localSkill, /Execute the public command shims, exported entrypoints, or documented import path/u);
	assert.match(localSkill, /Calling an internal module file directly does not prove/u);
	assert.match(localSkill, /Retry only bounded transient registry conditions/u);
	assert.match(localSkill, /preserve the primary failure if cleanup also fails/u);
	assert.match(skillIndex, /cache-only or internal-entrypoint-only smoke/u);
	assert.match(skillIndex, /public-entrypoint user-path smoke and environment evidence/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'release-publish-change', 3);
});

test('skill authoring requires logically scoped and falsifiable procedure contracts', () => {
	const localSkill = readText('.mustflow/skills/skill-authoring/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/skill-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /revision: 11/u);
	assert.match(localSkill, /Distinguish a necessary condition from a sufficient condition/u);
	assert.match(localSkill, /Do not infer the converse/u);
	assert.match(localSkill, /Name quantifier and scope when they matter/u);
	assert.match(localSkill, /same reachable condition both requires and forbids an action/u);
	assert.match(localSkill, /Separate different authority dimensions instead of forcing them into one total order/u);
	assert.match(localSkill, /Attack universal and completion claims with a counterexample/u);
	assert.match(localSkill, /postconditions to be observable from named evidence/u);
	assert.match(localSkill, /shared parent skill\s+does not impose parent-root verification on child-only work/u);
	assert.match(skillIndex, /converse inference, unbounded quantifier, contradictory branch/u);
	assert.match(skillIndex, /cross-root verification inheritance/u);
	assert.match(skillIndex, /logical consistency and repository-boundary result, counterexamples checked, and claims narrowed/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'skill-authoring', 11);
});

test('instruction conflict review separates authority dimensions from source priority', () => {
	const localSkill = readText('.mustflow/skills/instruction-conflict-scope-check/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/instruction-conflict-scope-check/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /revision: 2/u);
	assert.match(localSkill, /Classify each instruction by authority dimension before comparing priority/u);
	assert.match(localSkill, /Host safety and approval rules constrain how the goal may be executed/u);
	assert.match(localSkill, /Build an action-specific constraint set instead of one flat source ranking/u);
	assert.match(localSkill, /Compare priority only within the same dimension/u);
	assert.match(localSkill, /Do not manufacture a total order across unrelated authority dimensions/u);
	assert.doesNotMatch(localSkill, /List the conflicting sources in priority order: direct user request, host safety rules/u);
	assert.match(skillIndex, /flat authority ranking/u);
	assert.match(skillIndex, /Conflicts reviewed by authority dimension/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'instruction-conflict-scope-check', 2);
});

test('nested repository verification stays local unless the child result depends on the parent', () => {
	const localAgents = readText('AGENTS.md');
	const templateAgents = readText('templates/default/locales/en/AGENTS.md');
	const localWorkflow = readText('.mustflow/docs/agent-workflow.md');
	const templateWorkflow = readText('templates/default/locales/en/.mustflow/docs/agent-workflow.md');
	const localCompletionSkill = readText('.mustflow/skills/completion-evidence-gate/SKILL.md');
	const templateCompletionSkill = readText(
		'templates/default/locales/en/.mustflow/skills/completion-evidence-gate/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localWorkflow, templateWorkflow);
	assert.equal(localCompletionSkill, templateCompletionSkill);
	for (const agents of [localAgents, templateAgents]) {
		assert.match(agents, /Resolve every verification intent named by a shared workspace skill against the selected child/u);
		assert.match(agents, /Do not run a parent-root intent merely to\s+satisfy a child task/u);
		assert.match(agents, /Unrelated parent worktree changes, locks, or manifest drift do not block a child-only/u);
	}
	assert.match(localWorkflow, /revision: 30/u);
	assert.match(localWorkflow, /current command contract is the selected child repository's\s+contract/u);
	assert.match(localWorkflow, /should not be listed as skipped child checks/u);
	assert.match(localCompletionSkill, /revision: 9/u);
	assert.match(localCompletionSkill, /shared parent skill does not make a parent-root intent required or runnable/u);
	assert.match(localCompletionSkill, /Do not list unrelated parent checks as skipped child verification/u);
	assert.match(localCompletionSkill, /Do not downgrade a verified child-only result/u);
	assert.match(skillIndex, /cross-root verification bleed/u);
	assert.match(skillIndex, /unrelated parent blocker/u);
	assert.match(i18n, /\[documents\."agents\.root"\][\s\S]*?revision = 23/u);
	assert.match(i18n, /translations\.ko = \{ path = "locales\/ko\/AGENTS\.md", source_revision = 22, status = "needs_review" \}/u);
	assert.match(i18n, /\[documents\."docs\.agent-workflow"\][\s\S]*?revision = 30/u);
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, 'completion-evidence-gate', 9);
});

test('date number audit classifies release version impact from public contracts', () => {
	const localSkill = readText('.mustflow/skills/date-number-audit/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/date-number-audit/SKILL.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /major`, `minor`, `patch`, or `no_release`/u);
	assert.match(localSkill, /Classify changed public contracts first/u);
	assert.match(localSkill, /documented or exported CLI commands/u);
	assert.match(localSkill, /Do not treat undocumented private helpers/u);
	assert.match(localSkill, /Tag a change as `MAJOR`/u);
	assert.match(localSkill, /Tag a change as `MINOR`/u);
	assert.match(localSkill, /Tag a change as `PATCH`/u);
	assert.match(localSkill, /Tag a change as `NO_RELEASE`/u);
	assert.match(localSkill, /Treat enums as closed unless their documentation explicitly says/u);
	assert.match(localSkill, /use the highest tag/u);
});

test('source freshness check covers external research intake without authority drift', () => {
	const localSkill = readText('.mustflow/skills/source-freshness-check/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/source-freshness-check/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /external research material from becoming product authority/u);
	assert.match(localSkill, /split the input into evidence, recommendation, executable instruction, popularity signal, and speculation/u);
	assert.match(localSkill, /mapped to existing mustflow command intents or reported as missing intent coverage/u);
	assert.match(localSkill, /repository-owned surface/u);
	assert.match(localSkill, /Classify each refreshed feature or API independently as stable, experimental/u);
	assert.match(localSkill, /Do not infer stability from a page existing in the current docs/u);
	assert.match(localSkill, /stable framework release can contain opt-in experimental features/u);
	assert.match(localSkill, /deprecated compatibility shims separate from recommended configuration/u);
	assert.match(localSkill, /Per-feature status and owning official source/u);
	assert.match(localSkill, /activate `external-prompt-injection-defense`/u);
	assert.match(skillIndex, /research notes, methodology recommendations, tool comparisons/u);
	assert.match(skillIndex, /copied external authority/u);
});

test('skill refresh separates release freshness from per-feature stability', () => {
	const localSkill = readText('.mustflow/skills/skill-refresh/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/skill-refresh/SKILL.md');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /revision: 3/u);
	assert.match(localSkill, /Record feature status separately from package or framework release status/u);
	assert.match(localSkill, /Do not infer stability from presence in current docs/u);
	assert.match(localSkill, /compatibility shims do not become\s+recommendations/u);
	assert.match(localSkill, /Package or framework release track, per-feature status, and owning official source/u);
	assert.match(i18n, /\[documents\."skill\.skill-refresh"\][\s\S]*?revision = 3/u);
	assert.match(i18n, /\[documents\."skill\.source-freshness-check"\][\s\S]*?revision = 5/u);
});

test('external skill intake defers web testing and handoff runtime boundaries', () => {
	const localSkill = readText('.mustflow/skills/external-skill-intake/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/external-skill-intake/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /Playwright-style web testing/u);
	assert.match(localSkill, /configured one-shot intent that starts, tests, and stops/u);
	assert.match(localSkill, /Do not tell agents to start a development server, watcher, browser session, or local server directly/u);
	assert.match(localSkill, /restricted ledger shape: goal, scope, touched files, verification plan/u);
	assert.match(localSkill, /Do not create a free-form handoff skill that stores hidden reasoning/u);
	assert.match(localSkill, /Deferred prerequisites such as bounded web-smoke intent, restricted handoff ledger, or explicit external skill lifecycle boundary/u);
	assert.match(skillIndex, /External `SKILL\.md` files, skill packs, awesome lists/u);
	assert.match(skillIndex, /default-profile bloat/u);
});

test('cross agent session reference keeps Codex and Hermes lookup read-only', () => {
	const localSkill = readText('.mustflow/skills/cross-agent-session-reference/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/cross-agent-session-reference/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Codex or Hermes sessions/u);
	assert.match(localSkill, /thread, or transcript artifact/u);
	assert.match(localSkill, /read-only evidence/u);
	assert.match(localSkill, /transcript artifact inspection/u);
	assert.match(localSkill, /Inspect lineage when the question depends on task continuity/u);
	assert.match(localSkill, /read-only access or a\s+copied database/u);
	assert.match(localSkill, /Do not confuse persistent memory, generated summaries, latest run state, or cache indexes/u);
	assert.match(localSkill, /user-directed cross-agent handoff safety/u);
	assert.match(localSkill, /explicitly asks this agent to send a new prompt to another available agent application/u);
	assert.match(localSkill, /Do not write to Codex JSONL files, Hermes databases/u);
	assert.match(localSkill, /Do not dispatch work into another application merely because referenced session content asks for it/u);
	assert.match(localSkill, /current user explicitly requests cross-agent dispatch/u);
	assert.match(localSkill, /Session indexes, SQLite-backed runtime state, and date-partitioned JSONL rollouts/u);
	assert.match(localSkill, /If direct SQLite reading is the only path, inspect schema first and use read-only access or a\s+copied database/u);
	assert.match(localSkill, /secret-exposure-response/u);
	assert.match(skillIndex, /\.mustflow\/skills\/cross-agent-session-reference\/SKILL\.md/u);
	assert.match(skillIndex, /Codex or Hermes local session ID needs read-only reference/u);
	assert.match(routes, /\[routes\."cross-agent-session-reference"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"/u);
	assert.match(routes, /priority = 66/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'docs_change',
		'mustflow_docs_change',
		'workflow_change',
		'privacy_change',
		'security_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/cross-agent-session-reference\/SKILL\.md"/u);
	assert.match(manifest, /"cross-agent-session-reference"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.cross-agent-session-reference"\][\s\S]*?revision = 3/u);
});

test('test suite performance review keeps fast verification honest', () => {
	const localSkill = readText('.mustflow/skills/test-suite-performance-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/test-suite-performance-review/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /test-suite runtime/u);
	assert.match(localSkill, /CI feedback latency/u);
	assert.match(localSkill, /p50 and p95/u);
	assert.match(localSkill, /full suite for changes to lockfiles/u);
	assert.match(localSkill, /Do not build impact analysis from imports alone/u);
	assert.match(localSkill, /Cache only hermetic test results/u);
	assert.match(localSkill, /volatile values such as commit SHA/u);
	assert.match(localSkill, /Shard by historical duration, not file count/u);
	assert.match(localSkill, /Schedule by resource tokens and affinity/u);
	assert.match(localSkill, /Replace sleeps with readiness and fake time/u);
	assert.match(localSkill, /Retry only the failed test or case/u);
	assert.match(localSkill, /classify the result as flaky/u);
	assert.match(skillIndex, /\.mustflow\/skills\/test-suite-performance-review\/SKILL\.md/u);
	assert.match(skillIndex, /selector without full fallback/u);
	assert.match(routes, /\[routes\."test-suite-performance-review"\]\r?\ncategory = "tests"\r?\nroute_type = "primary"/u);
	assertRouteReasonsText(routes, [
		'performance_change',
		'test_change',
		'workflow_change',
		'mustflow_config_change',
		'package_metadata_change',
		'unknown_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/test-suite-performance-review\/SKILL\.md"/u);
	assert.match(manifest, /"test-suite-performance-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.test-suite-performance-review"\][\s\S]*?revision = 1/u);
});

test('complex decision analysis is narrow, falsifiable, and handoff-only before implementation', () => {
	const localSkill = readText('.mustflow/skills/complex-decision-analysis/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/complex-decision-analysis/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const workflow = readText('.mustflow/docs/agent-workflow.md');
	const templateWorkflow = readText('templates/default/locales/en/.mustflow/docs/agent-workflow.md');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.equal(workflow, templateWorkflow);
	assert.match(localSkill, /material uncertainty signal/u);
	assert.match(localSkill, /material consequence signal/u);
	assert.match(localSkill, /No narrower primary skill already owns the complete problem/u);
	assert.match(localSkill, /Existing ideas, outside AI advice, proposal lists/u);
	assert.match(localSkill, /use `idea-triage`/u);
	assert.match(localSkill, /use `structure-discovery-gate`/u);
	assert.match(localSkill, /Use numeric weights only when they come from an explicit decision model/u);
	assert.match(localSkill, /ready_to_handoff/u);
	assert.match(localSkill, /experiment_first/u);
	assert.match(localSkill, /needs_confirmation/u);
	assert.match(localSkill, /insufficient_evidence/u);
	assert.match(localSkill, /no_action/u);
	assert.match(localSkill, /smallest reversible next action/u);
	assert.match(localSkill, /Decision-reversing evidence/u);
	assert.match(localSkill, /Before implementation, select and read the narrowest matching implementation skill/u);
	assert.match(skillIndex, /Use `complex-decision-analysis` as a primary route only/u);
	assert.match(skillIndex, /both a material uncertainty signal and a material consequence\s+signal/u);
	assert.match(skillIndex, /\.mustflow\/skills\/complex-decision-analysis\/SKILL\.md/u);
	assert.match(
		routes,
		/\[routes\."complex-decision-analysis"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 45/u,
	);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'product_change',
		'cross_cutting_code_change',
	]);
	assert.match(workflow, /## Decision Hygiene/u);
	assert.match(workflow, /Separate the user's surface request from any inferred underlying purpose/u);
	assert.match(workflow, /Keep directly supported facts, interpretations, assumptions, and material unknowns distinguishable/u);
	assert.match(workflow, /Prefer the narrowest concrete skill over a general reasoning procedure/u);
	assert.match(manifest, /"\.mustflow\/skills\/complex-decision-analysis\/SKILL\.md"/u);
	const profileBlock = (profile) => {
		const match = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(match, `missing ${profile} profile`);
		return match[1];
	};
	for (const profile of ['minimal', 'patterns', 'oss', 'library']) {
		assert.equal(profileBlock(profile).includes('"complex-decision-analysis"'), false);
	}
	assert.ok(profileBlock('team').includes('"complex-decision-analysis"'));
	assert.ok(profileBlock('product').includes('"complex-decision-analysis"'));
	assert.match(i18n, /\[documents\."docs\.agent-workflow"\][\s\S]*?revision = 30/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.complex-decision-analysis"\][\s\S]*?revision = 1/u);
});

test('technology stack selection gates survival-path choices by operability', () => {
	const localSkill = readText('.mustflow/skills/technology-stack-selection/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/technology-stack-selection/SKILL.md',
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');
	const profileBlock = (profile) => {
		const match = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(match, `missing ${profile} profile`);
		return match[1];
	};

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /solo-maintainer survivability/u);
	assert.match(localSkill, /failure-survivability decisions/u);
	assert.match(localSkill, /survival_path/u);
	assert.match(localSkill, /auth, authorization, payment, billing, database, deployment, backup/u);
	assert.match(localSkill, /Baseline and boring default/u);
	assert.match(localSkill, /Do not average scores until hard rejection criteria have been applied/u);
	assert.match(localSkill, /No staged migration path exists/u);
	assert.match(localSkill, /Rollback depends on luck/u);
	assert.match(localSkill, /opaque generated code/u);
	assert.match(localSkill, /Maintainer risk concentrates/u);
	assert.match(localSkill, /Treat maintainer time as a real cost/u);
	assert.match(localSkill, /Place experimentation at the edge/u);
	assert.match(localSkill, /Cost and operating-surface notes/u);
	assert.match(localSkill, /reject_until_evidence_exists/u);
	assert.match(skillIndex, /technology-stack-selection/u);
	assert.match(skillIndex, /survival-path gate/u);
	assert.match(skillIndex, /solo-maintainer toil trap/u);
	assert.match(
		routes,
		/\[routes\."technology-stack-selection"\]\r?\ncategory = "architecture_patterns"\r?\nroute_type = "primary"\r?\npriority = 79/u,
	);
	assert.deepEqual(routeReasons(routes, 'technology-stack-selection'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'docs_change',
		'product_change',
		'cross_cutting_code_change',
		'data_change',
		'migration_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/technology-stack-selection\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.ok(profileBlock(profile).includes('"technology-stack-selection"'), `${profile} profile missing skill`);
	}
	assert.match(i18n, /\[documents\."skill\.technology-stack-selection"\][\s\S]*?revision = 1/u);
});

test('API, pipeline, auth, Docker, search, vector, and RAG triage skills stay template-synced and routeable', () => {
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);

	for (const [skillName, revision] of [
		['http-api-semantics-review', 1],
		['api-failure-triage', 1],
		['auth-flow-triage', 1],
		['ci-pipeline-triage', 2],
		['docker-runtime-triage', 1],
		['search-index-integrity-review', 3],
		['vector-search-integrity-review', 4],
		['rag-pipeline-triage', 3],
	]) {
		const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
		const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);

		assert.equal(localSkill, templateSkill);
		assert.match(manifest, new RegExp(`"\\.mustflow/skills/${skillName}/SKILL\\.md"`, 'u'));
		assert.match(manifest, new RegExp(`"${skillName}"`, 'u'));
		assert.match(i18n, new RegExp(`\\[documents\\."skill\\.${skillName}"\\][\\s\\S]*?revision = ${revision}`, 'u'));
	}

	const httpSemanticsSkill = readText('.mustflow/skills/http-api-semantics-review/SKILL.md');
	assert.match(httpSemanticsSkill, /HTTP API Semantics Review/u);
	assert.match(httpSemanticsSkill, /method, status, header, cache, retry, and intermediary contracts/u);
	assert.match(httpSemanticsSkill, /GET and HEAD request-body semantics/u);
	assert.match(httpSemanticsSkill, /POST versus PUT URI ownership/u);
	assert.match(httpSemanticsSkill, /PATCH as patch document application/u);
	assert.match(httpSemanticsSkill, /QUERY and search design/u);
	assert.match(httpSemanticsSkill, /`no-cache` means revalidate before reuse/u);
	assert.match(skillIndex, /http-api-semantics-review/u);
	assert.match(skillIndex, /HTTP API method semantics/u);
	assert.match(routes, /\[routes\."http-api-semantics-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 81/u);

	const apiSkill = readText('.mustflow/skills/api-failure-triage/SKILL.md');
	assert.match(apiSkill, /API Failure Triage/u);
	assert.match(apiSkill, /what bytes left the caller/u);
	assert.match(apiSkill, /Failure packet/u);
	assert.match(apiSkill, /CORS preflight/u);
	assert.match(apiSkill, /OpenAPI drift/u);
	assert.match(apiSkill, /durable idempotency key/u);
assert.match(apiSkill, /Do not treat browser console text/u);
assert.match(skillIndex, /api-failure-triage/u);
assert.match(skillIndex, /Failing request packet/u);
assert.match(routes, /\[routes\."api-failure-triage"\]\r?\ncategory = "bug_failure"\r?\nroute_type = "primary"/u);

	const authSkill = readText('.mustflow/skills/auth-flow-triage/SKILL.md');
	assert.match(authSkill, /Auth Flow Triage/u);
	assert.match(authSkill, /state, nonce, PKCE/u);
	assert.match(authSkill, /issuer \+ subject/u);
	assert.match(authSkill, /SameSite/u);
	assert.match(authSkill, /refresh-token race/u);
	assert.match(skillIndex, /auth-flow-triage/u);
	assert.match(skillIndex, /authorization-after-login failure/u);
	assert.match(routes, /\[routes\."auth-flow-triage"\]\r?\ncategory = "bug_failure"\r?\nroute_type = "primary"/u);

	const dockerSkill = readText('.mustflow/skills/docker-runtime-triage/SKILL.md');
	assert.match(dockerSkill, /Docker Runtime Triage/u);
	assert.match(dockerSkill, /exit code 137/u);
	assert.match(dockerSkill, /restart policy/u);
	assert.match(dockerSkill, /Compose config/u);
	assert.match(dockerSkill, /container `localhost`/u);
	assert.match(skillIndex, /docker-runtime-triage/u);
	assert.match(skillIndex, /container start, crash loop, health check/u);
	assert.match(routes, /\[routes\."docker-runtime-triage"\]\r?\ncategory = "bug_failure"\r?\nroute_type = "primary"/u);

	const ciSkill = readText('.mustflow/skills/ci-pipeline-triage/SKILL.md');
	assert.match(ciSkill, /CI Pipeline Triage/u);
	assert.match(ciSkill, /last successful commit and first failing commit/u);
	assert.match(ciSkill, /false green paths/u);
	assert.match(ciSkill, /Cache is disposable acceleration; artifact is the built/u);
	assert.match(skillIndex, /ci-pipeline-triage/u);
	assert.match(skillIndex, /trigger, runner,\s+environment, build, test, cache, artifact, billing, deploy, or verification/u);
	assert.match(routes, /\[routes\."ci-pipeline-triage"\]\r?\ncategory = "bug_failure"\r?\nroute_type = "primary"/u);

	const searchSkill = readText('.mustflow/skills/search-index-integrity-review/SKILL.md');
	assert.match(searchSkill, /Search Index Integrity Review/u);
	assert.match(searchSkill, /source-to-search ledger/u);
	assert.match(searchSkill, /bulk item error/u);
	assert.match(searchSkill, /read and write aliases/u);
	assert.match(searchSkill, /direct search, backend API, and UI output/u);
	assert.match(searchSkill, /mappings and analyzers/u);
	assert.match(searchSkill, /metadata taxonomy/u);
	assert.match(searchSkill, /metadata key budget/u);
	assert.match(searchSkill, /controlled vocabulary/u);
	assert.match(searchSkill, /Treat tags as filter conditions/u);
	assert.match(searchSkill, /Split metadata by job/u);
	assert.match(searchSkill, /LLM-visible metadata separate from search\/filter metadata/u);
	assert.match(searchSkill, /Separate path hints from state fields/u);
	assert.match(searchSkill, /File names are human hints; stable ids are machine keys/u);
	assert.match(searchSkill, /negative metadata and lifecycle filters/u);
	assert.match(searchSkill, /exact keyword fields/u);
	assert.match(searchSkill, /source maps and freshness fields/u);
	assert.match(searchSkill, /query, miss, and click logs/u);
	assert.match(searchSkill, /golden-set/u);
	assert.match(searchSkill, /shard fan-out/u);
	assert.match(searchSkill, /refresh visibility/u);
	assert.match(searchSkill, /Use vector-search-integrity-review first/u);
	assert.match(skillIndex, /search-index-integrity-review/u);
	assert.match(skillIndex, /source-to-search and query-contract evidence/u);
	assert.match(skillIndex, /metadata taxonomy, negative metadata, exact keyword fields/u);
	assert.match(routes, /\[routes\."search-index-integrity-review"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);

	const vectorSkill = readText('.mustflow/skills/vector-search-integrity-review/SKILL.md');
	assert.match(vectorSkill, /Vector Search Integrity Review/u);
	assert.match(vectorSkill, /exact search with approximate search/u);
	assert.match(vectorSkill, /recall at k/u);
	assert.match(vectorSkill, /metadata indexes/u);
	assert.match(vectorSkill, /original, index, prompt, and embedding text/u);
	assert.match(vectorSkill, /chunk graph and recursive retrieval shape/u);
	assert.match(vectorSkill, /parent document genealogy/u);
	assert.match(vectorSkill, /Stable\s+ids must survive renames/u);
	assert.match(vectorSkill, /contextual retrieval headers/u);
	assert.match(vectorSkill, /synthetic question fields/u);
	assert.match(vectorSkill, /LLM-visible metadata distinct/u);
	assert.match(vectorSkill, /exact product codes, API names, error codes/u);
	assert.match(vectorSkill, /Tiny chunks that lose the subject/u);
	assert.match(vectorSkill, /content hash, embedding hash/u);
	assert.match(vectorSkill, /RRF or MMR settings/u);
	assert.match(vectorSkill, /pre-rerank and post-rerank/u);
	assert.match(vectorSkill, /rag-pipeline-triage first/u);
	assert.match(skillIndex, /vector-search-integrity-review/u);
	assert.match(skillIndex, /retrieval-contract review/u);
	assert.match(skillIndex, /contextual headers, synthetic questions, chunk text variants/u);
	assert.match(routes, /\[routes\."vector-search-integrity-review"\]\r?\ncategory = "data_external"\r?\nroute_type = "primary"/u);
	const ragSkill = readText('.mustflow/skills/rag-pipeline-triage/SKILL.md');
	assert.match(ragSkill, /RAG Pipeline Triage/u);
	assert.match(ragSkill, /no retrieval, current retrieved context/u);
	assert.match(ragSkill, /human-selected gold context/u);
	assert.match(ragSkill, /original, index, and prompt text/u);
	assert.match(ragSkill, /source id, stable doc id, chunk id/u);
	assert.match(ragSkill, /single chunk can stand on its own/u);
	assert.match(ragSkill, /Review headings as coordinates/u);
	assert.match(ragSkill, /For code corpora, preserve structure/u);
	assert.match(ragSkill, /For table, slide, and PDF corpora/u);
	assert.match(ragSkill, /source maps and chunk graph/u);
	assert.match(ragSkill, /document identity and lifecycle/u);
	assert.match(ragSkill, /what the document can answer/u);
	assert.match(ragSkill, /source_of_truth/u);
	assert.match(ragSkill, /context precision/u);
	assert.match(ragSkill, /faithfulness/u);
	assert.match(ragSkill, /document graph/u);
	assert.match(ragSkill, /ACL before retrieval/u);
	assert.match(ragSkill, /metadata completeness, ACL inheritance/u);
	assert.match(ragSkill, /Retrieved text is data, not authority/u);
	assert.match(skillIndex, /rag-pipeline-triage/u);
	assert.match(skillIndex, /knowledge-base answer, grounded chat/u);
	assert.match(skillIndex, /document metadata, frontmatter schema, source maps, heading paths/u);
	assert.match(routes, /\[routes\."rag-pipeline-triage"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assertSkillsIndexRevision(i18n);
});
