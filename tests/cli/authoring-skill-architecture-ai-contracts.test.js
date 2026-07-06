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

test('service boundary architecture keeps large-system boundaries ownership-first and template-synced', () => {
	const localSkill = readText('.mustflow/skills/service-boundary-architecture/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/service-boundary-architecture/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /Start by identifying ownership and failure pressure/u);
	assert.match(localSkill, /source of truth/u);
	assert.match(localSkill, /Split first by reason to change, not by noun/u);
	assert.match(localSkill, /Reject shared database ownership/u);
	assert.match(localSkill, /Design failure flows before the happy path/u);
	assert.match(localSkill, /Require idempotency/u);
	assert.match(localSkill, /Treat queues as storage and backpressure/u);
	assert.match(localSkill, /Treat caches as a consistency tradeoff/u);
	assert.match(localSkill, /past-tense fact events/u);
	assert.match(localSkill, /Tenant ID must travel/u);
	assert.match(localSkill, /p95, p99, error rate, queue age/u);
	assert.match(localSkill, /manual changes with audit and approval/u);
	assert.match(skillIndex, /\.mustflow\/skills\/service-boundary-architecture\/SKILL\.md/u);
	assert.match(skillIndex, /remaining service-boundary risk/u);
	assert.match(routes, /\[routes\."service-boundary-architecture"\]\r?\ncategory = "architecture_patterns"\r?\nroute_type = "primary"/u);
	assert.match(manifest, /"\.mustflow\/skills\/service-boundary-architecture\/SKILL\.md"/u);
	assert.match(manifest, /"service-boundary-architecture"/u);
	assert.match(i18n, /\[documents\."skill\.service-boundary-architecture"\]/u);
});

test('small service platform architecture review keeps product factories registry-led and template-synced', () => {
	const localSkill = readText('.mustflow/skills/small-service-platform-architecture-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/small-service-platform-architecture-review/SKILL.md',
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
	assert.match(localSkill, /app factory, not as many copied services/u);
	assert.match(localSkill, /Product Registry ledger/u);
	assert.match(localSkill, /Identity ledger/u);
	assert.match(localSkill, /Money and access ledger/u);
	assert.match(localSkill, /Operations ledger/u);
	assert.match(localSkill, /App factory ledger/u);
	assert.match(localSkill, /Observability and analytics ledger/u);
	assert.match(localSkill, /Shared product surface ledger/u);
	assert.match(localSkill, /Reject feature gates such as `plan === "pro"`/u);
	assert.match(localSkill, /Reject balance-only credits/u);
	assert.match(localSkill, /first-value-created event/u);
	assert.match(localSkill, /Phase one should cover Product Registry/u);
	assert.match(localSkill, /shared packages cannot be upgraded across product shells/u);
	assert.match(skillIndex, /\.mustflow\/skills\/small-service-platform-architecture-review\/SKILL\.md/u);
	assert.match(skillIndex, /Product Registry\/identity\/billing\/credit\/entitlement/u);
	assert.match(skillIndex, /per-service auth or billing copy/u);
	assert.match(
		routes,
		new RegExp(
			[
				String.raw`\[routes\."small-service-platform-architecture-review"\]`,
				String.raw`\r?\ncategory = "architecture_patterns"`,
				String.raw`\r?\nroute_type = "primary"`,
				String.raw`\r?\npriority = 84`,
			].join(''),
			'u',
		),
	);
	assert.deepEqual(routeReasons(routes, 'small-service-platform-architecture-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'docs_change',
		'public_api_change',
		'data_change',
		'migration_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'ui_change',
		'product_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/small-service-platform-architecture-review\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"small-service-platform-architecture-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.small-service-platform-architecture-review"\][\s\S]*?revision = 1/u);
});

test('llm service UX review captures controllable AI interaction states', () => {
	const localSkill = readText('.mustflow/skills/llm-service-ux-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/llm-service-ux-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');

	assert.equal(localSkill, templateSkill);
	assert.match(localSkill, /prompt composer/u);
	assert.match(localSkill, /streaming response/u);
	assert.match(localSkill, /Clickable citations should appear only for sources actually used/u);
	assert.match(localSkill, /stop or cancel/u);
	assert.match(localSkill, /automation bias/u);
	assert.match(localSkill, /auto-scroll should pause/u);
	assert.match(localSkill, /non-AI or manual path/u);
	assert.match(localSkill, /exact passage links or previews/u);
	assert.match(localSkill, /avoid resending unnecessary history/u);
	assert.match(localSkill, /Conversation history, current thread, summarized context, and new-chat behavior/u);
	assert.match(localSkill, /Do not expose hidden reasoning/u);
	assert.match(localSkill, /agent-execution-control-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/llm-service-ux-review\/SKILL\.md/u);
	assert.match(skillIndex, /remaining LLM UX risk/u);
});

test('AI product readiness review gates AI features before specialist LLM skills', () => {
	const localSkill = readText('.mustflow/skills/ai-product-readiness-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/ai-product-readiness-review/SKILL.md',
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
	assert.match(localSkill, /AI features as product and operating systems, not as model calls/u);
	assert.match(localSkill, /AI Gateway/u);
	assert.match(localSkill, /Product role ledger/u);
	assert.match(localSkill, /Gateway ledger/u);
	assert.match(localSkill, /Authority and action ledger/u);
	assert.match(localSkill, /Cost and cache ledger/u);
	assert.match(localSkill, /Eval ledger/u);
	assert.match(localSkill, /Model portability ledger/u);
	assert.match(localSkill, /Classify the AI role/u);
	assert.match(localSkill, /server-side policy engine/u);
	assert.match(localSkill, /Design cache keys as security boundaries/u);
	assert.match(localSkill, /Build evals before launch claims/u);
	assert.match(localSkill, /fallback a product state machine/u);
	assert.match(localSkill, /Review streaming by risk/u);
	assert.match(localSkill, /Protect data beyond provider training policy/u);
	assert.match(localSkill, /Make model portability explicit/u);
	assert.match(localSkill, /Instrument without raw-content leakage/u);
	assert.match(localSkill, /prompt_cache_audit/u);
	assert.match(localSkill, /llm-token-cost-control-review/u);
	assert.match(localSkill, /cache-integrity-review/u);
	assert.match(localSkill, /source-freshness-check/u);
	assert.match(localSkill, /Remaining AI product-readiness risk/u);
	assert.match(skillIndex, /\.mustflow\/skills\/ai-product-readiness-review\/SKILL\.md/u);
	assert.match(skillIndex, /model-as-product shortcut/u);
	assert.match(skillIndex, /fallback-as-second-model/u);
	assert.match(skillIndex, /remaining AI product-readiness risk/u);
	assert.match(routes, /\[routes\."ai-product-readiness-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 64/u);
	assert.deepEqual(routeReasons(routes, 'ai-product-readiness-review'), [
		'unknown_change',
		'code_change',
		'behavior_change',
		'test_change',
		'docs_change',
		'public_api_change',
		'data_change',
		'performance_change',
		'security_change',
		'privacy_change',
		'ui_change',
		'product_change',
		'package_metadata_change',
		'release_risk',
	]);
	assert.match(manifest, /"\.mustflow\/skills\/ai-product-readiness-review\/SKILL\.md"/u);
	for (const profile of ['minimal', 'patterns', 'oss', 'team', 'product', 'library']) {
		const profileMatch = new RegExp(`^${profile} = \\[([\\s\\S]*?)^\\]`, 'mu').exec(manifest);
		assert.ok(profileMatch, `missing ${profile} profile`);
		assert.match(profileMatch[1], /"ai-product-readiness-review"/u);
	}
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.ai-product-readiness-review"\][\s\S]*?revision = 1/u);
});

test('prompt contract quality review treats prompts as product contracts', () => {
	const localSkill = readText('.mustflow/skills/prompt-contract-quality-review/SKILL.md');
	const templateSkill = readText('templates/default/locales/en/.mustflow/skills/prompt-contract-quality-review/SKILL.md');
	const skillIndex = readText('.mustflow/skills/INDEX.md');
	const templateSkillIndex = readText('templates/default/locales/en/.mustflow/skills/INDEX.md');
	const routes = readText('.mustflow/skills/routes.toml');
	const templateRoutes = readText('templates/default/locales/en/.mustflow/skills/routes.toml');
	const manifest = readText('templates/default/manifest.toml');
	const i18n = readText('templates/default/i18n.toml');

	assert.equal(localSkill, templateSkill);
	assert.equal(skillIndex, templateSkillIndex);
	assert.equal(routes, templateRoutes);
	assert.match(localSkill, /prompts as product contracts/u);
	assert.match(localSkill, /function with named inputs/u);
	assert.match(localSkill, /output schema/u);
	assert.match(localSkill, /tool policy/u);
	assert.match(localSkill, /success criteria and the eval set before rewriting/u);
	assert.match(localSkill, /pinned model snapshot/u);
	assert.match(localSkill, /version-controlled source of truth/u);
	assert.match(localSkill, /Separate authority classes/u);
	assert.match(localSkill, /user input and retrieved text as data, not authority/u);
	assert.match(localSkill, /boundary cases/u);
	assert.match(localSkill, /JSON-parse success is not enough/u);
	assert.match(localSkill, /when not to use tools/u);
	assert.match(localSkill, /independent calls may run in parallel/u);
	assert.match(localSkill, /dependent calls must run sequentially/u);
	assert.match(localSkill, /reasoning and token budget/u);
	assert.match(localSkill, /validation fields rather than hidden reasoning/u);
	assert.match(localSkill, /Define agent completion/u);
	assert.match(localSkill, /ok`, `needs_more_info`, `refused`, `unsafe`, `tool_failed`, `no_evidence/u);
	assert.match(localSkill, /JSON-parse theater/u);
	assert.match(localSkill, /llm-hallucination-control-review/u);
	assert.match(localSkill, /llm-token-cost-control-review/u);
	assert.match(localSkill, /llm-response-latency-review/u);
	assert.match(localSkill, /agent-execution-control-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/prompt-contract-quality-review\/SKILL\.md/u);
	assert.match(skillIndex, /prompt-as-function gap/u);
	assert.match(skillIndex, /remaining prompt-contract risk/u);
	assert.match(routes, /\[routes\."prompt-contract-quality-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 66/u);
	assert.match(manifest, /"\.mustflow\/skills\/prompt-contract-quality-review\/SKILL\.md"/u);
	assert.match(manifest, /"prompt-contract-quality-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.prompt-contract-quality-review"\][\s\S]*?revision = 2/u);
});

test('LLM hallucination control review keeps factual answers evidence-gated', () => {
	const localSkill = readText('.mustflow/skills/llm-hallucination-control-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/llm-hallucination-control-review/SKILL.md',
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
	assert.match(localSkill, /unsupported factual claims/u);
	assert.match(localSkill, /answerable/u);
	assert.match(localSkill, /missing_info/u);
	assert.match(localSkill, /evidence_ids/u);
	assert.match(localSkill, /claim_map/u);
	assert.match(localSkill, /unsupported_claim_count/u);
	assert.match(localSkill, /retrieval thresholds/u);
	assert.match(localSkill, /source coverage metrics/u);
	assert.match(localSkill, /Validate citations and source IDs/u);
	assert.match(localSkill, /top-k is empty, scores are below threshold/u);
	assert.match(localSkill, /lexical, vector, hybrid, rerank, or exact-ID search/u);
	assert.match(localSkill, /original evidence spans/u);
	assert.match(localSkill, /Split complex factual tasks into subquestions/u);
	assert.match(localSkill, /Server-known `user_id`, `workspace_id`, `order_id`/u);
	assert.match(localSkill, /Move calculations and deterministic facts to code or tools/u);
	assert.match(localSkill, /source-of-truth priority/u);
	assert.match(localSkill, /dirty eval fixtures/u);
	assert.match(localSkill, /LLM judges as triage signals, not sole truth/u);
	assert.match(localSkill, /false_citation_rate/u);
	assert.match(localSkill, /low-temperature settings/u);
	assert.match(localSkill, /llm-token-cost-control-review/u);
	assert.match(localSkill, /llm-response-latency-review/u);
	assert.match(localSkill, /agent-execution-control-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/llm-hallucination-control-review\/SKILL\.md/u);
	assert.match(skillIndex, /unsupported factual claim/u);
	assert.match(skillIndex, /remaining hallucination-control risk/u);
	assert.match(routes, /\[routes\."llm-hallucination-control-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 67/u);
	assert.match(manifest, /"\.mustflow\/skills\/llm-hallucination-control-review\/SKILL\.md"/u);
	assert.match(manifest, /"llm-hallucination-control-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.llm-hallucination-control-review"\][\s\S]*?revision = 2/u);
});

test('LLM token cost control review keeps model spend measurable and cache-aware', () => {
	const localSkill = readText('.mustflow/skills/llm-token-cost-control-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/llm-token-cost-control-review/SKILL.md',
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
	assert.match(localSkill, /LLM cost as a product and systems contract/u);
	assert.match(localSkill, /provider prompt-cache hit rate/u);
	assert.match(localSkill, /cost per successful task/u);
	assert.match(localSkill, /stable instructions, examples, tools, schemas/u);
	assert.match(localSkill, /Cache ledger/u);
	assert.match(localSkill, /stable prefix boundary/u);
	assert.match(localSkill, /prompt version hash/u);
	assert.match(localSkill, /volatile IDs, dates, random values/u);
	assert.match(localSkill, /previous_response_id/u);
	assert.match(localSkill, /provider conversation state/u);
	assert.match(localSkill, /Measure before cutting/u);
	assert.match(localSkill, /Split stable prefix from volatile suffix/u);
	assert.match(localSkill, /Hash the expensive prefix/u);
	assert.match(localSkill, /Review provider prompt caching/u);
	assert.match(localSkill, /app-level caching/u);
	assert.match(localSkill, /Trim chat history by state/u);
	assert.match(localSkill, /Shrink RAG by evidence span/u);
	assert.match(localSkill, /Tool descriptions and JSON schemas/u);
	assert.match(localSkill, /Route before calling the expensive model/u);
	assert.match(localSkill, /Budget reasoning and output together/u);
	assert.match(localSkill, /Prefer patches over full regeneration/u);
	assert.match(localSkill, /Repair failures without full replay/u);
	assert.match(localSkill, /Separate realtime and offline work/u);
	assert.match(localSkill, /Treat predicted outputs as a latency tool/u);
	assert.match(localSkill, /llm-response-latency-review/u);
	assert.match(localSkill, /agent-execution-control-review/u);
	assert.match(localSkill, /prompt_cache_audit/u);
	assert.match(localSkill, /static layout evidence rather than provider billing proof/u);
	assert.match(localSkill, /input tokens, cached tokens, output tokens, reasoning tokens/u);
	assert.match(localSkill, /source-freshness-check/u);
	assert.match(localSkill, /sensitive prompt or user data/u);
	assert.match(skillIndex, /\.mustflow\/skills\/llm-token-cost-control-review\/SKILL\.md/u);
	assert.match(skillIndex, /prompt-cache prefix drift/u);
	assert.match(skillIndex, /prompt_cache_audit/u);
	assert.match(skillIndex, /remaining token-cost risk/u);
	assert.match(routes, /\[routes\."llm-token-cost-control-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 68/u);
	assert.match(routes, /"performance_change"/u);
	assert.match(manifest, /"\.mustflow\/skills\/llm-token-cost-control-review\/SKILL\.md"/u);
	assert.match(manifest, /"llm-token-cost-control-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.llm-token-cost-control-review"\][\s\S]*?revision = 2/u);
});

test('LLM response latency review keeps first useful output measurable', () => {
	const localSkill = readText('.mustflow/skills/llm-response-latency-review/SKILL.md');
	const templateSkill = readText(
		'templates/default/locales/en/.mustflow/skills/llm-response-latency-review/SKILL.md',
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
	assert.match(localSkill, /LLM speed as a user-visible request path/u);
	assert.match(localSkill, /time to first token/u);
	assert.match(localSkill, /first useful output/u);
	assert.match(localSkill, /tool wait/u);
	assert.match(localSkill, /LLM round trips/u);
	assert.match(localSkill, /cache behavior/u);
	assert.match(localSkill, /Request timeline ledger/u);
	assert.match(localSkill, /Call graph ledger/u);
	assert.match(localSkill, /`first_useful_token_ms`/u);
	assert.match(localSkill, /Provider-specific latency features/u);
	assert.match(localSkill, /Do not optimize by hardcoding one reported prompt/u);
	assert.match(localSkill, /Do not stream unsafe or policy-sensitive partial output/u);
	assert.match(localSkill, /Name the latency unit/u);
	assert.match(localSkill, /Count LLM round trips/u);
	assert.match(localSkill, /Parallelize independent work/u);
	assert.match(localSkill, /Use speculative work with an exit plan/u);
	assert.match(localSkill, /Make the first output useful/u);
	assert.match(localSkill, /Cap output by measured p95 shape/u);
	assert.match(localSkill, /Separate stable prefix and volatile suffix/u);
	assert.match(localSkill, /Review prompt-cache and context-cache behavior as latency evidence/u);
	assert.match(localSkill, /Trim history to state/u);
	assert.match(localSkill, /Route by latency and correctness/u);
	assert.match(localSkill, /Use predicted outputs only when most of the final text is already known/u);
	assert.match(localSkill, /Use realtime, WebSocket, or priority service paths/u);
	assert.match(localSkill, /prefix cache, KV cache reuse, batching, speculative decoding/u);
	assert.match(localSkill, /privacy-safe latency observability/u);
	assert.match(localSkill, /llm-token-cost-control-review/u);
	assert.match(localSkill, /prompt-contract-quality-review/u);
	assert.match(localSkill, /llm-hallucination-control-review/u);
	assert.match(localSkill, /llm-service-ux-review/u);
	assert.match(localSkill, /agent-execution-control-review/u);
	assert.match(localSkill, /api-request-performance-review/u);
	assert.match(skillIndex, /\.mustflow\/skills\/llm-response-latency-review\/SKILL\.md/u);
	assert.match(skillIndex, /slow first token/u);
	assert.match(skillIndex, /remaining response-latency risk/u);
	assert.match(routes, /\[routes\."llm-response-latency-review"\]\r?\ncategory = "general_code"\r?\nroute_type = "primary"\r?\npriority = 69/u);
	assert.match(routes, /"performance_change"/u);
	assert.match(manifest, /"\.mustflow\/skills\/llm-response-latency-review\/SKILL\.md"/u);
	assert.match(manifest, /"llm-response-latency-review"/u);
	assertSkillsIndexRevision(i18n);
	assert.match(i18n, /\[documents\."skill\.llm-response-latency-review"\][\s\S]*?revision = 1/u);
});
