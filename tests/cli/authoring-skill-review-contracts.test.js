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

test('bug claim evidence gate keeps defect adjudication bounded and orthogonal', () => {
	const skill = 'bug-claim-evidence-gate';
	const localSkill = readText(`.mustflow/skills/${skill}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skill}/SKILL.md`);
	const localClassification = readText(`.mustflow/skills/${skill}/references/classification.md`);
	const templateClassification = readText(
		`templates/default/locales/en/.mustflow/skills/${skill}/references/classification.md`,
	);
	const localDomains = readText(`.mustflow/skills/${skill}/references/domain-extensions.md`);
	const templateDomains = readText(
		`templates/default/locales/en/.mustflow/skills/${skill}/references/domain-extensions.md`,
	);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const router = readText('.mustflow/skills/router.toml');
	const templateRouter = readText('templates/default/locales/en/.mustflow/skills/router.toml');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(localClassification, templateClassification);
	assert.equal(localDomains, templateDomains);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(router, templateRouter);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /candidate generation separate from adjudication/u);
	assert.match(localSkill, /A different prompt, reviewer, model, wording/u);
	assert.match(localSkill, /applicable obligation exists/u);
	assert.match(localSkill, /actual result falls outside the allowed result set/u);
	assert.match(localSkill, /responsibility is attributable to the named target system/u);
	assert.match(localSkill, /blocked_oracle_conflict/u);
	assert.match(localSkill, /changed hunk, fix-induced effect, new external evidence/u);
	assert.match(localSkill, /Never report blocked or inconclusive work as clean/u);
	assert.match(localClassification, /Claim kind.*`bug`, `risk`, `code_smell`, `improvement`/u);
	assert.match(localClassification, /existence: confidence/u);
	assert.match(localClassification, /causality: confidence/u);
	assert.match(localClassification, /closure: confidence/u);
	assert.match(localClassification, /Assign `regression` only/u);
	assert.match(localDomains, /confirmed security-policy defect from a currently exploitable vulnerability/u);
	assert.match(localDomains, /One passing rerun does not close a nondeterministic finding/u);
	assert.match(localDomains, /semantic success domain from the boundary safety domain/u);
	assert.match(skillIndex, /\.mustflow\/skills\/bug-claim-evidence-gate\/SKILL\.md/u);
	assert.match(skillIndex, /failing-test-as-bug collapse/u);
	assert.match(router, /"candidate_defect", "repeated_review"/u);
	assert.match(
		routes,
		/\[routes\."bug-claim-evidence-gate"\]\r?\ncategory = "bug_failure"\r?\nroute_type = "adjunct"\r?\npriority = 80/u,
	);
	assert.deepEqual(routeReasons(routes, skill), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'security_change',
		'privacy_change',
		'data_change',
		'performance_change',
		'release_risk',
	]);
	assert.match(routes, /suggests_adjuncts = \["bug-claim-evidence-gate"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/bug-claim-evidence-gate\/SKILL\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/bug-claim-evidence-gate\/references\/classification\.md"/u);
	assert.match(manifest, /"\.mustflow\/skills\/bug-claim-evidence-gate\/references\/domain-extensions\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"bug-claim-evidence-gate"/u);
	}
	assertI18nSkillDocument(i18n, skill, 1);
	assertSkillsIndexRevision(i18n);

	for (const integratedSkill of [
		'code-review',
		'repro-first-debug',
		'failure-triage',
		'security-privacy-review',
		'completion-evidence-gate',
	]) {
		assert.match(
			readText(`.mustflow/skills/${integratedSkill}/SKILL.md`),
			/bug-claim-evidence-gate/u,
			`${integratedSkill} should route candidate or closure evidence through the gate`,
		);
	}
});

test('heuristic candidate selection keeps broad scans cheap and bounded', () => {
	const localSkill = readText('.mustflow/skills/heuristic-candidate-selection/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/heuristic-candidate-selection/SKILL.md',
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
	assert.match(localSkill, /cheap repository signals/u);
	assert.match(localSkill, /without reading every full file/u);
	assert.match(localSkill, /frontmatter, imports, exports, component wrappers/u);
	assert.match(localSkill, /Calibrate small-file findings by file role/u);
	assert.match(localSkill, /Limit candidates per folder or package/u);
	assert.match(localSkill, /small random or representative sample/u);
	assert.match(localSkill, /skipped_healthy/u);
	assert.match(localSkill, /needs_source/u);
	assert.match(localSkill, /Do not fill unknown source material/u);
	assert.match(localSkill, /Compare the post-change state/u);
	assert.match(skillIndex, /\.mustflow\/skills\/heuristic-candidate-selection\/SKILL\.md/u);
	assert.match(skillIndex, /cheap-signal candidate selection/u);
	assert.match(routes, /\[routes\."heuristic-candidate-selection"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'docs_change',
		'test_change',
		'behavior_change',
		'performance_change',
		'ui_change',
		'data_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/heuristic-candidate-selection\/SKILL\.md"/u);
	assert.match(manifest, /"heuristic-candidate-selection"/u);
	assert.match(i18n, /\[documents\."skill\.heuristic-candidate-selection"\]/u);
});

test('AI-generated code hardening catches duplicate, coupling, error, and test debt', () => {
	const localSkill = readText('.mustflow/skills/ai-generated-code-hardening/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/ai-generated-code-hardening/SKILL.md',
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
	assert.match(localSkill, /AI-generated/u);
	assert.match(localSkill, /symptom-only/u);
	assert.match(localSkill, /fake confidence from tiny fixtures/u);
	assert.match(localSkill, /fake small-sample performance confidence/u);
	assert.match(localSkill, /pinpoint hardcoding/u);
	assert.match(localSkill, /same class\s+of defect/u);
	assert.match(localSkill, /same-defect-class sibling surfaces/u);
	assert.match(localSkill, /exact string/u);
	assert.match(localSkill, /literal-value patches/u);
	assert.match(localSkill, /one-off string replacements/u);
	assert.match(localSkill, /broader defect class/u);
	assert.match(localSkill, /Search for sibling inputs/u);
	assert.match(localSkill, /duplicate helpers/u);
	assert.match(localSkill, /single source of truth/u);
	assert.match(localSkill, /hidden coupling/u);
	assert.match(localSkill, /circular dependencies/u);
	assert.match(localSkill, /barrel exports/u);
	assert.match(localSkill, /re-export drift/u);
	assert.match(localSkill, /swallowed errors/u);
	assert.match(localSkill, /empty `catch`/u);
	assert.match(localSkill, /god function/u);
	assert.match(localSkill, /god file/u);
	assert.match(localSkill, /fan-in and fan-out/u);
	assert.match(localSkill, /Check small-sample performance traps/u);
	assert.match(localSkill, /`findIndex`/u);
	assert.match(localSkill, /`shift`/u);
	assert.match(localSkill, /spread accumulation/u);
	assert.match(localSkill, /`cloneDeep`/u);
	assert.match(localSkill, /static complexity risk/u);
	assert.match(localSkill, /behavior and side effects/u);
	assert.match(localSkill, /strings, snapshots/u);
	assert.match(localSkill, /Mock only external boundaries/u);
	assert.match(localSkill, /edge cases/u);
	assert.match(localSkill, /does not authorize adding new dependencies, CI gates, or\s+command contracts/u);
	assert.match(skillIndex, /\.mustflow\/skills\/ai-generated-code-hardening\/SKILL\.md/u);
	assert.match(skillIndex, /AI-generated, vibe-coded, copied, or broad code changes/u);
	assert.match(skillIndex, /symptom-only fixes, pinpoint hardcoding/u);
	assert.match(skillIndex, /same-defect-class sibling inputs or callers/u);
	assert.match(skillIndex, /exact literal fixture fix/u);
	assert.match(skillIndex, /string-only tests, over-mocking, fallback sprawl/u);
	assert.match(routes, /\[routes\."ai-generated-code-hardening"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/ai-generated-code-hardening\/SKILL\.md"/u);
	assert.match(manifest, /"ai-generated-code-hardening"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.ai-generated-code-hardening"\][\s\S]*?revision = 3/u);
});

test('quality gaming guard catches metric evasions and stays template-synced', () => {
	const localSkill = readText('.mustflow/skills/quality-gaming-guard/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/quality-gaming-guard/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /line stuffing/u);
	assert.match(localSkill, /multiple statements/u);
	assert.match(localSkill, /validation suppressions/u);
	assert.match(localSkill, /test bypass markers/u);
	assert.match(localSkill, /type escapes/u);
	assert.match(localSkill, /placeholder implementations/u);
	assert.match(localSkill, /empty catch swallowing/u);
	assert.match(localSkill, /generated\/vendor logic hiding/u);
	assert.match(localSkill, /helper\/util\/manager\/common containers/u);
	assert.match(localSkill, /quality_gaming_check/u);
	assert.match(localSkill, /baseline from new regression/u);
	assert.match(skillIndex, /\.mustflow\/skills\/quality-gaming-guard\/SKILL\.md/u);
	assert.match(skillIndex, /Quality metrics, line-count limits, complexity budgets/u);
	assert.match(skillIndex, /long-line stuffing, multiple statements per line/u);
	assert.match(routes, /\[routes\."quality-gaming-guard"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 76/u);
	assert.match(manifest, /"\.mustflow\/skills\/quality-gaming-guard\/SKILL\.md"/u);
	assert.match(manifest, /"quality-gaming-guard"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.quality-gaming-guard"\][\s\S]*?revision = 2/u);
});

test('module boundary review traces change spread, ownership, and leakage', () => {
	const localSkill = readText('.mustflow/skills/module-boundary-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/module-boundary-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /change spread/u);
	assert.match(localSkill, /Change reason/u);
	assert.match(localSkill, /Co-change evidence/u);
	assert.match(localSkill, /import direction/u);
	assert.match(localSkill, /cycles/u);
	assert.match(localSkill, /`code\/module-boundary`/u);
	assert.match(localSkill, /DTO infection/u);
	assert.match(localSkill, /`common`, `shared`, `utils`, and `helpers`/u);
	assert.match(localSkill, /monorepo package graph/u);
	assert.match(localSkill, /Apps assemble and should not be\s+imported/u);
	assert.match(localSkill, /cross-package deep imports/u);
	assert.match(localSkill, /package\.json` `exports` as the public API/u);
	assert.match(localSkill, /root-hoisted undeclared dependencies/u);
	assert.match(localSkill, /compile-success versus allowed-dependency confusion/u);
	assert.match(localSkill, /the import compiles/u);
	assert.match(localSkill, /Do not use `tsconfig\.paths` as a substitute/u);
	assert.match(localSkill, /If only `paths` knows the edge/u);
	assert.match(localSkill, /many mocks/u);
	assert.match(localSkill, /Repeated `isPremium`/u);
	assert.match(localSkill, /Check enum spread/u);
	assert.match(localSkill, /`findRefundableOrders`/u);
	assert.match(localSkill, /anemic/u);
	assert.match(localSkill, /domain object that sends email/u);
	assert.match(localSkill, /transactionally mutate many owners/u);
	assert.match(localSkill, /`UserTableUpdated`/u);
	assert.match(localSkill, /public module API/u);
	assert.match(localSkill, /callers must call `create`/u);
	assert.match(localSkill, /"Used in many places"/u);
	assert.match(localSkill, /Recent commits/u);
	assert.match(localSkill, /bug location/u);
	assert.match(localSkill, /Raw `process\.env`/u);
	assert.match(localSkill, /Logs that mention another module/u);
	assert.match(localSkill, /Translate exceptions/u);
	assert.match(localSkill, /Cache invalidation belongs near the data owner/u);
	assert.match(localSkill, /Authorization checks repeated/u);
	assert.match(localSkill, /Frontend code should receive allowed actions/u);
	assert.match(localSkill, /Batch, cron, worker, and admin tools/u);
	assert.match(localSkill, /temporary exceptions/u);
	assert.match(localSkill, /module deleted/u);
	assert.match(skillIndex, /\.mustflow\/skills\/module-boundary-review\/SKILL\.md/u);
	assert.match(skillIndex, /module-boundary triage/u);
	assert.match(skillIndex, /change spread, change axes, stability direction, co-change clusters/u);
	assert.match(skillIndex, /caller sequencing, premature common helpers/u);
	assert.match(routes, /\[routes\."module-boundary-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 70/u);
	assertRouteReasonsText(routes, [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'public_api_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'data_change',
		'package_metadata_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/module-boundary-review\/SKILL\.md"/u);
	assert.match(manifest, /"module-boundary-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.module-boundary-review"\][\s\S]*?revision = 5/u);
});

test('change blast radius review predicts maintainability spread and deletion cost', () => {
	const localSkill = readText('.mustflow/skills/change-blast-radius-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/change-blast-radius-review/SKILL.md',
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
	assert.match(localSkill, /next-change blast radius/u);
	assert.match(localSkill, /deletion path/u);
	assert.match(localSkill, /policy owner/u);
	assert.match(localSkill, /workflow owner/u);
	assert.match(localSkill, /Change-reason ledger/u);
	assert.match(localSkill, /Blast-radius ledger/u);
	assert.match(localSkill, /Ownership ledger/u);
	assert.match(localSkill, /Deleteability ledger/u);
	assert.match(localSkill, /Controllers should parse requests/u);
	assert.match(localSkill, /Reject junk-drawer services/u);
	assert.match(localSkill, /boolean mode flags/u);
	assert.match(localSkill, /option objects/u);
	assert.match(localSkill, /Find the policy source of truth/u);
	assert.match(localSkill, /Centralize authorization policy/u);
	assert.match(localSkill, /Make state transitions visible/u);
	assert.match(localSkill, /`new Date\(\)`/u);
	assert.match(localSkill, /`Date\.now\(\)`/u);
	assert.match(localSkill, /retry idempotency/u);
	assert.match(localSkill, /cache-as-truth/u);
	assert.match(localSkill, /config flag combinations/u);
	assert.match(localSkill, /tenant, partner, country, product, and app-version exceptions/u);
	assert.match(localSkill, /legacy compatibility/u);
	assert.match(localSkill, /DB entities, API DTOs, view models/u);
	assert.match(localSkill, /nullable values/u);
	assert.match(localSkill, /Do not hide exceptions as normal data/u);
	assert.match(localSkill, /Make logs traceable/u);
	assert.match(localSkill, /implementation-coupled tests/u);
	assert.match(localSkill, /Five or more mocks/u);
	assert.match(localSkill, /decorative interfaces/u);
	assert.match(localSkill, /Do not DRY together different futures/u);
	assert.match(localSkill, /Make required ordering explicit/u);
	assert.match(localSkill, /Treat events as invisible function calls/u);
	assert.match(localSkill, /Pair migrations with runtime compatibility/u);
	assert.match(localSkill, /Run the deletion test/u);
	assert.match(skillIndex, /\.mustflow\/skills\/change-blast-radius-review\/SKILL\.md/u);
	assert.match(skillIndex, /change-blast-radius triage/u);
	assert.match(skillIndex, /hard-to-delete features/u);
	assert.match(routes, /\[routes\."change-blast-radius-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 75/u);
	assertRouteReasonsText(routes, [
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
		'package_metadata_change',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/change-blast-radius-review\/SKILL\.md"/u);
	assert.match(manifest, /"change-blast-radius-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.change-blast-radius-review"\][\s\S]*?revision = 2/u);
});

test('business rule leakage review follows domain rules through every entrypoint', () => {
	const localSkill = readText('.mustflow/skills/business-rule-leakage-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/business-rule-leakage-review/SKILL.md',
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
	assert.match(localSkill, /money, permission, ownership, state, settlement, discount/u);
	assert.match(localSkill, /Rule ledger/u);
	assert.match(localSkill, /Entrypoint ledger/u);
	assert.match(localSkill, /Enforcement ledger/u);
	assert.match(localSkill, /Consistency ledger/u);
	assert.match(localSkill, /Reject UI-only enforcement/u);
	assert.match(localSkill, /Keep controllers from judging business eligibility/u);
	assert.match(localSkill, /Review state changes as business commands/u);
	assert.match(localSkill, /Direct `status = "DONE"`/u);
	assert.match(localSkill, /Compare list and detail rules/u);
	assert.match(localSkill, /Treat query predicates as policy/u);
	assert.match(localSkill, /`deleted_at is null`/u);
	assert.match(localSkill, /`tenant_id = \?`/u);
	assert.match(localSkill, /Treat admin paths as business paths/u);
	assert.match(localSkill, /Review batches and schedulers/u);
	assert.match(localSkill, /Place tests at the rule owner/u);
	assert.match(localSkill, /Hunt duplicated business constants/u);
	assert.match(localSkill, /Review date and timezone policy/u);
	assert.match(localSkill, /`isActive`, `isValid`, and `canUse`/u);
	assert.match(localSkill, /Separate authentication, authorization, ownership, and eligibility/u);
	assert.match(localSkill, /Restrict mutable fields after creation/u);
	assert.match(localSkill, /Make PATCH semantics explicit/u);
	assert.match(localSkill, /Keep mappers mechanical/u);
	assert.match(localSkill, /Own defaults in one place/u);
	assert.match(localSkill, /Check error messages against actual checks/u);
	assert.match(localSkill, /Do not swallow business failures/u);
	assert.match(localSkill, /Align transaction boundary with the business action/u);
	assert.match(localSkill, /Review event timing/u);
	assert.match(localSkill, /Assume duplicate requests/u);
	assert.match(localSkill, /Treat webhooks as external APIs/u);
	assert.match(localSkill, /Check out-of-order events/u);
	assert.match(localSkill, /Treat cache invalidation as policy/u);
	assert.match(localSkill, /Compare search index and database truth/u);
	assert.match(localSkill, /Review reports and settlement harder than services/u);
	assert.match(localSkill, /Finish with the bypass question/u);
	assert.match(skillIndex, /\.mustflow\/skills\/business-rule-leakage-review\/SKILL\.md/u);
	assert.match(skillIndex, /business-rule-leakage triage/u);
	assert.match(skillIndex, /other bypass entrances/u);
	assert.match(routes, /\[routes\."business-rule-leakage-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 79/u);
	assertRouteReasonsText(routes, [
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
	]);
	assert.match(manifest, /"\.mustflow\/skills\/business-rule-leakage-review\/SKILL\.md"/u);
	assert.match(manifest, /"business-rule-leakage-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.business-rule-leakage-review"\][\s\S]*?revision = 1/u);
});

test('payment integrity review keeps money events idempotent and auditable', () => {
	const localSkill = readText('.mustflow/skills/payment-integrity-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/payment-integrity-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /money-event integrity/u);
	assert.match(localSkill, /Money-event ledger/u);
	assert.match(localSkill, /Provider interaction ledger/u);
	assert.match(localSkill, /State-transition ledger/u);
	assert.match(localSkill, /Idempotency and uniqueness ledger/u);
	assert.match(localSkill, /Amount and currency ledger/u);
	assert.match(localSkill, /Ownership ledger/u);
	assert.match(localSkill, /Fulfillment and entitlement ledger/u);
	assert.match(localSkill, /Webhook and retry ledger/u);
	assert.match(localSkill, /Audit and sensitive-data ledger/u);
	assert.match(localSkill, /Model payment as a state machine/u);
	assert.match(localSkill, /Calculate amount on the server/u);
	assert.match(localSkill, /Use integer minor units/u);
	assert.match(localSkill, /Bind every payment object to its owner/u);
	assert.match(localSkill, /Compare every amount ledger/u);
	assert.match(localSkill, /Make payment creation idempotent/u);
	assert.match(localSkill, /Use database uniqueness as the last gate/u);
	assert.match(localSkill, /Assume webhooks are duplicated/u);
	assert.match(localSkill, /Assume webhooks are out of order/u);
	assert.match(localSkill, /Verify webhook signatures on the raw body/u);
	assert.match(localSkill, /Return from webhook endpoints quickly/u);
	assert.match(localSkill, /Never use success redirects as proof/u);
	assert.match(localSkill, /Run fulfillment exactly once/u);
	assert.match(localSkill, /Handle asynchronous payment methods/u);
	assert.match(localSkill, /Separate authorization from capture/u);
	assert.match(localSkill, /Review refunds as money-out events/u);
	assert.match(localSkill, /Handle disputes and chargebacks/u);
	assert.match(localSkill, /Review subscriptions as state machines/u);
	assert.match(localSkill, /Reserve inventory before confirming it/u);
	assert.match(localSkill, /Reserve coupons before consuming them/u);
	assert.match(localSkill, /Treat timeouts as unknown outcomes/u);
	assert.match(localSkill, /Classify retries by failure kind/u);
	assert.match(localSkill, /Keep an append-only money ledger/u);
	assert.match(localSkill, /Reconcile provider and internal state/u);
	assert.match(localSkill, /Redact payment-sensitive data/u);
	assert.match(localSkill, /Separate test and live payment planes/u);
	assert.match(localSkill, /Audit manual payment operations/u);
	assert.match(localSkill, /Search for stale payment endpoints/u);
	assert.match(localSkill, /Test the nightmare paths/u);
	assert.match(skillIndex, /\.mustflow\/skills\/payment-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /payment-integrity triage/u);
	assert.match(skillIndex, /happy-path-only payment tests/u);
	assert.match(routes, /\[routes\."payment-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"/u);
	assert.match(routes, /priority = 80/u);
	assertRouteReasonsText(routes, [
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
	]);
	assert.match(manifest, /"\.mustflow\/skills\/payment-integrity-review\/SKILL\.md"/u);
	assert.match(manifest, /"payment-integrity-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.payment-integrity-review"\][\s\S]*?revision = 4/u);
});

test('notification delivery integrity review keeps message intent delivery and suppression explainable', () => {
	const localSkill = readText('.mustflow/skills/notification-delivery-integrity-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/notification-delivery-integrity-review/SKILL.md',
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
	assert.match(localSkill, /Review notification systems as event, policy, schedule, delivery, provider, suppression, inbox, and audit flows/u);
	assert.match(localSkill, /Notification event ledger/u);
	assert.match(localSkill, /Notification intent ledger/u);
	assert.match(localSkill, /Delivery job and attempt ledger/u);
	assert.match(localSkill, /Preference and legal policy ledger/u);
	assert.match(localSkill, /Suppression ledger/u);
	assert.match(localSkill, /source event/u);
	assert.match(localSkill, /notification intent/u);
	assert.match(localSkill, /schedule/u);
	assert.match(localSkill, /delivery attempt/u);
	assert.match(localSkill, /provider event/u);
	assert.match(localSkill, /one-click unsubscribe/u);
	assert.match(localSkill, /hard bounce/u);
	assert.match(localSkill, /complaint/u);
	assert.match(localSkill, /push token/u);
	assert.match(localSkill, /collapse key/u);
	assert.match(localSkill, /in-app inbox/u);
	assert.match(localSkill, /mark_all_read_before/u);
	assert.match(localSkill, /semantic dedupe key/u);
	assert.match(localSkill, /digest window/u);
	assert.match(localSkill, /quiet hours/u);
	assert.match(localSkill, /timezone/u);
	assert.match(localSkill, /exponential backoff/u);
	assert.match(localSkill, /unknown provider outcome/u);
	assert.match(localSkill, /outbox/u);
	assert.match(localSkill, /provider webhook/u);
	assert.match(localSkill, /dry run, sample, canary/u);
	assert.match(localSkill, /Remaining notification-delivery risk/u);
	assert.match(skillIndex, /\.mustflow\/skills\/notification-delivery-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /notification-delivery triage/u);
	assert.match(skillIndex, /provider acceptance treated as delivery/u);
	assert.match(skillIndex, /remaining notification-delivery risk/u);
	assert.match(routes, /\[routes\."notification-delivery-integrity-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "adjunct"\r?\npriority = 82/u);
	assert.deepEqual(routeReasons(routes, 'notification-delivery-integrity-review'), [
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
	]);
	assert.match(manifest, /"\.mustflow\/skills\/notification-delivery-integrity-review\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"notification-delivery-integrity-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.notification-delivery-integrity-review"\][\s\S]*?revision = 1/u);
});
