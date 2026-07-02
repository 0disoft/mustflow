---
mustflow_doc: skill.ai-product-readiness-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: ai-product-readiness-review
description: Apply this skill when an AI product feature, AI Gateway, model or provider integration, prompt/RAG/tool path, AI cache, fallback path, streaming path, evaluation gate, user-data flow, model registry, AI observability surface, or model portability plan is created, changed, reviewed, or reported and the risk is end-to-end product readiness rather than one narrow prompt, cost, latency, or agent concern.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.ai-product-readiness-review
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

# AI Product Readiness Review

<!-- mustflow-section: purpose -->
## Purpose

Review AI features as product and operating systems, not as model calls. A production AI path should make the AI role modest, route every request through a controlled gateway, separate instructions from untrusted data, cap cost, isolate caches, evaluate regressions, expose fallback states, protect user data, stream safely, observe without raw-content leakage, and allow model replacement.

<!-- mustflow-section: use-when -->
## Use When

- A change adds, edits, reviews, or reports an AI feature, AI Gateway, LLM provider adapter, model router, prompt registry, RAG path, tool proposal flow, AI cache, fallback path, streaming path, eval gate, user-data flow, model registry, AI observability surface, AI incident runbook, or model migration plan.
- A task asks whether an AI feature is launch-ready, production-ready, safe to automate, cost-bounded, prompt-injection-resistant, privacy-safe, eval-ready, fallback-ready, cache-safe, streaming-safe, or provider/model-portable.
- The feature sends user input, documents, conversation history, files, images, retrieved content, tool observations, logs, or business records to a model.
- The AI can influence money, permissions, account state, external messages, deletion, workflow status, support outcomes, generated code, compliance claims, or customer-visible answers.
- Multiple narrower AI skills could apply and the first question is whether the product boundary itself is sound.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The whole task is one narrow prompt-contract, hallucination, token-cost, response-latency, agent-execution, agent-eval, UX, prompt-injection, privacy, cache, adapter, rate-limit, idempotency, or cloud-cost concern. Use the narrower skill directly.
- The task only changes ordinary non-AI code with no model, prompt, retrieval, tool, generated output, or AI telemetry path.
- The task only chooses between model vendors or current model versions. Use `source-freshness-check` or the provider-specific workflow before making stale-sensitive claims.
- The task only edits marketing copy that says a feature uses AI but does not change product behavior, documentation contract, or release claims.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Product role ledger: feature goal, user, AI role, human-review boundary, harm if wrong, non-AI fallback, and whether the AI drafts, suggests, classifies, searches, executes, or decides.
- Gateway ledger: request entrypoint, auth, quota, rate limit, request shaping, prompt version, model routing, redaction, cache, retry, fallback, logging, eval hooks, and kill switch.
- Authority and action ledger: system/developer instructions, user input, retrieved data, tool results, allowed tool proposals, server-side policy engine, side-effect execution, approval state, idempotency key, and audit trail.
- Data ledger: data classes, tenant and permission scope, uploaded files, RAG corpus, vector store, provider region or endpoint, retention, logs, analytics, crash reports, staff access, and deletion path.
- Cost and cache ledger: request volume, user/org/feature budget, input/output/reasoning token caps, retry caps, model tiers, provider prompt-cache boundary, app cache keys, TTL, invalidation, and cache redaction.
- Eval ledger: golden set, adversarial set, regression set, cost and latency set, privacy leak set, prompt injection set, refusal set, locale set, pass criteria, owner, and CI or release gate.
- Fallback and streaming ledger: provider failure, rate-limit failure, quality fallback, safety fallback, partial-output policy, cancellation, final validation, and recovery UX.
- Model portability ledger: model registry, provider adapters, capability map, prompt and schema versions, migration evals, rollout plan, rollback plan, and deprecation monitoring owner.
- Observability ledger: request ID, user or tenant hash, feature, prompt version, provider, model, tokens, cached tokens, latency breakdown, retrieval IDs, retries, fallback, refusal, validation failures, tool calls, user feedback, cost, and redaction.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the exclusions.
- Current repository instructions, command contract, AI service code, prompt files, retrieval paths, provider adapters, telemetry, tests, and docs in scope have been inspected before editing.
- External AI-safety guidance, model documentation, vendor deprecation schedules, pricing, rate limits, retention promises, cache behavior, and legal requirements are stale-sensitive. Do not embed exact claims unless refreshed through an authorized source path.
- Command execution remains governed by `.mustflow/config/commands.toml`; this skill does not authorize raw model calls, vendor dashboard checks, network requests, eval harness runs, migrations, releases, or billing commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine AI Gateway boundaries, provider adapters, model registries, prompt registries, policy engines, tool proposal gates, quota guards, token budgets, cache keys, redaction, retry and fallback state machines, streaming validators, eval fixtures, observability fields, incident runbooks, tests, docs, route metadata, and directly synchronized templates.
- Add launch-readiness docs, risk ledgers, model migration notes, privacy-safe telemetry contracts, and release notes tied to implemented behavior.
- Route narrow subproblems to specialist skills instead of duplicating deep prompt, RAG, latency, cost, eval, agent-control, cache, privacy, or UX guidance inside this skill.
- Do not approve fully automated high-risk decisions without a server-side policy gate, human review path, audit trail, and rollback or appeal path.
- Do not let clients call model providers directly when product auth, quota, redaction, logging, eval, or policy enforcement must be controlled server-side.
- Do not log raw prompts, raw responses, retrieved documents, uploaded files, secrets, tokens, private identifiers, or personal data by default while adding AI observability.
- Do not treat streaming, a second provider, a stronger model, or a longer prompt as proof of safety, quality, privacy, or cost control.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the AI role. Prefer draft, suggestion, search, classification, extraction, summarization, or proposal roles. Flag automatic decisions about money, permissions, legal, medical, hiring, credit, account status, external sending, deletion, or production execution as high-risk and require human review or a non-AI decision owner.
2. Name the harm model. Write the failure case in product terms: wrong answer, leaked data, unauthorized action, cost spike, stale source, over-refusal, unsafe advice, duplicate side effect, unsupported citation, broken locale, or missing fallback.
3. Require an AI Gateway boundary. The client should call the product backend, and the gateway should own auth, quota, request shaping, prompt version, model routing, redaction, cache, retry, fallback, logging, eval hooks, and kill switches.
4. Separate model speech from product authority. Treat model output as a proposal or draft until server code validates schema, business rules, permission, ownership, rate limits, action risk, confirmation state, idempotency, and audit requirements.
5. Treat external text as data. Retrieved documents, webpages, emails, tickets, Slack messages, GitHub issues, uploads, logs, tool results, and RAG chunks must not become instructions. Use `external-prompt-injection-defense` when untrusted text can override scope, tools, secrets, or policy.
6. Check permission and tenant narrowing before retrieval or tool use. The model should receive only data the authenticated user may access. Vector search, document search, and tool calls must enforce tenant, workspace, object, field, and role boundaries outside the prompt.
7. Validate output before use. Use structured schemas, semantic validators, business-rule checks, HTML or Markdown sanitization, URL allowlists, path sandboxing, SQL parameterization, command allowlists, and refusal or failure envelopes where relevant.
8. Put cost controls at the product layer. Add user, tenant, org, and feature budgets; request input and output caps; retry caps; model tiering; queue or batch separation; dedupe; cancellation accounting; budget breach events; and an operator kill switch.
9. Design cache keys as security boundaries. Include tenant, permission scope, feature, prompt version, model, provider, source corpus version, locale, policy version, and TTL when they affect correctness. Never use raw personal data, secrets, tokens, uploaded-file bodies, or sensitive text as cache keys.
10. Separate cache layers. Review provider prompt-cache prefix stability, app response cache safety, retrieval-result cache invalidation, and RAG corpus versioning separately. Use `llm-token-cost-control-review` or `cache-integrity-review` when cache shape is the main risk.
11. Build evals before launch claims. Require golden, adversarial, regression, privacy leak, prompt injection, refusal, cost, latency, and locale cases appropriate to the feature. Treat manual spot checks as exploration, not readiness evidence.
12. Make fallback a product state machine. Distinguish provider outage, rate limit, quality failure, safety failure, validation failure, no evidence, and human-review fallback. Do not make fallback only "try another model".
13. Guard side effects against retry. Tool actions that send messages, charge or refund money, delete data, change permissions, update records, execute code, or call external APIs need idempotency keys, approval state, request IDs, resource IDs, policy checks, and audit logs.
14. Review streaming by risk. Low-risk text can stream if cancellation and partial-output policy are clear. High-risk answers, tool arguments, external actions, private data, generated code execution, and compliance-sensitive output should be validated before display or execution.
15. Protect data beyond provider training policy. Check redaction before model calls, retention in provider state, product DB, vector DB, logs, analytics, crash reports, eval traces, staff tools, exports, backups, and deletion workflows.
16. Make model portability explicit. Use a task-level model registry or router instead of scattering provider model names through code. Keep a capability map for structured output, tool use, streaming, caching, context limits, refusal behavior, token accounting, regions, and retention.
17. Plan model changes as migrations. Compare accuracy, hallucination, citation behavior, JSON validity, refusal rate, tool precision, latency, cost, prompt-injection robustness, locale quality, tone, and long-context behavior before rollout. Keep rollback possible.
18. Instrument without raw-content leakage. Log IDs, hashes, versions, counts, sizes, reason codes, validation status, retrieval IDs, token counts, cached-token counts, latency, retries, fallback, tool outcomes, user feedback, and cost. Store raw content only under explicit debug approval, masking, retention, and deletion policy.
19. Check UX expectation boundaries. The interface should show when AI is involved, what evidence was used, what was not seen, when manual approval is needed, how to report bad output, and how to recover. Use `llm-service-ux-review` when UI state is the main risk.
20. Route the sharp edges. Apply specialist skills for prompt contracts, hallucination/RAG grounding, token cost, latency, agent execution, agent evals, prompt injection, privacy, cache integrity, adapter boundaries, rate limits, idempotency, and cloud cost when one of those owns the remaining work.
21. Verify with the narrowest configured tests, fixture runs, docs validation, release checks, prompt-cache audit, and mustflow validation that cover the changed AI product surface.

<!-- mustflow-section: postconditions -->
## Postconditions

- The AI role, harm model, human-review boundary, and non-AI or degraded fallback are explicit.
- AI calls pass through a controlled gateway or the absence of a gateway is reported as residual risk.
- Prompt injection, output validation, tool side effects, tenant permissions, privacy, cost, cache, eval, fallback, streaming, observability, and model-portability surfaces are each accepted, fixed, or routed to a narrower skill.
- Launch or readiness claims are backed by implemented controls, tests, eval evidence, docs, or explicit remaining risks.

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

Use the narrowest configured fixture, eval, schema, integration, docs, package, release, or mustflow check that proves the changed AI product-readiness contract. Do not infer raw provider, billing, eval, migration, or dashboard commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the AI role or harm model is unknown, do not claim readiness. Record the missing product decision and keep automation conservative.
- If no gateway exists, report which controls are missing and avoid spreading partial controls across clients, prompts, and provider dashboards.
- If evals are missing, classify the change as static risk reduction or draft readiness rather than proven quality improvement.
- If cost, privacy, retention, or provider behavior depends on current vendor facts, route exact claims through `source-freshness-check` before embedding them in docs or release notes.
- If fallback can duplicate side effects, stop and route through `idempotency-integrity-review` before retry or provider-fallback changes.
- If streaming reveals unvalidated private, unsafe, or irreversible content, switch to buffered validation or report the missing safe state.
- If model portability conflicts with a provider-specific capability, keep the capability map explicit instead of hiding differences behind a leaky abstraction.

<!-- mustflow-section: output-format -->
## Output Format

- AI product surface reviewed
- AI role, harm model, human-review boundary, and fallback state
- AI Gateway, provider adapter, policy engine, tool execution, and kill-switch status
- Prompt injection, data protection, output validation, tenant permission, and side-effect boundaries checked
- Cost budget, cache key, eval gate, streaming, observability, and model portability checked
- Specialist skills applied or intentionally deferred
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining AI product-readiness risk
