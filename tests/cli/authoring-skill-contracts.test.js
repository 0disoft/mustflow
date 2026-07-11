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

test('canonical source skills stay synchronized with default English template skills', () => {
	const sourceSkillNames = readSkillDirectoryNames('.mustflow/skills');
	const templateSkillNames = readSkillDirectoryNames('templates/default/locales/en/.mustflow/skills');

	assert.deepEqual(templateSkillNames, sourceSkillNames);

	for (const skillName of sourceSkillNames) {
		assert.equal(
			readText(`.mustflow/skills/${skillName}/SKILL.md`),
			readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`),
			`${skillName} should stay synchronized with the canonical template skill`,
		);
	}
});

test('README and project context authoring routes stay separated', () => {
	const readmeSkill = readText('.mustflow/skills/readme-authoring/SKILL.md');
	const projectContextSkill = readText('.mustflow/skills/project-context-authoring/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.match(readmeSkill, /root `README\.md`/u);
	assert.match(readmeSkill, /repository-supported evidence/u);
	assert.match(readmeSkill, /missing inputs can be reported without guessing/u);
	assert.match(readmeSkill, /marketing copy/u);
	assert.match(projectContextSkill, /The task only updates root `README\.md`/u);

	assert.match(skillIndex, /`README\.md` is created, restructured, or substantially rewritten/u);
	assert.match(skillIndex, /invented project claims/u);
	assert.match(skillIndex, /loss of human-authored intent/u);
	assert.match(skillIndex, /`\.mustflow\/context\/PROJECT\.md` needs cautious project context/u);
});

test('skill route selection convention treats authoring as a main route', () => {
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const router = readText('.mustflow/skills/router.toml');
	const templateRouter = readText('templates/default/locales/en/.mustflow/skills/router.toml');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');

	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(router, templateRouter);
	assert.equal(routes, templateRoutes);
	assert.match(router, /purpose = "Stable skill-routing kernel for prompt-cache-friendly first-pass selection\."/u);
	assert.match(router, /fallback_policy = "read_full_routes_when_uncertain"/u);
	assert.match(skillIndex, /Choose one main route: a `primary` route/u);
	assert.match(skillIndex, /Treat `authoring` routes as selectable main routes, not adjunct routes/u);
	assert.match(skillIndex, /choose one main route \(`primary` or `authoring`\) and at most two adjunct/u);
	assert.match(
		routes,
		/\[routes\."security-privacy-review"\]\r?\ncategory = "security_privacy"\r?\nroute_type = "primary"/u,
	);
});

test('architecture pattern routes carry data-driven context signals', () => {
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');

	assert.equal(routes, templateRoutes);
	for (const routeName of [
		'composition-over-inheritance',
		'strategy-pattern',
		'command-pattern',
		'facade-pattern',
		'state-machine-pattern',
	]) {
		const routeContext = routes.match(
			new RegExp(`\\[routes\\."${routeName}"\\.contexts\\]([\\s\\S]*?)(?=\\n\\[routes\\."|$)`, 'u'),
		)?.[1];
		assert.ok(routeContext, routeName);
		assert.match(routeContext, /positive_terms = \[[^\]]+\]/u, `${routeName} should declare positive_terms`);
		assert.match(routeContext, /negative_terms = \[[^\]]+\]/u, `${routeName} should declare negative_terms`);
	}
	assert.match(
		routes,
		/\[routes\."state-machine-pattern"\.contexts\][\s\S]*?positive_terms = \[[^\]]*"lifecycle"[\s\S]*?"transition"[\s\S]*?\]/u,
	);
	assert.match(
		routes,
		/\[routes\."strategy-pattern"\.contexts\][\s\S]*?negative_terms = \[[^\]]*"state"[\s\S]*?"transition"[\s\S]*?\]/u,
	);
});

test('route metadata can declare checked skill dependencies', () => {
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');

	assert.equal(routes, templateRoutes);
	const publicJsonDependenciesPattern = [
		'\\[routes\\."public-json-contract-change"\\.dependencies\\]',
		'suggests_adjuncts = \\["cli-output-contract-review", "completion-evidence-gate"\\]',
		'signal = "machine_output_changed"',
		'skill = "cli-output-contract-review"',
	].join('[\\s\\S]*?');
	const completionEvidenceDependenciesPattern = [
		'\\[routes\\."completion-evidence-gate"\\.dependencies\\]',
		'suggests_adjuncts = \\["next-action-menu"\\]',
		'signal = "concrete_followup_exists"',
		'skill = "next-action-menu"',
	].join('[\\s\\S]*?');

	assert.match(
		routes,
		new RegExp(publicJsonDependenciesPattern, 'u'),
	);
	assert.match(
		routes,
		new RegExp(completionEvidenceDependenciesPattern, 'u'),
	);
	assert.match(
		routes,
		/\[routes\."state-machine-pattern"\.dependencies\][\s\S]*?conflicts_with = \["strategy-pattern"\]/u,
	);
	assert.match(
		routes,
		/\[routes\."strategy-pattern"\.dependencies\][\s\S]*?conflicts_with = \["state-machine-pattern"\]/u,
	);
});

test('skill route metadata covers declared trigger axes for integration and framework skills', () => {
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');

	assert.equal(routes, templateRoutes);

	const expectedReasons = {
		'adapter-boundary': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'cross_cutting_code_change',
			'data_change',
			'migration_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'package_metadata_change',
		],
		'api-contract-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'docs_change',
			'test_change',
			'data_change',
			'migration_change',
			'performance_change',
			'security_change',
			'privacy_change',
		],
		'third-party-api-integration-review': [
			'unknown_change',
			'code_change',
			'behavior_change',
			'test_change',
			'public_api_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'data_change',
			'migration_change',
			'docs_change',
			'package_metadata_change',
			'release_risk',
		],
		'website-task-friction-review': [
			'ui_change',
			'behavior_change',
			'code_change',
			'test_change',
			'docs_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'public_api_change',
			'web_asset_change',
			'release_risk',
		],
		'bun-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'migration_change',
			'security_change',
			'package_metadata_change',
			'release_risk',
		],
		'deno-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'docs_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'data_change',
			'migration_change',
			'package_metadata_change',
			'release_risk',
		],
		'java-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'docs_change',
			'data_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'package_metadata_change',
			'release_risk',
		],
		'elysia-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'docs_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'package_metadata_change',
			'release_risk',
		],
		'hono-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'docs_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'package_metadata_change',
			'release_risk',
		],
		'axum-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'docs_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'data_change',
			'package_metadata_change',
			'release_risk',
		],
		'babylon-code-change': [
			'ui_change',
			'code_change',
			'behavior_change',
			'public_api_change',
			'data_change',
			'security_change',
			'privacy_change',
			'performance_change',
			'test_change',
			'docs_change',
			'migration_change',
			'package_metadata_change',
			'release_risk',
		],
		'threejs-code-change': [
			'ui_change',
			'code_change',
			'behavior_change',
			'public_api_change',
			'data_change',
			'security_change',
			'privacy_change',
			'performance_change',
			'test_change',
			'docs_change',
			'migration_change',
			'package_metadata_change',
			'release_risk',
		],
		'godot-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'docs_change',
			'performance_change',
			'security_change',
			'privacy_change',
			'data_change',
			'ui_change',
			'package_metadata_change',
			'release_risk',
		],
		'typescript-code-change': [
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'data_change',
			'migration_change',
			'ui_change',
			'performance_change',
			'package_metadata_change',
			'release_risk',
		],
		'tauri-code-change': [
			'code_change',
			'behavior_change',
			'ui_change',
			'security_change',
			'privacy_change',
			'data_change',
			'public_api_change',
			'package_metadata_change',
			'release_risk',
		],
		'wails-code-change': [
			'code_change',
			'behavior_change',
			'ui_change',
			'security_change',
			'privacy_change',
			'data_change',
			'public_api_change',
			'package_metadata_change',
			'release_risk',
		],
		'tailwind-code-change': [
			'ui_change',
			'docs_change',
			'code_change',
			'behavior_change',
			'public_api_change',
			'migration_change',
			'package_metadata_change',
		],
		'unocss-code-change': [
			'ui_change',
			'docs_change',
			'code_change',
			'behavior_change',
			'migration_change',
			'performance_change',
			'package_metadata_change',
		],
		'svelte-code-change': [
			'ui_change',
			'code_change',
			'behavior_change',
			'public_api_change',
			'data_change',
			'security_change',
			'privacy_change',
			'performance_change',
			'test_change',
			'docs_change',
			'migration_change',
			'package_metadata_change',
			'release_risk',
		],
		'vue-code-change': [
			'ui_change',
			'code_change',
			'behavior_change',
			'public_api_change',
			'data_change',
			'security_change',
			'privacy_change',
			'performance_change',
			'test_change',
			'package_metadata_change',
			'release_risk',
		],
		'vite-code-change': [
			'ui_change',
			'code_change',
			'behavior_change',
			'public_api_change',
			'data_change',
			'security_change',
			'privacy_change',
			'performance_change',
			'test_change',
			'docs_change',
			'migration_change',
			'package_metadata_change',
			'release_risk',
		],
	};

	for (const [routeName, reasons] of Object.entries(expectedReasons)) {
		assert.deepEqual(routeReasons(routes, routeName), reasons, routeName);
	}
});

test('completion evidence gate explicitly hands off useful follow-ups to next action menu', () => {
	const localSkill = readText('.mustflow/skills/completion-evidence-gate/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/completion-evidence-gate/SKILL.md',
	);
	const nextActionSkill = readText('.mustflow/skills/next-action-menu/SKILL.md');
	const templateNextActionSkill = readText(
		'templates/default/locales/en/.mustflow/skills/next-action-menu/SKILL.md',
	);
	const workflow = readText('.mustflow/docs/agent-workflow.md');
	const templateWorkflow = readText('templates/default/locales/en/.mustflow/docs/agent-workflow.md');
	const i18n = readText('templates/default/i18n.toml');
	const routes = readText('.mustflow/skills/routes.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(nextActionSkill, templateNextActionSkill);
	assert.equal(workflow, templateWorkflow);
	assert.match(localSkill, /revision: 8/u);
	assert.match(nextActionSkill, /revision: 5/u);
	assert.match(workflow, /Before a final report after changed files, verification, paused implementation/u);
	assert.match(workflow, /apply\s+`completion-evidence-gate` when available/u);
	assert.match(workflow, /apply `next-action-menu` and include the bounded table/u);
	assert.match(workflow, /### Script-Pack Selection/u);
	assert.match(workflow, /Script-pack suggestions are optional evidence helpers/u);
	assert.match(workflow, /Skills remain the primary procedure owner/u);
	assert.match(workflow, /`script_pack_list`/u);
	assert.match(workflow, /`script_pack_suggest_changed`/u);
	assert.match(workflow, /`related_skills`/u);
	assert.match(workflow, /`phases`/u);
	assert.match(workflow, /`use_when`/u);
	assert.match(workflow, /`read_only` is false/u);
	assert.match(workflow, /`mutates` is true/u);
	assert.match(workflow, /does not replace reading `SKILL\.md`/u);
	assert.match(workflow, /Suggested helpers are not mandatory/u);
	assert.match(localSkill, /Concrete follow-up candidates/u);
	assert.match(localSkill, /Decide whether a next-action menu is required/u);
	assert.match(localSkill, /For a non-trivial final report, read and apply `next-action-menu`/u);
	assert.match(localSkill, /read and apply `next-action-menu` before final reporting/u);
	assert.match(localSkill, /created commit, push or release readiness, deploy preparation/u);
	assert.match(localSkill, /Do not omit the menu merely because the remaining useful actions are approval-gated/u);
	assert.match(localSkill, /omits `next-action-menu` despite concrete\s+follow-ups as incomplete final-report routing/u);
	assert.match(localSkill, /useful follow-up tasks appear through `next-action-menu` whenever\s+at least one concrete next action remains/u);
	assert.match(nextActionSkill, /Use especially after non-trivial code, behavior, test, docs/u);
	assert.match(nextActionSkill, /A code, behavior, test, public API, config, workflow, docs/u);
	assert.match(nextActionSkill, /treat the menu as required when\s+any concrete next action exists/u);
	assert.match(nextActionSkill, /선택&nbsp;번호 \| 다음 작업 \| 설명 \| 추천&nbsp;등급/u);
	assert.match(
		nextActionSkill,
		/Select&nbsp;No\. \| Next task \| Description \| Recommendation&nbsp;grade/u,
	);
	assert.match(nextActionSkill, /A gated item in the table is only a visible next-action option/u);
	assert.match(localSkill, /Next-action menu included or omitted, with reason/u);
	assert.match(
		i18n,
		/\[documents\."docs\.agent-workflow"\][\s\S]*?revision = 30/u,
	);
	assert.match(
		i18n,
		/\[documents\."skill\.completion-evidence-gate"\][\s\S]*?revision = 8/u,
	);
	assert.match(
		i18n,
		/\[documents\."skill\.next-action-menu"\][\s\S]*?revision = 5/u,
	);
	assert.match(
		routes,
		/\[routes\."next-action-menu"\][\s\S]*?route_type = "adjunct"[\s\S]*?priority = 84/u,
	);
	assert.deepEqual(
		routeReasons(routes, 'next-action-menu'),
		[
			'unknown_change',
			'code_change',
			'behavior_change',
			'public_api_change',
			'test_change',
			'docs_change',
			'copy_change',
			'i18n_change',
			'workflow_change',
			'mustflow_docs_change',
			'mustflow_config_change',
			'package_metadata_change',
			'security_change',
			'privacy_change',
			'data_change',
			'migration_change',
			'performance_change',
			'ui_change',
			'release_risk',
		],
		'next-action-menu should route after ordinary code, behavior, and test completion reports',
	);
});

test('design implementation handoff separates public specs from private agent state', () => {
	const localSkill = readText('.mustflow/skills/design-implementation-handoff/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/design-implementation-handoff/SKILL.md',
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
	assert.match(localSkill, /Agent A design and an Agent B implementation/u);
	assert.match(localSkill, /public product behavior/u);
	assert.match(localSkill, /\.agent\/MANIFEST\.yaml/u);
	assert.match(localSkill, /\.agent\/PLAN\.yaml/u);
	assert.match(localSkill, /\.agent\/STATE\.yaml/u);
	assert.match(localSkill, /Remote Agent B/u);
	assert.match(localSkill, /Do not put mutable status fields in `PLAN\.yaml`/u);
	assert.match(localSkill, /No private `\.agent` file is tracked or staged/u);
	assert.match(skillIndex, /\.mustflow\/skills\/design-implementation-handoff\/SKILL\.md/u);
	assert.match(skillIndex, /Agent A designs and Agent B implements from a versioned handoff/u);
	assert.match(routes, /\[routes\."design-implementation-handoff"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "authoring"/u);
	assert.match(routes, /priority = 64/u);
	assert.match(manifest, /"\.mustflow\/skills\/design-implementation-handoff\/SKILL\.md"/u);
	assert.match(manifest, /"design-implementation-handoff"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.design-implementation-handoff"\][\s\S]*?revision = 1/u);
});

test('idea triage keeps brainstorming evidence-based and bounded', () => {
	const localSkill = readText('.mustflow/skills/idea-triage/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/idea-triage/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /outside AI suggestions/u);
	assert.match(localSkill, /apply_now/u);
	assert.match(localSkill, /defer/u);
	assert.match(localSkill, /reject/u);
	assert.match(localSkill, /research/u);
	assert.match(localSkill, /future work/u);
	assert.match(localSkill, /current-behavior claims for unimplemented ideas/u);
	assert.match(localSkill, /non-goals, and core promises/u);
	assert.match(localSkill, /do not classify it as `apply_now`/u);
	assert.match(localSkill, /module boundary, architecture, external service boundary, or command contract/u);
	assert.match(skillIndex, /\.mustflow\/skills\/idea-triage\/SKILL\.md/u);
	assert.match(skillIndex, /apply, defer, reject, or research decisions/u);
	assert.match(routes, /\[routes\."idea-triage"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'docs_change',
		'mustflow_docs_change',
		'workflow_change',
		'product_change',
	]);
	assert.match(manifest, /"idea-triage"/u);
});

test('support surface advisor scopes product support contracts', () => {
	const localSkill = readText('.mustflow/skills/support-surface-advisor/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/support-surface-advisor/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /maintenance contract/u);
	assert.match(localSkill, /support_now/u);
	assert.match(localSkill, /explicitly_not_supported/u);
	assert.match(localSkill, /internal_only/u);
	assert.match(localSkill, /core engine boundary/u);
	assert.match(localSkill, /UI, CLI, and API shells must not reimplement the same core rules separately/u);
	assert.match(localSkill, /Do not ask for or recommend all support surfaces by default/u);
	assert.match(localSkill, /Do not put internal implementation explanations in user-facing UI copy/u);
	assert.match(localSkill, /Product stage and primary actors/u);
	assert.match(localSkill, /Core engine versus shell boundary/u);
	assert.match(skillIndex, /\.mustflow\/skills\/support-surface-advisor\/SKILL\.md/u);
	assert.match(skillIndex, /supported now, deferred, explicitly unsupported, or internal-only/u);
	assert.match(
		routes,
		/\[routes\."support-surface-advisor"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 67/u,
	);
	const supportSurfaceRouteReasons = [
		'"unknown_change"',
		'"code_change"',
		'"behavior_change"',
		'"public_api_change"',
		'"docs_change"',
		'"product_change"',
		'"package_metadata_change"',
	].join(', ');
	assert.match(
		routes,
		new RegExp(`applies_to_reasons = \\[${supportSurfaceRouteReasons}\\]`, 'u'),
	);
	assert.match(manifest, /"\.mustflow\/skills\/support-surface-advisor\/SKILL\.md"/u);
	for (const profileName of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		assert.match(
			manifest,
			new RegExp(`${profileName} = \\[[\\s\\S]*?"support-surface-advisor"`, 'u'),
		);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.support-surface-advisor"\][\s\S]*?revision = 1/u);
});

test('proactive risk surfacing permits bounded evidence-backed intervention', () => {
	const localSkill = readText('.mustflow/skills/proactive-risk-surfacing/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/proactive-risk-surfacing/SKILL.md',
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
	assert.match(localSkill, /scope-adjacent risk/u);
	assert.match(localSkill, /fix_now/u);
	assert.match(localSkill, /report_only/u);
	assert.match(localSkill, /ask_first/u);
	assert.match(localSkill, /ignore/u);
	assert.match(localSkill, /same root cause/u);
	assert.match(localSkill, /high_severity_adjacent/u);
	assert.match(localSkill, /Do not perform broad unrelated refactors/u);
	assert.match(localSkill, /No current repository evidence supports the extra concern/u);
	assert.match(skillIndex, /\.mustflow\/skills\/proactive-risk-surfacing\/SKILL\.md/u);
	assert.match(skillIndex, /fix now, report only, ask first, or ignore/u);
	assert.match(routes, /\[routes\."proactive-risk-surfacing"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "event"/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'docs_change',
		'mustflow_docs_change',
		'public_api_change',
		'security_change',
		'privacy_change',
		'data_change',
		'performance_change',
		'ui_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/proactive-risk-surfacing\/SKILL\.md"/u);
	assert.match(manifest, /"proactive-risk-surfacing"/u);
	assert.match(i18n, /\[documents\."skill\.proactive-risk-surfacing"\]/u);
});
