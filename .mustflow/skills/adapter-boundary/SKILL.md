---
mustflow_doc: skill.adapter-boundary
locale: en
canonical: true
revision: 14
lifecycle: mustflow-owned
authority: procedure
name: adapter-boundary
description: Apply this skill when external systems, protocols, SDKs, databases, managed database features, authentication providers, webhooks, queues, files, object storage, public URL contracts, signed upload or download URLs, CDN transform rules, HTTP delivery transports, SSE, WebTransport, caches, API response models, framework requests or responses, server actions, route handlers, edge functions, worker handlers, AI models, AI gateway usage policy, AI provider cost and usage data, browser storage, search engines, analytics tools, email platforms, no-code tools, observability backends, trace or request context, provider data, or a volatile component implementation cross into or out of core logic and need stable ports, adapters, translation, error mapping, timeout, retry, circuit-breaker, bulkhead, idempotency, security, cost attribution, reconciliation, core-state ownership, vendor portability, change isolation, or observability boundaries.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.adapter-boundary
  command_intents:
    - changes_status
    - changes_diff_summary
    - test_related
    - test
    - lint
    - build
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Adapter Boundary

<!-- mustflow-section: purpose -->
## Purpose

Keep external-world language, protocols, failures, and operational concerns out of core logic. Core logic speaks in internal use-case and domain terms; adapters translate external requests, responses, rows, messages, errors, identities, and provider behavior at the boundary.

This skill is not just a wrapper pattern. A good adapter boundary absorbs provider details, validates or maps untrusted input, classifies failures, applies timeouts and retry policy, preserves idempotency where needed, and records safe observability evidence without leaking secrets or personal data.

Use the port as a change-isolation contract. Before changing the implementation behind the adapter, name which side is allowed to vary, which consumer contract must stay stable, and what evidence proves the opposite side did not have to change.

<!-- mustflow-section: use-when -->
## Use When

- Code receives input from HTTP, CLI, webhooks, message queues, scheduled jobs, browser events, uploaded files, external databases, or external APIs.
- Code receives or emits streaming protocol data through EventSource, SSE, WebTransport, WebSocket, HTTP streaming responses, browser transport fallbacks, proxy-mediated delivery, or CDN-delivered content variants.
- Code calls external APIs, payment providers, email or SMS providers, file storage, object storage, databases, caches, search engines, analytics, AI models, queues, or browser storage.
- Code would let a provider dashboard, SDK object, search engine setting, queue product, email tag, analytics cohort, no-code automation, or hosted storage URL define core business state instead of only processing, storing, indexing, or displaying product-owned state.
- Code sends logs, metrics, traces, errors, request context, baggage, user context, job metadata, webhook metadata, or telemetry to an observability backend or passes those identifiers across HTTP, queue, cron, worker, or webhook boundaries.
- Code issues signed upload or download URLs, translates uploaded file metadata, maps storage keys, handles object-storage callbacks, or exposes file download responses.
- Code exposes file, image, avatar, attachment, export, or share URLs to browsers, emails, mobile apps, crawlers, Open Graph consumers, or API clients.
- Code maps delivery details such as content coding, stream events, datagram loss, reconnect ids, fallback transports, cache keys, or proxy/CDN behavior into application behavior.
- Code maps external authentication tokens, provider subjects, social identities, hosted auth metadata, managed database auth functions, or provider permission fields into the internal user, membership, entitlement, or authorization model.
- Code maps database rows, ORM entities, internal model fields, storage keys, or provider payloads into public, mobile, admin, integration, or internal web API responses.
- Provider SDK types, framework request or response objects, database rows, external event objects, raw model responses, or provider error types are visible in domain, application, service, or use-case code.
- Delivery-layer tools such as server actions, route handlers, Web-standard handlers, edge middleware, CLI commands, cron handlers, workers, or admin actions are about to contain pricing rules, authorization policy, payment state transitions, entitlement decisions, external provider calls, or database transactions directly.
- A new or changed port, repository, gateway, provider module, controller, worker, webhook handler, mapper, or integration test is needed.
- A volatile component, provider, persistence detail, delivery surface, or algorithm should change behind a port without forcing callers, consumers, tests, public DTOs, stored data, or neighboring modules to change for the same reason.
- The boundary needs timeout, retry, rate-limit, idempotency, signature verification, duplicate handling, logging, metrics, redaction, or provider-version decisions.
- External calls can be slow, rate-limited, duplicated, partially completed, or ambiguous, and the system needs timeout, limited retry, backoff, circuit-breaker, queue isolation, dead-letter, or reconciliation behavior.
- AI provider calls need a single internal boundary for model selection, prompt assembly, token usage, provider-call identity, request-to-call grouping, pricing snapshot, cache-hit classification, retry cost, plan limits, and redacted observability.
- AI provider calls need a product-owned gateway for preflight cost estimation, hard budget enforcement, feature policy, model fallback, user or organization limits, token caps, tool-call caps, agent-step caps, timeout caps, provider-budget fallback, and emergency disable behavior.
- Core external SDKs or platform APIs for authentication, billing, storage, search, queues, email, analytics, AI, deployment, or database access would otherwise spread through handlers, domain logic, jobs, or UI code and make the provider difficult to replace or test.
- An optional external integration may be disabled and needs either a safe neutral adapter or an explicit disabled result without leaking provider absence inward.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a pure calculation, value object, internal formatter, or data-only refactor with no external boundary.
- The task only needs broad ownership, cohesion, or future-change spread review before deciding whether a port is the right repair; use `module-boundary-review` or `change-blast-radius-review` first.
- The only problem is hidden construction or global lookup of a dependency; use `dependency-injection` first, then return here only if external data, errors, or protocol behavior also need a boundary.
- The operation coordinates several already-translated ports, repositories, queues, caches, or providers behind one caller-facing workflow; use `facade-pattern` for that high-level entry point while keeping this skill for each external boundary.
- The main problem is convergence after two databases, a database and broker, or a database and provider can commit independently; use `dual-write-consistency`. Keep this skill only for request, response, identifier, and failure translation at each external boundary.
- The main problem is deriving or proving an allow, block, or downgrade decision for a provider or model call; use `policy-decision-integrity-review`. An adapter may carry the decision and translate the selected provider request, but must not redefine the policy.
- The task is a disposable one-off script that is not imported, repeated, tested, used in production, or connected to external systems.
- The repository already has a more specific local integration skill that fully covers the boundary.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The external system or protocol and whether it is inbound, outbound, or both.
- Change-isolation ledger: the volatile side, the stable consumer side, current callers, public contracts, compatibility constraints, and the smallest adapter-only change that should avoid caller edits.
- The internal use case, domain action, or read model that should receive translated data.
- Existing local patterns for ports, adapters, repositories, controllers, workers, mappers, result types, retries, idempotency, logging, and tests.
- Provider-specific risk: write effects, duplicate delivery, unknown statuses, money, time, identifiers, secrets, personal data, files, untrusted URLs, rate limits, or provider version changes.
- Public contract risk: whether provider ids, raw storage URLs, bucket names, object keys, CDN query parameters, image-transform syntax, provider template ids, provider event names, or provider auth metadata would become visible in persisted content, API responses, emails, mobile apps, search indexes, or browser caches.
- Delivery contract risk: whether a server action, route handler, Web API adapter, edge function, queue consumer, CLI command, cron task, or admin operation should only parse/authenticate/map/call a use case, or whether it is currently becoming the place where business rules and provider calls live.
- HTTP delivery boundary risk: whether SSE events, WebTransport streams, datagrams, content-coding variants, browser fallback paths, CDN cache keys, or proxy buffering details are leaking into core use cases instead of staying in delivery adapters.
- Identity boundary risk: how provider subject ids, emails, token claims, user metadata, hosted-auth roles, and session state are normalized into app-owned user, organization, membership, and permission concepts.
- Dependency and provider replacement risk: whether the SDK or platform is on a survival path, how widely provider names and types would spread, what internal contract would preserve product meaning, and which provider features are acceptable to depend on directly.
- Core-state ownership risk: which customer, entitlement, consent, file, content, search, job, audit, or event facts must be represented in internal types and storage before or after the provider call.
- Vendor portability risk: which provider settings, search ranking rules, queue retry behavior, email automation tags, analytics event definitions, or no-code workflow rules must be captured as internal policy, configuration, or operator procedure instead of living only in a dashboard.
- Provider failure policy: timeout, retryable status categories, backoff and jitter rule, rate-limit handling, circuit-breaker behavior, bulkhead or queue isolation, idempotency key support, unknown-result reconciliation, and dead-letter handling when available.
- Observability portability policy: request id, trace id, span id, correlation id, causation id, user or anonymous id, tenant or organization id, job run id, webhook event id, event schema version, and which context fields are propagated, redacted, hashed, or kept internal.
- AI usage policy when AI models are involved: feature key, model key, user request id, provider call id, token usage fields, cached-input treatment, pricing snapshot, cost unit, retry grouping, cache key hash, prompt/output retention rule, and plan-limit behavior.
- AI policy handoff when AI models are involved: the already-derived decision, selected provider or model, limits, and reason fields that the adapter must translate without recomputing allow, block, or downgrade policy.
- API contract risk: stable resource ids, public identifiers, pagination, machine-readable status, safe error codes, field omission, private file URL handling, and whether the response shape is domain-oriented or screen-component-oriented.
- Relevant command-intent contract entries for tests, builds, docs, template checks, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The boundary direction and owner are clear enough to avoid putting provider names or external protocol terms into core logic.
- The preserved consumer contract is clear enough to test or report. If a caller-facing type, status, event, DTO, stored shape, or public behavior must change, classify that as a public-contract or migration change instead of hiding it inside an adapter refactor.
- If the local layout is unfamiliar, use `pattern-scout` or `codebase-orientation` before introducing new folders or naming conventions.
- If the change also introduces hidden collaborators or concrete construction, use `dependency-injection` for that part of the work.
- If the change alters HTTP content coding, streaming flush behavior, SSE, WebTransport, WebSocket fallback, CDN/proxy behavior, or browser delivery compatibility, use `http-delivery-streaming` for the transport contract and keep this skill focused on core-boundary containment.
- If the integration is optional and disabled by explicit configuration, use `null-object-pattern` only when the neutral behavior is safe and honest; required providers must fail closed.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Define narrow internal ports in the consuming application or domain language.
- Add inbound adapters that parse, verify, validate, translate, and map protocol results.
- Add outbound adapters that call providers and translate requests, responses, errors, identifiers, and operational metadata.
- Add mapper, error-mapper, fixture, fake-port, contract-test, and adapter-test files directly needed by the boundary.
- Add or update assembly-root wiring when a new adapter implementation is introduced.
- Do not copy provider APIs into ports, return provider SDK objects, expose database rows as domain objects, or add a broad catch-all `ExternalAdapter`.
- Do not make callers change just because the adapter implementation, provider, storage shape, framework surface, or algorithm changed behind the port. If callers must change, name the missing contract or the intentional breaking change.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the boundary.
   - Inbound: HTTP route, controller, webhook, CLI command, queue consumer, scheduler, browser event, uploaded file, or external data import.
   - Outbound: provider SDK, HTTP API, database, cache, file storage, search engine, message publisher, email/SMS/push provider, payment provider, AI model, or browser storage.
   - Change-isolation: a volatile component or implementation detail is expected to change behind a stable internal port while the consuming side should keep the same contract.
2. Name the internal capability in business language. Use names such as `PaymentGateway`, `EmailSender`, `ObjectStorage`, `UserStore`, `OrderReader`, `SummaryGenerator`, or `EventPublisher`. Keep provider names such as Stripe, Prisma, SendGrid, S3, OpenAI, or Redis inside adapter implementation names.
   Treat external services as processors or presenters unless the architecture explicitly accepts them as a system of record. A payment provider can process money, an email tool can send messages, a search engine can rank derived documents, and an analytics tool can visualize events, but internal code should still own the facts needed to explain customers, rights, money, files, content, and important events.
3. Design the port from the consumer's need, not from the provider's API.
   - Keep ports small and split unrelated reasons to change.
   - Use internal input and output types only.
   - Do not include SDK types, ORM model types, HTTP request objects, provider response objects, or provider error classes.
   - Write down the preserved consumer contract before changing implementation code: accepted input, returned output, local error kinds, side effects, timing or ordering expectations, idempotency behavior, and observable public result.
   - Make the adapter absorb representation changes. Provider response fields, table columns, wire envelopes, framework request objects, model output shapes, cache key syntax, or algorithm-specific options should change inside adapter or mapper files before consumer code sees them.
   - If preserving the port would require lying about new behavior, stop and classify the change as a public API, migration, event, or workflow-contract change rather than stretching the adapter.
   - For survival-path providers, define the internal operation first, such as create checkout, grant entitlement, store file, send transactional email, enqueue job, or generate summary. Let adapter implementations translate that operation to Stripe, Supabase, S3, Resend, OpenAI, or another provider.
   - Do not build a fake "replace every vendor tomorrow" abstraction. Keep the boundary thin, but ensure provider names, dashboards, response shapes, and SDK errors do not become the language of the core use case.
   - Abstract product contracts, not every technology. Prefer boundaries such as user identity, permission checks, public URLs, file objects, entitlements, usage metering, AI generation, and billing rights over broad catch-all adapters that still leak provider concepts.
4. Build inbound adapters as translators, not business-rule containers.
   - Parse and validate external input.
   - Verify signatures, authentication evidence, request size, file constraints, and allowed URL or host rules where relevant.
   - Extract only the values needed by the use case.
   - Map use-case results back to the protocol response.
   - Keep pricing, permission decisions, state transitions, inventory policy, subscription policy, and other business rules in the application or domain layer.
   - For server actions, route handlers, Web API adapters, edge functions, CLI commands, cron tasks, and worker handlers, keep framework-specific work to input parsing, trusted context creation, use-case invocation, response mapping, redirects, and cache invalidation. Move pricing, entitlement, payment, persistence orchestration, provider calls, and retry policy behind application commands or ports.
   - For EventSource, SSE, WebTransport, WebSocket, and HTTP streaming adapters, translate protocol events into internal commands or read-model notifications. Keep event ids, reconnect tokens, datagram sequence numbers, fallback transport names, and proxy quirks out of core domain decisions unless they are explicitly product concepts.
5. Build outbound adapters as provider translators, not pass-through wrappers.
   - Create provider requests from internal input.
   - Keep adapter-only changes adapter-only. When a provider swap, storage rewrite, framework move, model routing change, or algorithm replacement forces caller edits, treat that as evidence the port mirrored the implementation instead of the consumer need.
   - Set timeouts and retry policy where appropriate.
   - Pass idempotency keys for writes when the provider supports them.
   - Use limited retries with backoff and jitter for transient failures. Do not retry malformed requests, denied authorization, or domain rejections.
   - Add a circuit breaker or disabled/degraded result when repeated provider failures would otherwise make the core path keep calling a dependency that is likely to fail.
   - Isolate provider capacity with a separate queue, worker pool, rate limiter, or concurrency budget when one dependency can starve unrelated work.
   - Distinguish timeout, network error, rate limit, authentication failure, authorization failure, invalid request, business rejection, provider outage, and unknown provider error.
   - Distinguish known failure from unknown completion. For operations such as payment, refund, email, AI cost, or external mutation, an interrupted response can mean the provider may have acted; return or persist an `unknown` outcome that requires lookup or reconciliation before retry.
   - Record the product-owned intent before harmful or expensive provider calls when the operation must be recoverable. A payment attempt, email request, AI job, search index request, geocode request, or file operation should have an internal id and safe status before the provider result becomes the only evidence.
   - Return internal `Result` values or local error types instead of throwing provider errors for expected failures.
   - For optional disabled integrations, return an honest skipped or disabled outcome, or wire a safe null object at the assembly boundary. Do not return fake provider success.
6. Convert external data immediately at the boundary.
   - Map provider responses, database rows, queue messages, file metadata, model outputs, and browser storage values into internal types.
   - Keep external identifiers distinct from internal identifiers.
   - Represent money in integer minor units and explicit currency.
   - Convert dates and times explicitly according to the repository's time policy.
   - Copy only fields that internal code actually uses.
   - For API response mapping, expose product concepts rather than table or provider structure. Stable resource ids, typed statuses, safe labels, pagination, and error codes belong at the boundary; raw rows, ORM entities, storage keys, provider ids, private URLs, and internal flags do not.
   - For private file downloads, return metadata through ordinary resource responses and issue short-lived signed URLs through a separate authorized boundary when needed.
   - Keep public file URLs application-owned. Raw storage provider URLs, object keys, bucket names, and CDN query parameters belong inside storage or URL adapters, not in user content, emails, API contracts, search documents, or mobile caches.
   - Represent image transforms as named internal variants such as profile, card, or Open Graph versions. Let the adapter translate those variant names into provider-specific resize or format options.
   - Normalize external auth tokens into an internal current-user context before application code uses them. Do not spread token claim paths, provider metadata, or provider subject ids through handlers and domain logic.
7. Separate mappers when translation grows.
   - Split request mapping, response mapping, error mapping, and fixture builders once they become non-trivial or repeated.
   - Keep provider-version differences inside adapter or mapper files.
8. Treat databases, caches, and queues as external systems.
   - Core logic should use stores, readers, writers, or publishers rather than raw clients.
   - Database rows are persistence shapes, not domain objects.
   - Queue messages and integration events are external envelopes until parsed and translated.
   - Cache keys, time-to-live values, invalidation rules, and stale-data policy must be explicit.
   - Object-storage keys, signed URL policies, file metadata, and upload completion signals are external storage protocol details until translated into internal asset records and states.
   - Search documents, ranking settings, synonym lists, and query logs are external search protocol details until translated from internal source records and search policy.
   - Analytics events and email tags are external reporting or messaging details until translated from internal event and customer-state records.
   - Queue messages are external envelopes until parsed into an internal command or job with schema version, idempotency key, trace context, retry state, and safe payload reference.
   - Provider identifiers for payments, email, maps, search, AI, and storage are mappings. Internal orders, entitlements, emails, locations, documents, jobs, and file objects should remain product-owned resources even when the provider performs the work.
9. Keep database transactions and external side effects separate by default.
   - Do not call external APIs inside database transactions unless a local rule explicitly justifies the risk.
   - When independently committed database, broker, or provider effects must converge, route the convergence protocol to `dual-write-consistency`; this skill owns only the local port translation and failure mapping.
10. Harden webhooks and duplicate delivery.
    - Verify signatures before trusting payloads.
    - Preserve the raw body or safe raw reference when needed for verification and replay.
    - Use provider event identifiers or action keys to prevent duplicate effects.
    - Translate external event types into internal commands or events before calling the use case.
    - Acknowledge inbound webhooks quickly after validation and durable receipt when provider retry behavior can amplify slow processing. Move state updates, email, AI, analytics, and other follow-up work to worker commands unless the provider contract requires inline handling.
    - Store processed event identifiers, and when a provider can create semantically duplicate events with different event ids, dedupe on a normalized object id plus event type as well.
    - Keep the webhook receipt separate from the follow-up outcome. Payment state reconciliation, email bounce handling, entitlement grants, search indexing, and AI job completion should be replayable without trusting that the first handler invocation finished every side effect.
11. Keep AI model boundaries explicit.
    - Keep provider request format, model name, temperature, token limits, safety settings, and raw response parsing inside adapter or configuration code.
    - Route production AI calls through one application-owned client, gateway, or facade before reaching provider SDKs. Scattered direct SDK calls make cost attribution, redaction, rate limiting, and retries unreliable.
    - Require internal request metadata such as account or workspace id, feature key, model key, user request id, idempotency key when relevant, and safe correlation id before making cost-bearing calls.
    - Record provider-call metadata separately from user request metadata so retries, fallbacks, embeddings, tool calls, reranking, image or audio calls, and evaluations can be reconciled without double-counting the user's action.
    - Capture token usage, cached input usage when available, latency, provider request id, model, status, pricing snapshot, and integer cost unit after the provider response or failure.
    - Classify AI caches as app response cache, provider prompt cache, embedding cache, or search-result cache. Store cache key hashes or safe identifiers, not raw prompts or confidential user content.
   - Apply plan, request-size, model-tier, token, request-count, and cost limits before the provider call where possible; update actual usage after the call.
   - Consume an already-derived product policy decision before the provider call. Route allow, block, downgrade, fallback, and obligation derivation to `policy-decision-integrity-review`; translate only the selected request and provider result here.
   - Validate structured output before returning it.
    - Return internal purpose-level outputs such as summaries, classifications, recommendations, or extracted fields.
12. Make observability safe and useful.
    - Log adapter name, provider, operation, correlation id, safe idempotency-key hash, provider request id, duration, retry count, outcome, and local error kind when available.
    - Treat observability as an identifier-flow boundary, not a vendor choice. Preserve request id, trace id, span id, user or anonymous id, tenant or organization id, job run id, webhook event id, and event schema version across HTTP, queues, workers, cron, webhooks, and external calls where the operation needs end-to-end diagnosis.
    - Prefer standard propagation shapes such as trace context at protocol edges when the project uses distributed tracing, but keep application code behind a neutral telemetry boundary so the logging, tracing, metrics, or error backend can be replaced.
    - Keep baggage or propagated context minimal. Do not put email, names, JWTs, session ids, access tokens, payment customer ids, raw provider ids, file names, prompt text, or confidential document text into headers, logs, traces, metrics, or telemetry attributes unless a narrow internal policy explicitly allows and protects it.
    - For background jobs and scheduled work, create or carry a job run id and causation id so work can be connected to the request or event that created it without inventing a fake user request.
    - Do not log API keys, tokens, card data, passwords, identity numbers, raw personal data, full email bodies, full payment requests, full provider responses, or unredacted payloads.
    - Add metrics for latency, failures, retries, rate limits, duplicate handling, and ambiguous or unknown provider outcomes when the boundary is operationally important.
13. Test at the right layer.
    - Use fake ports in use-case tests; they should not call real external systems.
    - Test adapters with provider fixtures, mock clients, or local test doubles for request mapping, response mapping, error mapping, timeout, retry, idempotency, redaction, and duplicate handling.
    - Add or reuse preserved-consumer tests that prove callers use the port contract and do not import provider SDKs, framework request types, raw rows, adapter-only enums, or mapper internals.
    - When the implementation behind the port changes, run or report tests that compare the old and new adapter behavior at the port boundary, not only tests that exercise the new provider happy path.
    - Add contract or sandbox tests for critical providers when local fixtures cannot catch provider drift.
14. Verify with the narrowest configured command intents that cover changed source, tests, templates, docs, release metadata, and mustflow checks.

<!-- mustflow-section: postconditions -->
## Postconditions

- Core logic has no provider SDK imports, framework request or response objects, ORM clients, database rows, provider response objects, or provider error classes.
- Ports are named in internal business language and expose only internal input, output, and error types.
- Preserved consumer contracts are explicit, and implementation changes behind adapters do not force unrelated caller, DTO, test, workflow, or neighboring-module edits.
- Provider dashboards, hosted settings, and SDK payloads do not become the only source for core business facts, search policy, queue failure policy, analytics event definitions, email customer state, or file ownership.
- Public URLs, provider identity claims, image variants, entitlement decisions, and AI policy decision results are translated as product-owned contracts before provider-specific syntax reaches callers; policy derivation remains outside the adapter.
- Streaming and delivery transport details such as SSE ids, WebTransport datagrams, content-coding variants, fallback paths, and CDN cache keys are contained at adapter boundaries before core logic receives product-level events or commands.
- Critical external SDKs are contained behind internal use-case contracts so provider names, SDK types, and dashboard assumptions do not spread through core logic.
- Inbound adapters validate and translate before calling use cases.
- Outbound adapters translate internal requests, provider responses, and provider failures before returning.
- Timeouts, retry policy, idempotency, duplicate handling, security checks, and redacted observability are explicit where the risk requires them.
- Request, trace, user, tenant, job, cron, and webhook identifier propagation is explicit where diagnostic continuity matters, and telemetry backend details do not leak into core logic.
- Circuit-breaker, bulkhead, dead-letter, and reconciliation behavior is explicit where provider failure can spread beyond the integration.
- AI model boundaries centralize provider calls, cost attribution, usage recording, pricing snapshots, cache-hit classification, plan limits, and redacted prompt or output handling when AI calls are cost-bearing.
- AI adapters consume bounded product decisions and translate selected provider calls without owning allow, block, downgrade, or fallback policy.
- Tests cover core behavior through fakes and adapter behavior through mapping, error, and boundary tests.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `test_related`
- `test`
- `lint`
- `build`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Prefer the narrowest configured test or build intent that proves the affected boundary. Use documentation and release checks when skill routes, templates, public docs, package metadata, or installed-file surfaces change.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a port starts mirroring a provider API, narrow it to the consuming use case and move provider details back into the adapter.
- If an adapter becomes a pass-through wrapper, add explicit mapping and error translation or remove the false boundary.
- If an adapter begins making business decisions, move the policy into the application or domain layer.
- If timeout, retry, or idempotency behavior cannot be made safe, fail closed and report the remaining manual or reconciliation requirement.
- If sensitive data appears in logs, fixtures, metrics, receipts, or test output, stop and route the sensitive surface through the repository's security and privacy review path.
- If the provider behavior is unknown or drift-prone, keep claims local to verified fixtures or contract evidence and report what still needs live verification.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary classified
- Change-isolation ledger and preserved consumer contract
- Internal port or use-case input selected
- Provider or protocol details contained
- HTTP delivery, streaming, and fallback transport details contained when relevant
- Public URL, identity, and provider-id details contained when relevant
- Inbound validation and translation handled
- Outbound request, response, and error mapping handled
- Timeout, retry, circuit-breaker, bulkhead, idempotency, duplicate, dead-letter, and reconciliation behavior handled or explicitly deferred
- AI usage, cost, pricing snapshot, cache-hit, retry grouping, plan-limit, and redacted observability behavior handled or explicitly deferred when relevant
- AI policy decision handed off to `policy-decision-integrity-review` and translated without re-derivation when relevant
- Security and redaction surfaces checked
- Observability identifier propagation and backend portability checked when relevant
- Tests, fixtures, fakes, or contract checks added or reused
- Evidence that implementation changes stayed behind the port, or the intentional breaking-change boundary
- Command intents run
- Skipped checks and reasons
- Remaining boundary leakage or provider risk
