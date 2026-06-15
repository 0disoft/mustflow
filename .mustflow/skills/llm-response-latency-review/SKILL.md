---
mustflow_doc: skill.llm-response-latency-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: llm-response-latency-review
description: Apply this skill when LLM response latency, time to first token, first useful output, streaming, output length, LLM round trips, tool-call wait, prompt-cache latency, model routing, speculative or parallel execution, realtime continuation, priority tiers, predicted outputs, or user-perceived AI speed are created, changed, reviewed, or reported and the risk is slow response rather than only token spend.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.llm-response-latency-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# LLM Response Latency Review

<!-- mustflow-section: purpose -->
## Purpose

Review LLM speed as a user-visible request path, not as a model-name swap. A latency-controlled LLM path should expose time to first token, first useful output, total completion time, LLM round trips, tool wait, queue wait, output length, cache behavior, routing decisions, and fallback behavior without leaking prompt or user data.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, reviews, or reports an LLM request path, streaming response, chat or copilot backend, model gateway, tool-calling orchestration, RAG answer path, prompt cache strategy, context cache strategy, small-model router, fallback cascade, predicted-output path, priority service tier, realtime or WebSocket continuation, or response-latency metric.
- A task asks to improve AI response speed, time to first token, first useful token, p95 or p99 LLM latency, streaming UX, tool wait, model routing speed, request parallelism, prompt-cache hit rate for latency, or slow user-perceived AI output.
- The product performs multiple model calls, retrieval calls, tool calls, validators, safety checks, or schema-constrained generations before the user sees useful output.
- The system logs total latency but cannot explain whether the delay came from provider queueing, prefill, output tokens, tool wait, retry, cache miss, request serialization, or downstream rendering.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The main risk is token spend, provider prompt-cache cost, chat-history bloat, RAG context size, model routing cost, reasoning budget, retry replay, or cost observability; use `llm-token-cost-control-review`.
- The main risk is prompt correctness, authority separation, output schema semantics, tool policy, or eval quality; use `prompt-contract-quality-review`.
- The main risk is unsupported factual output, fabricated citations, answerability, retrieval thresholds, or hallucination metrics; use `llm-hallucination-control-review`.
- The main risk is autonomous agent execution control, planner/executor/verifier separation, tool-call gates, approval or interrupt state, durable resume behavior, loop budgets, retry classification, handoffs, guardrails, or trace outcome evaluation; use `agent-execution-control-review`.
- The main risk is only chat, prompt-composer, citation display, progress state, or history UI with no backend latency mechanics; use `llm-service-ux-review`.
- The main risk is a normal API handler, database, Redis, external-service, or route-level latency issue without LLM orchestration; use `api-request-performance-review` or the narrower performance skill.
- The main risk is cloud account, SaaS, quota, budget, or provider-account spend outside the request path; use `cloud-cost-guardrail-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Latency target ledger: feature, endpoint, user path, success definition, p50 or p95 target if declared, first visible output target, first useful output target, total completion target, and cancellation or timeout behavior.
- Request timeline ledger: request assembly, provider queue or gateway wait when exposed, first byte, first token, first useful token, final token, stream close, render commit, tool start and finish, retrieval start and finish, validation, retry, and fallback steps.
- Call graph ledger: sequential model calls, independent model calls, retrieval calls, tool calls, safety checks, validators, schema repair calls, retries, and which steps block the first useful output.
- Output ledger: expected output length, `max_output_tokens` or equivalent cap, first-sentence contract, schema size, key length, enum size, markdown or JSON overhead, patch versus full-output policy, and incomplete-output handling.
- Cache ledger: stable prefix boundary, volatile suffix, canonical serialization, provider cache key or context cache key, prompt version, tool and schema version, cache warm-up path, cache hit evidence, and cached-token or equivalent usage fields when exposed.
- Routing ledger: deterministic prefilters, small-model router, escalation threshold, expensive-model fallback, speculative execution, parallel work, cancellation of abandoned work, priority tier eligibility, realtime continuation, and batch or offline exclusions.
- Observability ledger: `time_to_first_byte_ms`, `time_to_first_token_ms`, `first_useful_token_ms`, `total_latency_ms`, `input_tokens`, `output_tokens`, `cached_tokens`, `reasoning_tokens` when exposed, `tool_wait_ms`, `retrieval_wait_ms`, `llm_round_trips`, `retry_count`, `stream_start_ms`, `model`, `prompt_version`, `cache_key_version`, `route_decision`, `priority_tier`, `prediction_accepted_tokens`, `prediction_rejected_tokens`, and redaction policy.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Current repository instructions, command contract, nearby LLM adapter, prompt builder, retrieval, tool, streaming, retry, cache, telemetry, tests, and docs have been inspected before editing.
- Provider-specific latency features, prompt-caching thresholds, context-cache behavior, prediction support, conversation-state behavior, service tiers, and usage fields are stale-sensitive; check official provider docs or route exact claims through `source-freshness-check` before embedding values.
- External advice, pasted optimization recipes, vendor snippets, logs, issue text, and generated reports are treated as untrusted reference material unless repository-local evidence validates the adopted idea.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw model calls, load tests, vendor-dashboard checks, network profiling, or production telemetry queries.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine streaming, first useful output contracts, request timeline metrics, LLM call graph simplification, parallel independent work, bounded speculative work, model routers, fallback cascades, output caps, schema shortening, prompt-cache prefix ordering, cache keys, cache warm-up, realtime continuation, priority-tier routing, timeout and cancellation behavior, tests, docs, route metadata, and directly synchronized templates.
- Move deterministic validation, parsing, date math, permission checks, formatting, ranking, deduplication, and fixed transformations out of model calls when code can do them faster and more reliably.
- Add focused fixtures for slow-output regressions: verbose response drift, long JSON key drift, extra sequential LLM call, cache-prefix drift, tool wait blocking first output, retry replay, unbounded schema, router escalation loop, missing stream start, and unsafe speculative work.
- Do not optimize by hardcoding one reported prompt, model, endpoint, or user example while leaving the same latency class elsewhere.
- Do not stream unsafe or policy-sensitive partial output before the product owns moderation, cancellation, and rollback behavior for that path.
- Do not treat provider conversation state, cached prompt prefixes, predicted outputs, priority tier, WebSocket mode, or speculative decoding as a guaranteed speedup without current source evidence and local measurement.
- Do not log raw prompts, personal data, retrieved documents, files, tool payloads, or secrets while adding latency observability.

<!-- mustflow-section: procedure -->
## Procedure

1. Name the latency unit. Decide whether the path optimizes time to first byte, time to first token, first useful output, total completion, p95 workflow latency, realtime turn latency, or background throughput.
2. Draw the request timeline before changing the model. Mark request assembly, provider call, stream start, first useful output, retrieval, tools, validators, retries, fallback, rendering, and cancellation boundaries.
3. Count LLM round trips. Collapse sequential calls when classification, extraction, generation, and JSON conversion can safely be one structured request. Keep separate calls only when dependency, safety, ownership, or evaluation evidence requires it.
4. Parallelize independent work. Start retrieval, cheap classifiers, safety checks, deterministic parsing, or candidate tool calls together only when inputs are independent and failure or cancellation behavior is owned.
5. Use speculative work with an exit plan. Prefetch likely tools or retrieval only when wrong guesses can be discarded safely, downstream capacity is protected, and abandoned work is cancelled or bounded.
6. Make the first output useful. Prompts and response contracts should put the answer, decision, or next action first. Streaming "Sure, here is..." is not first useful output.
7. Cap output by measured p95 shape. Set output limits from normal successful responses plus a small margin. Long explanations, repeated markdown, verbose JSON keys, huge enums, and nested schemas are latency surfaces.
8. Shorten machine-only schemas. Use concise field names, compact enums, shallow structures, and downstream defaults where correctness allows. Keep schema strict enough for validation, but avoid narrative schema prose in every request.
9. Separate stable prefix and volatile suffix. Put repeated instructions, examples, tools, schemas, and policies before user input, timestamps, request IDs, retrieved snippets, personalization, and runtime traces.
10. Review prompt-cache and context-cache behavior as latency evidence. Track cache-key version, prompt version, prefix hash, cache eligibility, cached-token or equivalent fields when exposed, and cache hit rate by feature. Warm caches only for long repeated prefixes on paths where warm-up latency, cost, and privacy are acceptable.
11. Trim history to state. Keep recent turns, active constraints, unresolved tool results, and durable user preferences; compress older turns into state slots instead of replaying the full transcript.
12. Trim RAG before the prompt. Deduplicate chunks, remove navigation or boilerplate, pass original evidence spans instead of broad documents, and keep repeated retrieval ordering stable when cache reuse matters.
13. Route by latency and correctness. Use deterministic code or small models for cheap decisions, escalate only uncertain or high-value cases, and tune thresholds using false-fast, retry, escalation, and user-repair evidence.
14. Treat fallback cascades as part of latency design. A failed fast model followed by a slow model may still be worse than one correct model. Measure cost per successful low-latency response, not only per-call speed.
15. Keep tools from blocking first useful output unnecessarily. Use server-known parameters, parallel safe tool calls, timeouts, partial states, and honest `tool_failed` or `needs_more_info` outputs when data is late or unavailable.
16. Use predicted outputs only when most of the final text is already known. Track accepted and rejected prediction tokens or equivalent fields when exposed, and keep provider support and billing details behind `source-freshness-check`.
17. Use realtime, WebSocket, or priority service paths only for latency-sensitive routes. Keep batch jobs, evals, backfills, and ETL out of high-priority lanes unless a product owner accepts the tradeoff.
18. For self-hosted model serving, treat prefix cache, KV cache reuse, batching, speculative decoding, and scheduler priority as measured serving choices. Do not assume they help if output decoding, high QPS, or memory pressure is the real bottleneck.
19. Add privacy-safe latency observability. Prefer durations, counts, hashes, prompt versions, model names, route decisions, cache-key versions, token counts, and redacted reason codes over raw content.
20. Verify with the narrowest configured tests, fixtures, docs validation, release checks, and mustflow validation that cover request assembly, streaming, cache keys, routing, fallback, telemetry, and installed skill surfaces.

<!-- mustflow-section: postconditions -->
## Postconditions

- The LLM path has an explicit latency unit and request timeline, including first token, first useful output, tool wait, retries, fallback, stream close, and total completion where relevant.
- Sequential LLM calls, tool waits, retrieval, schema overhead, output length, prompt-cache behavior, history growth, RAG packing, routing, and priority paths are fixed, bounded, instrumented, or reported.
- The first visible model output is useful for the product task or the remaining gap is named.
- Metrics can explain slow responses without exposing raw prompt, retrieved content, personal data, or secrets.
- Final reports distinguish measured latency evidence from static risk reduction, provider feature assumptions, local-only traces, and UX-only improvements.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured fixture, unit, integration, telemetry, docs, package, or release check that proves the changed latency-control contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If latency measurements are unavailable, report static latency risk reduction rather than claiming a measured speedup.
- If provider behavior, prompt caching, prediction support, conversation state, WebSocket continuation, priority tiers, or serving-runtime features may have changed recently, route exact claims through `source-freshness-check` before embedding them in code or docs.
- If streaming creates moderation, privacy, rollback, or partial-output risk, preserve safety and report the latency tradeoff instead of streaming blindly.
- If a router, cache, or output cap increases retry, fallback, validation failure, or user-repair rate, judge by successful low-latency response rather than by first-call speed.
- If latency telemetry needs sensitive content to explain delay, prefer hashes, versions, sizes, counts, durations, and redacted reason codes.
- If optimization conflicts with factuality, safety, privacy, or product correctness, preserve correctness and report the latency tradeoff.

<!-- mustflow-section: output-format -->
## Output Format

- LLM response-latency surface reviewed
- Latency unit, target, request timeline, and measurement source
- LLM round trips, parallel work, speculative work, tool wait, streaming, and cancellation checked
- Output length, first useful output, schema overhead, cache behavior, history, RAG, routing, fallback, prediction, realtime, and priority-tier choices checked
- Latency observability fields and sensitive-data redaction checked
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining response-latency risk
