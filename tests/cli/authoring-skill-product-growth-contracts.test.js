import assert from 'node:assert/strict';
import test from 'node:test';

import {
	assertI18nSkillDocument,
	assertSkillsIndexRevision,
	readText,
} from './helpers/skill-contracts.js';

const productProfiles = ['team', 'product'];
const excludedProfiles = ['minimal', 'patterns', 'oss', 'library'];

function readProfile(manifest, profile) {
	const match = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
	assert.ok(match, `missing ${profile} profile`);
	return match[1];
}

test('product onboarding activation review keeps abandoners in the cohort and requires owned value', () => {
	const skillName = 'product-onboarding-activation-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /eligible visitor or newly assigned user/u);
	assert.match(localSkill, /intent-to-treat denominator/u);
	assert.match(localSkill, /meaningful user-owned input/u);
	assert.match(localSkill, /Place the account checkpoint/u);
	assert.match(localSkill, /Transfer anonymous work atomically/u);
	assert.match(localSkill, /guest identifier from becoming an authorization credential/u);
	assert.match(localSkill, /Price each question against the work it changes/u);
	assert.match(localSkill, /decorative greetings or reordered cards alone/u);
	assert.match(localSkill, /identify it as sample data/u);
	assert.match(localSkill, /Separate authentication UX from authentication assurance/u);
	assert.match(localSkill, /internal `user_id`/u);
	assert.match(localSkill, /email as a changeable contact attribute/u);
	assert.match(localSkill, /Choose the instruction format from task complexity and consequence/u);
	assert.match(localSkill, /do not count tutorial completion as activation/u);
	assert.match(localSkill, /Choose one primary action per current intent/u);
	assert.match(localSkill, /Randomize before the intervention/u);
	assert.match(localSkill, /directly observed per-eligible-visitor outcomes/u);
	assert.match(localSkill, /do not promote post-hoc segments as preregistered/u);
	assert.match(skillIndex, /\.mustflow\/skills\/product-onboarding-activation-review\/SKILL\.md/u);
	assert.match(skillIndex, /signup rate optimized instead of visitor-to-value/u);
	assert.match(
		routes,
		/\[routes\."product-onboarding-activation-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 52/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/product-onboarding-activation-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"product-onboarding-activation-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"product-onboarding-activation-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});

test('subscription retention profit review rejects save-rate theater and protects cancellation', () => {
	const skillName = 'subscription-retention-profit-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /incremental contribution profit/u);
	assert.match(localSkill, /Keep cancellation easy/u);
	assert.match(localSkill, /no-offer or business-as-usual holdout/u);
	assert.match(localSkill, /natural return/u);
	assert.match(localSkill, /contribution margin per eligible assigned user/u);
	assert.match(localSkill, /expected product or user cadence/u);
	assert.match(localSkill, /Avoid discount-first policy/u);
	assert.match(localSkill, /compare relevant task or feature help with silence/u);
	assert.match(localSkill, /Price usage credits as real variable cost/u);
	assert.match(localSkill, /Treat pause as a distinct nonpaying or deferred-paying state/u);
	assert.match(localSkill, /Do not copy a universal one-month or three-month order/u);
	assert.match(localSkill, /one reason-matched primary remedy/u);
	assert.match(localSkill, /cannot farm discounts, extensions, pauses, or credits/u);
	assert.match(skillIndex, /\.mustflow\/skills\/subscription-retention-profit-review\/SKILL\.md/u);
	assert.match(skillIndex, /save rate as profit/u);
	assert.match(
		routes,
		/\[routes\."subscription-retention-profit-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 53/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/subscription-retention-profit-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"subscription-retention-profit-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"subscription-retention-profit-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('game economy monetization review protects failure, fairness, and content life', () => {
	const skillName = 'game-economy-monetization-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Separate five decisions/u);
	assert.match(localSkill, /Classify the loop before monetizing it/u);
	assert.match(localSkill, /Preserve outcome integrity/u);
	assert.match(localSkill, /Preserve a satisfying free session/u);
	assert.match(localSkill, /Classify failure cause/u);
	assert.match(localSkill, /A one-revive policy can be a candidate/u);
	assert.match(localSkill, /Differentiate rewarded ads from credits/u);
	assert.match(localSkill, /preserve the ordinary path when the ad is unavailable/u);
	assert.match(localSkill, /Measure ad incrementality/u);
	assert.match(localSkill, /Treat energy as a pacing control/u);
	assert.match(localSkill, /Stress content burn/u);
	assert.match(localSkill, /Avoid unlimited consumable arbitrage/u);
	assert.match(localSkill, /multiple content and billing cycles/u);
	assert.match(localSkill, /game-liveops-commerce-integrity-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/game-economy-monetization-review\/SKILL\.md/u);
	assert.match(skillIndex, /ranked outcome sold/u);
	assert.match(
		routes,
		/\[routes\."game-economy-monetization-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 57/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/game-economy-monetization-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"game-economy-monetization-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"game-economy-monetization-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"game-economy-monetization-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});

test('freemium ad monetization review preserves first value and natural transitions', () => {
	const skillName = 'freemium-ad-monetization-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split five decisions/u);
	assert.match(localSkill, /full-funnel outcome per eligible assigned user/u);
	assert.match(localSkill, /complete and possess a representative core result/u);
	assert.match(localSkill, /Do not universalize one free result/u);
	assert.match(localSkill, /Ad gross revenue is not free-user profit/u);
	assert.match(localSkill, /genuine natural transition/u);
	assert.match(localSkill, /Never hold the completed core result behind a forced ad/u);
	assert.match(localSkill, /not an unfamiliar product's first attempt/u);
	assert.match(localSkill, /the user will not wait twice/u);
	assert.match(localSkill, /Keep rewarded ads genuinely optional/u);
	assert.match(localSkill, /Make ad unavailability failure-safe/u);
	assert.match(localSkill, /do not copy universal task counts or minute intervals/u);
	assert.match(localSkill, /Account for privacy, age, consent, accessibility/u);
	assert.match(localSkill, /growth-distribution-integrity-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/freemium-ad-monetization-review\/SKILL\.md/u);
	assert.match(skillIndex, /completed result held hostage/u);
	assert.match(
		routes,
		/\[routes\."freemium-ad-monetization-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 58/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/freemium-ad-monetization-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"freemium-ad-monetization-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"freemium-ad-monetization-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});

test('referral incentive integrity review separates direction, qualification, vesting, and tiers', () => {
	const skillName = 'referral-incentive-integrity-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split four decisions/u);
	assert.match(localSkill, /Dual-sided and tiered rewards are not competing alternatives/u);
	assert.match(localSkill, /incremental contribution per eligible participant/u);
	assert.match(localSkill, /Make attribution deterministic/u);
	assert.match(localSkill, /Do not equate signup with a valid referral/u);
	assert.match(localSkill, /Delay inviter vesting/u);
	assert.match(localSkill, /Keep reward states explicit/u);
	assert.match(localSkill, /Define reversal before launch/u);
	assert.match(localSkill, /equal expected total budget/u);
	assert.match(localSkill, /Add tiers only to valid referrals/u);
	assert.match(localSkill, /one shared IP, device, or household is not sufficient proof/u);
	assert.match(localSkill, /Design for legitimate collisions/u);
	assert.match(localSkill, /Referred-versus-organic revenue alone is observational/u);
	assert.match(localSkill, /growth-distribution-integrity-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/referral-incentive-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /signup treated as valid referral/u);
	assert.match(
		routes,
		/\[routes\."referral-incentive-integrity-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 59/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/referral-incentive-integrity-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"referral-incentive-integrity-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"referral-incentive-integrity-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});

test('pricing model integrity review separates cash, rights, pricing, and retained contribution', () => {
	const skillName = 'pricing-model-integrity-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split the work into six decisions/u);
	assert.match(localSkill, /full-funnel impact/u);
	assert.match(localSkill, /There is no universal winner/u);
	assert.match(localSkill, /Measure the entire trial funnel/u);
	assert.match(localSkill, /Make recurring conversion explicit/u);
	assert.match(localSkill, /current cash receipt plus a long-lived delivery obligation/u);
	assert.match(localSkill, /cash break-even and economic break-even separately/u);
	assert.match(localSkill, /heavy-user share/u);
	assert.match(localSkill, /Bound future-cost rights/u);
	assert.match(localSkill, /Reserve for remaining delivery/u);
	assert.match(localSkill, /local-currency presentment from a regional price reduction/u);
	assert.match(localSkill, /Use purchasing-power data only as a prior/u);
	assert.match(localSkill, /Do not use IP alone/u);
	assert.match(localSkill, /regional discount is not a fraud control/u);
	assert.match(localSkill, /Select the monetization model from value cadence/u);
	assert.match(localSkill, /user-recognizable value unit/u);
	assert.match(localSkill, /Distinguish payer ARPPU from eligible-user ARPU and contribution/u);
	assert.match(localSkill, /Keep annual cash separate from earned economics/u);
	assert.match(localSkill, /fixed ten, twenty, thirty, or forty percent is an experiment set/u);
	assert.match(localSkill, /llm-product-monetization-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/pricing-model-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /annual cash confused with recognized revenue/u);
	assert.match(
		routes,
		/\[routes\."pricing-model-integrity-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 56/u,
	);
	assert.match(localSkill, /credit-monetization-integrity-review/u);
	assert.match(localSkill, /subscription-retention-profit-review/u);
	assert.match(localSkill, /product-onboarding-activation-review/u);
	assert.match(routes, /suggests_adjuncts = \["payment-integrity-review", "date-number-audit"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/pricing-model-integrity-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"pricing-model-integrity-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"pricing-model-integrity-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});

test('product engagement retention review separates value, streak, reward, and reminder causality', () => {
	const skillName = 'product-engagement-retention-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /separate mechanisms with separate eligibility/u);
	assert.match(localSkill, /no-message, no-streak, or no-reward holdout/u);
	assert.match(localSkill, /Raw session, click, token, character, or generation counts/u);
	assert.match(localSkill, /Omit the claim when the method is not defensible/u);
	assert.match(localSkill, /zero or low activity deliberately/u);
	assert.match(localSkill, /Define streak credit from completed value, not presence/u);
	assert.match(localSkill, /Align streak cadence with real value/u);
	assert.match(localSkill, /Separate streak from reward experimentally/u);
	assert.match(localSkill, /withdrawing the reward/u);
	assert.match(localSkill, /Measure natural return before choosing timing/u);
	assert.match(localSkill, /Compare silence with bounded single-send timing arms first/u);
	assert.match(localSkill, /Do not copy a universal ten-minute, twenty-four-hour, or three-day sequence/u);
	assert.match(localSkill, /Cancel scheduled reminders on natural return/u);
	assert.match(localSkill, /unsubscribe, block, uninstall/u);
	assert.match(skillIndex, /\.mustflow\/skills\/product-engagement-retention-review\/SKILL\.md/u);
	assert.match(skillIndex, /raw activity presented as value/u);
	assert.match(
		routes,
		/\[routes\."product-engagement-retention-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 54/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/product-engagement-retention-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"product-engagement-retention-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"product-engagement-retention-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('credit monetization integrity review protects economic equivalence and purchased rights', () => {
	const skillName = 'credit-monetization-integrity-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Separate six decisions/u);
	assert.match(localSkill, /Randomize before the offer can become eligible/u);
	assert.match(localSkill, /Price interruption cost/u);
	assert.match(localSkill, /Normalize economic value before testing copy/u);
	assert.match(localSkill, /effective unit discount is/u);
	assert.match(localSkill, /depletion-\s+adjusted repurchase/u);
	assert.match(localSkill, /Three packs are a\s+useful first-purchase hypothesis, not a law/u);
	assert.match(localSkill, /Reject fake decoys/u);
	assert.match(localSkill, /Classify every balance lot by acquired right/u);
	assert.match(localSkill, /Do not treat purchased-credit expiry as free margin/u);
	assert.match(localSkill, /Gate expiry through current authority/u);
	assert.match(localSkill, /A one-cycle or\s+multiple-of-quota cap is a candidate, not a universal default/u);
	assert.match(localSkill, /Never consume durable purchased value first/u);
	assert.match(localSkill, /Show spend before execution/u);
	assert.match(localSkill, /Use a quote-reserve-settle flow/u);
	assert.match(localSkill, /Internal compute cost does not by itself prove customer value/u);
	assert.match(localSkill, /Breakage, raw execution, checkout start/u);
	assert.match(skillIndex, /\.mustflow\/skills\/credit-monetization-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /unequal discount and bonus called copy test/u);
	assert.match(
		routes,
		/\[routes\."credit-monetization-integrity-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 55/u,
	);
	assert.match(localSkill, /product-onboarding-activation-review/u);
	assert.match(routes, /suggests_adjuncts = \["credit-ledger-integrity-review", "payment-integrity-review", "date-number-audit"\]/u);
	assert.match(manifest, /"\.mustflow\/skills\/credit-monetization-integrity-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"credit-monetization-integrity-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"credit-monetization-integrity-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('LLM product monetization review separates value, queueing, recovery, transparency, and credentials', () => {
	const skillName = 'llm-product-monetization-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split seven decisions/u);
	assert.match(localSkill, /Classify the buyer/u);
	assert.match(localSkill, /Prefer a user-recognizable unit/u);
	assert.match(localSkill, /Bound every task unit/u);
	assert.match(localSkill, /Quote before execution/u);
	assert.match(localSkill, /Meter the complete internal cost/u);
	assert.match(localSkill, /p95 can be a candidate, not a universal law/u);
	assert.match(localSkill, /Keep public tiers model-independent by default/u);
	assert.match(localSkill, /deliberately poor cheap result/u);
	assert.match(localSkill, /Do not surprise-charge automatic escalation/u);
	assert.match(localSkill, /total cost per accepted\s+outcome/u);
	assert.match(localSkill, /capacity contract, not synthetic friction/u);
	assert.match(localSkill, /Protect first owned value/u);
	assert.match(localSkill, /bounded free path rather than strict paid-first starvation/u);
	assert.match(localSkill, /Do not show fake exact countdowns/u);
	assert.match(localSkill, /Classify failures before settlement/u);
	assert.match(localSkill, /automatically and idempotently/u);
	assert.match(localSkill, /same-lineage, nontransferable retry right/u);
	assert.match(localSkill, /Separate AI transparency from vendor merchandising/u);
	assert.match(localSkill, /auditable execution receipt/u);
	assert.match(localSkill, /pinned execution must not silently substitute another model/u);
	assert.match(localSkill, /Compare managed and BYOK from the full activation path/u);
	assert.match(localSkill, /Charge a platform fee/u);
	assert.match(localSkill, /Treat customer keys as secrets/u);
	assert.match(skillIndex, /\.mustflow\/skills\/llm-product-monetization-review\/SKILL\.md/u);
	assert.match(skillIndex, /automatic escalation surprise-charged/u);
	assert.match(
		routes,
		/\[routes\."llm-product-monetization-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 60/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/llm-product-monetization-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"llm-product-monetization-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"llm-product-monetization-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"llm-product-monetization-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 2);
});

test('game liveops commerce review prices content debt, fairness, and random-reward risk', () => {
	const skillName = 'game-liveops-commerce-integrity-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split four decisions/u);
	assert.match(localSkill, /Start with production capacity/u);
	assert.match(localSkill, /season pass as a dated content and progression obligation/u);
	assert.match(localSkill, /familiar week count\s+or hundred-tier template is not a default/u);
	assert.match(localSkill, /Avoid attendance punishment/u);
	assert.match(localSkill, /future liability and cannibalization/u);
	assert.match(localSkill, /membership as an ongoing-value obligation/u);
	assert.match(localSkill, /Classify every catalog item/u);
	assert.match(localSkill, /Make cosmetics visible and valuable without harming play/u);
	assert.match(localSkill, /Preserve the fair ceiling/u);
	assert.match(localSkill, /Price PvE power by content burn/u);
	assert.match(localSkill, /Prefer deterministic purchase contents/u);
	assert.match(localSkill, /paid random rewards as a separate high-risk product/u);
	assert.match(localSkill, /Do not infer safety from disclosure/u);
	assert.match(localSkill, /inspect indirect consideration/u);
	assert.match(localSkill, /Measure payer distribution, not only averages/u);
	assert.match(skillIndex, /\.mustflow\/skills\/game-liveops-commerce-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /loot-box disclosure treated as complete safety/u);
	assert.match(
		routes,
		/\[routes\."game-liveops-commerce-integrity-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 61/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/game-liveops-commerce-integrity-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"game-liveops-commerce-integrity-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"game-liveops-commerce-integrity-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"game-liveops-commerce-integrity-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('growth distribution integrity review protects artifacts, partner economics, and source products', () => {
	const skillName = 'growth-distribution-integrity-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split the review into artifact attribution, partner compensation, and owned cross-promotion/u);
	assert.match(localSkill, /incremental retained contribution per eligible source user/u);
	assert.match(localSkill, /Do not infer reach from export count alone/u);
	assert.match(localSkill, /Preserve the completed result/u);
	assert.match(localSkill, /visible and machine-readable marks solve\s+different problems/u);
	assert.match(localSkill, /Do not embed user, recipient, prompt, tenant, or private tracking data/u);
	assert.match(localSkill, /equal expected budget and qualification quality/u);
	assert.match(localSkill, /Treat lifetime commission as a long-lived liability/u);
	assert.match(localSkill, /clear and conspicuous near the endorsement or link/u);
	assert.match(localSkill, /cookie stuffing/u);
	assert.match(localSkill, /ownership by the\s+same operator alone does not make two products relevant/u);
	assert.match(localSkill, /Deliver the source product's primary value before promotion/u);
	assert.match(localSkill, /Internal exposure is\s+not free/u);
	assert.match(localSkill, /persistent holdouts/u);
	assert.match(localSkill, /referral-incentive-integrity-review/u);
	assert.match(localSkill, /freemium-ad-monetization-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/growth-distribution-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /lifetime commission granted without continuing value/u);
	assert.match(
		routes,
		/\[routes\."growth-distribution-integrity-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 62/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/growth-distribution-integrity-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"growth-distribution-integrity-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"growth-distribution-integrity-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"growth-distribution-integrity-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('product portfolio integrity review separates convenience from rights and failure domains', () => {
	const skillName = 'product-portfolio-integrity-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split four decisions: account, wallet, subscription package, and brand architecture/u);
	assert.match(localSkill, /Use a global identity only to remove repeated identity proof/u);
	assert.match(localSkill, /recognized by product B has no B entitlement/u);
	assert.match(localSkill, /shared wallet as a transfer mechanism, not demand creation/u);
	assert.match(localSkill, /One nominal credit need not buy the same resource or\s+outcome/u);
	assert.match(localSkill, /Prevent wallet arbitrage and cannibalization/u);
	assert.match(localSkill, /mixed bundling as a candidate,\s+not a universal winner/u);
	assert.match(localSkill, /door opened by the package does not\s+create cross-use/u);
	assert.match(localSkill, /Choose a brand model from customer fit and failure cost/u);
	assert.match(localSkill, /Do not confuse brand separation with failure isolation/u);
	assert.match(localSkill, /Roll out in identifiable stages/u);
	assert.match(localSkill, /small-service-platform-architecture-review/u);
	assert.match(localSkill, /growth-distribution-integrity-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/product-portfolio-integrity-review\/SKILL\.md/u);
	assert.match(skillIndex, /logo separation called failure isolation/u);
	assert.match(
		routes,
		/\[routes\."product-portfolio-integrity-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 63/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/product-portfolio-integrity-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"product-portfolio-integrity-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"product-portfolio-integrity-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"product-portfolio-integrity-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('localization market expansion review stages languages by support depth and contribution', () => {
	const skillName = 'localization-market-expansion-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split three decisions: internationalization readiness, marketed or indexed locale/u);
	assert.match(localSkill, /English is a candidate, not\s+a universal first language/u);
	assert.match(localSkill, /Define explicit locale stages/u);
	assert.match(localSkill, /Before accepting payment, require native-capable review/u);
	assert.match(localSkill, /Classify translation by consequence, not only language/u);
	assert.match(localSkill, /Treat AI translation as a versioned draft producer/u);
	assert.match(localSkill, /Do not translate keywords literally/u);
	assert.match(localSkill, /Create stable crawler-visible locale URLs/u);
	assert.match(localSkill, /Do not mass-publish translated or generated pages/u);
	assert.match(localSkill, /Disclose product-language gaps/u);
	assert.match(localSkill, /Traffic and indexed-page counts are diagnostic/u);
	assert.match(localSkill, /Include recurring maintenance cost/u);
	assert.match(localSkill, /frontend-localization-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/localization-market-expansion-review\/SKILL\.md/u);
	assert.match(skillIndex, /translated page hiding an untranslated product/u);
	assert.match(
		routes,
		/\[routes\."localization-market-expansion-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 64/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/localization-market-expansion-review\/SKILL\.md"/u);
	for (const profile of productProfiles) {
		assert.match(readProfile(manifest, profile), /"localization-market-expansion-review"/u);
	}
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"localization-market-expansion-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('desktop commercial distribution review keeps one core across direct, store, and hybrid channels', () => {
	const skillName = 'desktop-commercial-distribution-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split six decisions: discovery, binary delivery, checkout, entitlement, updates, and support/u);
	assert.match(localSkill, /Refresh official platform policy by date, app type, commerce type, region, and program/u);
	assert.match(localSkill, /Build a capability matrix/u);
	assert.match(localSkill, /Compare discovery as incremental acquisition/u);
	assert.match(localSkill, /Calculate net channel contribution/u);
	assert.match(localSkill, /Evaluate Windows store, direct, and hybrid paths/u);
	assert.match(localSkill, /Evaluate Mac App Store, notarized direct, and hybrid paths/u);
	assert.match(localSkill, /Keep one application core/u);
	assert.match(localSkill, /Define one entitlement model with channel provenance/u);
	assert.match(localSkill, /Do not promise cross-channel portability automatically/u);
	assert.match(localSkill, /Assign update ownership per channel/u);
	assert.match(localSkill, /Measure self-selection/u);
	assert.match(localSkill, /desktop-auto-update-safety-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/desktop-commercial-distribution-review\/SKILL\.md/u);
	assert.match(skillIndex, /product core forked by channel/u);
	assert.match(
		routes,
		/\[routes\."desktop-commercial-distribution-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 65/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/desktop-commercial-distribution-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"desktop-commercial-distribution-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"desktop-commercial-distribution-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"desktop-commercial-distribution-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('client platform strategy review separates delivery surface from data authority', () => {
	const skillName = 'client-platform-strategy-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Split two primary decisions: client delivery surface and data authority/u);
	assert.match(localSkill, /operating system is part of the product's core value/u);
	assert.match(localSkill, /smallest surface that can deliver representative first value/u);
	assert.match(localSkill, /Separate PWA layers/u);
	assert.match(localSkill, /Use D30-or-product-cadence qualified CAC/u);
	assert.match(localSkill, /If native contribution\s+per user is not higher/u);
	assert.match(localSkill, /Derive break-even users from current inputs/u);
	assert.match(localSkill, /Correct self-selection/u);
	assert.match(localSkill, /Map data authority by class/u);
	assert.match(localSkill, /Price local-first engineering honestly/u);
	assert.match(localSkill, /Last write wins and CRDTs do not decide product policy automatically/u);
	assert.match(localSkill, /Make privacy claims reconstructable/u);
	assert.match(localSkill, /desktop-commercial-distribution-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/client-platform-strategy-review\/SKILL\.md/u);
	assert.match(skillIndex, /local-first chosen to save raw storage cost/u);
	assert.match(
		routes,
		/\[routes\."client-platform-strategy-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 66/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/client-platform-strategy-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"client-platform-strategy-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"client-platform-strategy-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"client-platform-strategy-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});

test('service portfolio capital allocation review prices failure, closure, and founder time', () => {
	const skillName = 'service-portfolio-capital-allocation-review';
	const localSkill = readText(`.mustflow/skills/${skillName}/SKILL.md`);
	const templateSkill = readText(`templates/default/locales/en/.mustflow/skills/${skillName}/SKILL.md`);
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Use contribution after variable cost, refund, support, and direct/u);
	assert.match(localSkill, /Do not use arbitrary weighted scores/u);
	assert.match(localSkill, /Common code does not require common outages/u);
	assert.match(localSkill, /Price correlated failure separately/u);
	assert.match(localSkill, /both a lower break-even bound\s+and an upper point/u);
	assert.match(localSkill, /Use effective service count alongside raw count/u);
	assert.match(localSkill, /Test cell isolation/u);
	assert.match(localSkill, /Build each service's continue-versus-close cash flow/u);
	assert.match(localSkill, /Prevent double counting/u);
	assert.match(localSkill, /Price founder time at the greater relevant alternative/u);
	assert.match(localSkill, /Gate a final rescue experiment by expected incremental value/u);
	assert.match(localSkill, /Allocate the next hour to the candidate with the highest current marginal contribution/u);
	assert.match(localSkill, /Charge context switching and work-in-progress/u);
	assert.match(localSkill, /small-service-platform-architecture-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/service-portfolio-capital-allocation-review\/SKILL\.md/u);
	assert.match(skillIndex, /MAU used as shutdown threshold/u);
	assert.match(
		routes,
		/\[routes\."service-portfolio-capital-allocation-review"\]\r?\ncategory = "workflow_contracts"\r?\nroute_type = "primary"\r?\npriority = 67/u,
	);
	assert.match(manifest, /"\.mustflow\/skills\/service-portfolio-capital-allocation-review\/SKILL\.md"/u);
	assert.match(readProfile(manifest, 'product'), /"service-portfolio-capital-allocation-review"/u);
	assert.doesNotMatch(readProfile(manifest, 'team'), /"service-portfolio-capital-allocation-review"/u);
	for (const profile of excludedProfiles) {
		assert.doesNotMatch(readProfile(manifest, profile), /"service-portfolio-capital-allocation-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assertI18nSkillDocument(i18n, skillName, 1);
});
