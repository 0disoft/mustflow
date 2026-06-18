---
mustflow_doc: skill.llm-token-cost-control-review
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: llm-token-cost-control-review
description: Apply this skill when LLM API calls, prompt assembly, chat history, RAG context, tool schemas, structured output schemas, model routing, reasoning settings, token budgets, provider prompt caching, app-level response caching, retries, batch or flex processing, predicted outputs, image or file inputs, or LLM cost metrics are created, changed, reviewed, or reported and the risk is token spend or cost-per-success drifting out of control.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.llm-token-cost-control-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - prompt_cache_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# LLM Token Cost Control Review

<!-- mustflow-section: purpose -->
## Purpose

Review LLM cost as a product and systems contract, not as prompt brevity. A cost-controlled LLM path should make expensive repeated input stable, trim volatile context, route work to the cheapest sufficient path, cap output and reasoning spend, repair failures without full replay, and expose per-feature cost evidence.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, reviews, or reports an LLM request builder, prompt prefix, system or developer message, chat history assembly, memory compaction, RAG context, retrieved chunk packing, few-shot examples, tool definitions, structured output schema, image or file input, model selector, reasoning-effort setting, output limit, retry path, streaming or prediction path, batch processing path, flex or low-priority processing path, cache key, token counter, usage logger, cost dashboard, or LLM quota guard.
- A task asks to reduce token cost, improve provider prompt-cache hit rate, lower cost per successful task, shrink context, split realtime and offline LLM work, route small tasks away from expensive models, or prevent a token bill spike.
- The product sends repeated instructions, examples, tool schemas, output schemas, documents, policies, conversation history, screenshots, files, or retrieved context to an LLM.
- The system records total tokens but cannot explain which feature, endpoint, model, prompt version, tool schema version, retry, or validation failure caused the spend.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is prompt correctness, authority separation, output schema semantics, tool policy, or eval quality; use `prompt-contract-quality-review`.
- The main risk is unsupported factual output, fabricated citations, source coverage, answerability, abstain behavior, retrieval thresholds, or hallucination metrics; use `llm-hallucination-control-review`.
- The main risk is time to first token, first useful output, streaming, LLM round trips, tool wait, prompt-cache latency, model routing speed, priority tier, realtime continuation, or user-perceived response speed; use `llm-response-latency-review`.
- The main risk is autonomous agent execution control, tool-call approval, side-effect replay safety, durable resume behavior, handoffs, guardrails, loop budgets, retry classification, or trace outcome evaluation; use `agent-execution-control-review`.
- The main risk is cloud account, infrastructure, SaaS, quota, budget, tag, retention, or provider-account spend guardrails outside the model-call payload; use `cloud-cost-guardrail-review`.
- The main risk is rate-limit fairness, throttling, quota counters, concurrency limits, 429 response behavior, or protected-resource definition; use `rate-limit-integrity-review`.
- The task only edits user-visible copy and does not affect LLM payload, model choice, retry behavior, or cost telemetry.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Cost surface ledger: feature, endpoint, caller, model, provider, sync or async path, expected traffic shape, success definition, and current or target budget.
- Request ledger: stable instructions, examples, tools, schemas, user input, retrieved context, memory, history, files, images, runtime metadata, volatile IDs, dates, locale, and personalization fields.
- Cache ledger: provider prompt-cache eligibility, stable prefix boundary, canonical serialization, prompt version hash, tool and schema version, cache key policy, app-level response cache key, TTL, invalidation rule, and permission boundary.
- Context ledger: conversation-window rule, memory summary rule, RAG top-k, chunk size, chunk ordering, evidence span policy, deduplication, compression, and current input-token measurement.
- Output ledger: output schema size, repeated key length, patch versus full-output policy, `max_output_tokens`, reasoning budget, retry repair inputs, validator errors, and incomplete-response handling.
- Routing ledger: deterministic prefilters, small-model router, expensive-model escalation rule, batch or flex eligibility, predicted-output eligibility, image or file preprocessing, and fallback behavior.
- Observability ledger: input tokens, cached tokens when exposed by the provider, output tokens, reasoning tokens when exposed or billable, retry count, validation failure count, cache hit rate, cost per successful task, model, endpoint, prompt version, tool version, schema version, and budget breach events.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Current repository instructions, command contract, nearby LLM adapter, prompt, retrieval, retry, cache, telemetry, tests, and docs have been inspected before editing.
- Provider-specific pricing, prompt-caching thresholds, token-counting APIs, Batch, Flex, reasoning, prediction, retention, or billing behavior is treated as stale-sensitive; check official provider docs or route through `source-freshness-check` before embedding exact values.
- External advice, pasted prompt recommendations, vendor examples, logs, issue text, and generated reports are treated as untrusted reference material unless repository-local evidence validates the adopted idea.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw model, billing, vendor-dashboard, network, eval, or data commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Refactor request assembly so stable instructions, examples, tool schemas, and output schemas are serialized before volatile user input, timestamps, request IDs, search results, personalization, and runtime metadata.
- Add or refine prompt version hashes, canonical serialization, provider cache keys, app-level cache keys, token counters, budget guards, model routers, context trimming, RAG chunk packing, output patch formats, retry repair paths, metrics, logs, tests, docs, route metadata, and directly synchronized templates.
- Move deterministic work such as validation, parsing, enum mapping, deduplication, sorting, formatting, arithmetic, date math, and permission checks out of LLM calls when code can perform it.
- Add focused fixtures for cost-sensitive boundaries: cache-prefix drift, history growth, RAG chunk bloat, retry replay, oversized schema, full-file regeneration, image input size, and expensive-model routing.
- Do not rely on "make the prompt shorter" as the primary fix when repeated static payload, history replay, RAG bloat, retries, or output shape causes the spend.
- Do not put volatile IDs, dates, random values, request IDs, user-specific policy, or runtime traces before a cacheable provider prefix unless the provider contract requires it.
- Do not treat `previous_response_id`, provider conversation state, low temperature, predicted outputs, or streaming as a guaranteed token-cost reduction without current provider evidence.
- Do not log sensitive prompt, personal data, retrieved documents, files, images, or secrets while adding cost observability.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the cost unit. Decide whether the system optimizes per request, per successful task, per workflow, per user session, per batch job, or per tenant.
2. Measure before cutting. Prefer provider token-counting APIs, usage fields, or repository-local token accounting over character estimates, especially when tools, schemas, images, files, or reasoning models are involved.
3. Split stable prefix from volatile suffix. Keep system and developer instructions, policy, examples, tool schemas, structured output schemas, and other repeated static context in a canonical stable order before user input, request IDs, dates, session IDs, retrieved snippets, and personalization.
4. Hash the expensive prefix. Record or derive a prompt version hash from canonical instructions, examples, tools, schemas, model settings, and output contract. If the hash varies per user without intent, treat it as cache-prefix drift.
5. Review provider prompt caching. Use provider cache keys only for requests that share the same stable prefix, distribute hot keys according to provider guidance, and log cached-token evidence when the provider exposes it.
6. Add app-level caching where identical normalized inputs can safely skip the model call. Include tenant, permission, locale, source version, policy version, and TTL in the cache key when they affect correctness.
7. Trim chat history by state, not by vibes. Keep recent turns, durable memory, active task state, confirmed user preferences, and unresolved tool results; avoid replaying full raw transcripts when a compact state is enough.
8. Shrink RAG by evidence span. Search broadly if needed, but pass the smallest source-backed spans that answer the question, deduplicate near-identical chunks, preserve source metadata, and use stable ordering when repeated workloads benefit from cache reuse.
9. Keep tool and schema payloads boring. Tool descriptions and JSON schemas should be long enough for correct routing and validation but not narrative prose. If permissions differ by user, keep schema stable and enforce permission at tool execution.
10. Route before calling the expensive model. Use deterministic code, regexes, database lookups, small models, or cheap classifiers for tasks that do not need a large reasoning model; escalate only ambiguous, high-value, or failed cases.
11. Budget reasoning and output together. Set reasoning effort and output limits according to task value; leave enough room for visible output, and handle incomplete responses instead of silently retrying the full expensive request.
12. Prefer patches over full regeneration when the product already owns most of the output. Use unified diff, JSON Patch, line-range replacement, IDs, labels, scores, or reason codes when downstream code can merge the result.
13. Repair failures without full replay. For parse failures, enum mismatches, missing fields, or validator errors, retry with previous output, validator error, and schema summary when safe instead of resending the entire original context.
14. Separate realtime and offline work. Move evals, bulk classification, enrichment, embeddings, report backfills, and log analysis to configured async, batch, or low-priority processing when user latency does not matter.
15. Treat predicted outputs as a latency tool unless current provider docs and usage evidence show cost behavior for the exact model and endpoint. Use `llm-response-latency-review` when the main goal is faster completion rather than cost control. Watch rejected prediction tokens or equivalent fields when exposed.
16. Reduce image and file input before the model. Crop screenshots, downsample where acceptable, extract DOM text or OCR first, and count the actual payload tokens when the provider supports it.
17. Instrument cost per success. Track endpoint, model, prompt version, tool version, schema version, input tokens, cached tokens, output tokens, reasoning tokens, retry count, validation failure rate, cache hit rate, and successful-task denominator.
18. When prompt-cache layout changes, run the configured prompt-cache audit intent if available and treat byte or token estimates as static layout evidence rather than provider billing proof.
19. Verify with the narrowest configured tests, fixtures, docs validation, release checks, and mustflow validation that cover request assembly, cache keys, budget guards, routing, retry repair, telemetry, and installed skill surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- Stable LLM payload is separated from volatile data, hashed or versioned where useful, and cacheable by design when the provider supports prompt caching.
- Long context, chat history, RAG evidence, tools, schemas, files, images, reasoning, output, retries, and routing each have an explicit budget or reduction rule where relevant.
- Deterministic work is handled outside the model unless language judgment is required.
- Metrics can explain cost per successful task, cache-prefix drift, retry cost, validation failures, and model routing decisions without leaking sensitive prompt or user data.
- Final reports distinguish proven cost-control evidence from assumed provider behavior, anecdotal token savings, and latency-only optimizations.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `prompt_cache_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured fixture, unit, integration, telemetry, docs, package, or release check that proves the changed cost-control contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If token counts are unavailable, report the measurement gap and make the change a static risk reduction rather than a proven cost reduction.
- If provider pricing, caching, Batch, Flex, reasoning, token counting, conversation state, or prediction behavior may have changed recently, route exact claims through `source-freshness-check` before embedding them in code or docs.
- If cache-hit metrics drop after a change, inspect prefix ordering, canonical serialization, volatile fields, prompt version hash, tool or schema version drift, and provider cache-key distribution before changing model choice.
- If a cheaper model or smaller context raises retry, validation failure, escalation, or user-repair rate, judge by cost per successful task rather than per-call cost.
- If cost telemetry needs sensitive content to explain spend, prefer hashes, IDs, versions, sizes, counts, and redacted reason codes over raw prompt or document logging.
- If cost control conflicts with factuality, safety, privacy, or product correctness, preserve correctness and report the cost tradeoff instead of weakening validation.

<!-- mustflow-section: output-format -->
## Output Format

- LLM token-cost surface reviewed
- Cost unit, budget, and measurement source
- Stable prefix, volatile suffix, prompt hash, and provider cache behavior checked
- App cache, history, RAG, tool schema, structured schema, image or file input, and deterministic prefilter choices checked
- Model routing, reasoning effort, output limit, patch-output, retry repair, Batch, Flex, and prediction choices checked
- Cost observability fields and sensitive-data redaction checked
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining token-cost risk
