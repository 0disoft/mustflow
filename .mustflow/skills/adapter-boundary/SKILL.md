---
mustflow_doc: skill.adapter-boundary
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: adapter-boundary
description: Apply this skill when external systems, protocols, SDKs, databases, webhooks, queues, files, caches, framework requests or responses, AI models, browser storage, or provider data cross into or out of core logic and need ports, adapters, translation, error mapping, timeout, retry, idempotency, security, or observability boundaries.
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

<!-- mustflow-section: use-when -->
## Use When

- Code receives input from HTTP, CLI, webhooks, message queues, scheduled jobs, browser events, uploaded files, external databases, or external APIs.
- Code calls external APIs, payment providers, email or SMS providers, file storage, object storage, databases, caches, search engines, analytics, AI models, queues, or browser storage.
- Provider SDK types, framework request or response objects, database rows, external event objects, raw model responses, or provider error types are visible in domain, application, service, or use-case code.
- A new or changed port, repository, gateway, provider module, controller, worker, webhook handler, mapper, or integration test is needed.
- The boundary needs timeout, retry, rate-limit, idempotency, signature verification, duplicate handling, logging, metrics, redaction, or provider-version decisions.
- An optional external integration may be disabled and needs either a safe neutral adapter or an explicit disabled result without leaking provider absence inward.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is a pure calculation, value object, internal formatter, or data-only refactor with no external boundary.
- The only problem is hidden construction or global lookup of a dependency; use `dependency-injection` first, then return here only if external data, errors, or protocol behavior also need a boundary.
- The operation coordinates several already-translated ports, repositories, queues, caches, or providers behind one caller-facing workflow; use `facade-pattern` for that high-level entry point while keeping this skill for each external boundary.
- The task is a disposable one-off script that is not imported, repeated, tested, used in production, or connected to external systems.
- The repository already has a more specific local integration skill that fully covers the boundary.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The external system or protocol and whether it is inbound, outbound, or both.
- The internal use case, domain action, or read model that should receive translated data.
- Existing local patterns for ports, adapters, repositories, controllers, workers, mappers, result types, retries, idempotency, logging, and tests.
- Provider-specific risk: write effects, duplicate delivery, unknown statuses, money, time, identifiers, secrets, personal data, files, untrusted URLs, rate limits, or provider version changes.
- Relevant command-intent contract entries for tests, builds, docs, template checks, release checks, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The boundary direction and owner are clear enough to avoid putting provider names or external protocol terms into core logic.
- If the local layout is unfamiliar, use `pattern-scout` or `codebase-orientation` before introducing new folders or naming conventions.
- If the change also introduces hidden collaborators or concrete construction, use `dependency-injection` for that part of the work.
- If the integration is optional and disabled by explicit configuration, use `null-object-pattern` only when the neutral behavior is safe and honest; required providers must fail closed.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Define narrow internal ports in the consuming application or domain language.
- Add inbound adapters that parse, verify, validate, translate, and map protocol results.
- Add outbound adapters that call providers and translate requests, responses, errors, identifiers, and operational metadata.
- Add mapper, error-mapper, fixture, fake-port, contract-test, and adapter-test files directly needed by the boundary.
- Add or update assembly-root wiring when a new adapter implementation is introduced.
- Do not copy provider APIs into ports, return provider SDK objects, expose database rows as domain objects, or add a broad catch-all `ExternalAdapter`.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the boundary.
   - Inbound: HTTP route, controller, webhook, CLI command, queue consumer, scheduler, browser event, uploaded file, or external data import.
   - Outbound: provider SDK, HTTP API, database, cache, file storage, search engine, message publisher, email/SMS/push provider, payment provider, AI model, or browser storage.
2. Name the internal capability in business language. Use names such as `PaymentGateway`, `EmailSender`, `ObjectStorage`, `UserStore`, `OrderReader`, `SummaryGenerator`, or `EventPublisher`. Keep provider names such as Stripe, Prisma, SendGrid, S3, OpenAI, or Redis inside adapter implementation names.
3. Design the port from the consumer's need, not from the provider's API.
   - Keep ports small and split unrelated reasons to change.
   - Use internal input and output types only.
   - Do not include SDK types, ORM model types, HTTP request objects, provider response objects, or provider error classes.
4. Build inbound adapters as translators, not business-rule containers.
   - Parse and validate external input.
   - Verify signatures, authentication evidence, request size, file constraints, and allowed URL or host rules where relevant.
   - Extract only the values needed by the use case.
   - Map use-case results back to the protocol response.
   - Keep pricing, permission decisions, state transitions, inventory policy, subscription policy, and other business rules in the application or domain layer.
5. Build outbound adapters as provider translators, not pass-through wrappers.
   - Create provider requests from internal input.
   - Set timeouts and retry policy where appropriate.
   - Pass idempotency keys for writes when the provider supports them.
   - Distinguish timeout, network error, rate limit, authentication failure, authorization failure, invalid request, business rejection, provider outage, and unknown provider error.
   - Return internal `Result` values or local error types instead of throwing provider errors for expected failures.
   - For optional disabled integrations, return an honest skipped or disabled outcome, or wire a safe null object at the assembly boundary. Do not return fake provider success.
6. Convert external data immediately at the boundary.
   - Map provider responses, database rows, queue messages, file metadata, model outputs, and browser storage values into internal types.
   - Keep external identifiers distinct from internal identifiers.
   - Represent money in integer minor units and explicit currency.
   - Convert dates and times explicitly according to the repository's time policy.
   - Copy only fields that internal code actually uses.
7. Separate mappers when translation grows.
   - Split request mapping, response mapping, error mapping, and fixture builders once they become non-trivial or repeated.
   - Keep provider-version differences inside adapter or mapper files.
8. Treat databases, caches, and queues as external systems.
   - Core logic should use stores, readers, writers, or publishers rather than raw clients.
   - Database rows are persistence shapes, not domain objects.
   - Queue messages and integration events are external envelopes until parsed and translated.
   - Cache keys, time-to-live values, invalidation rules, and stale-data policy must be explicit.
9. Keep database transactions and external side effects separate by default.
   - Do not call external APIs inside database transactions unless a local rule explicitly justifies the risk.
   - Use explicit states, an outbox, an action ledger, or a reconciliation path when database changes and external effects must be coordinated.
10. Harden webhooks and duplicate delivery.
    - Verify signatures before trusting payloads.
    - Preserve the raw body or safe raw reference when needed for verification and replay.
    - Use provider event identifiers or action keys to prevent duplicate effects.
    - Translate external event types into internal commands or events before calling the use case.
11. Keep AI model boundaries explicit.
    - Keep provider request format, model name, temperature, token limits, safety settings, and raw response parsing inside adapter or configuration code.
    - Validate structured output before returning it.
    - Return internal purpose-level outputs such as summaries, classifications, recommendations, or extracted fields.
12. Make observability safe and useful.
    - Log adapter name, provider, operation, correlation id, safe idempotency-key hash, provider request id, duration, retry count, outcome, and local error kind when available.
    - Do not log API keys, tokens, card data, passwords, identity numbers, raw personal data, full email bodies, full payment requests, full provider responses, or unredacted payloads.
    - Add metrics for latency, failures, retries, rate limits, duplicate handling, and ambiguous or unknown provider outcomes when the boundary is operationally important.
13. Test at the right layer.
    - Use fake ports in use-case tests; they should not call real external systems.
    - Test adapters with provider fixtures, mock clients, or local test doubles for request mapping, response mapping, error mapping, timeout, retry, idempotency, redaction, and duplicate handling.
    - Add contract or sandbox tests for critical providers when local fixtures cannot catch provider drift.
14. Verify with the narrowest configured command intents that cover changed source, tests, templates, docs, release metadata, and mustflow checks.

<!-- mustflow-section: postconditions -->
## Postconditions

- Core logic has no provider SDK imports, framework request or response objects, ORM clients, database rows, provider response objects, or provider error classes.
- Ports are named in internal business language and expose only internal input, output, and error types.
- Inbound adapters validate and translate before calling use cases.
- Outbound adapters translate internal requests, provider responses, and provider failures before returning.
- Timeouts, retry policy, idempotency, duplicate handling, security checks, and redacted observability are explicit where the risk requires them.
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
- Internal port or use-case input selected
- Provider or protocol details contained
- Inbound validation and translation handled
- Outbound request, response, and error mapping handled
- Timeout, retry, idempotency, and duplicate behavior handled or explicitly deferred
- Security and redaction surfaces checked
- Tests, fixtures, fakes, or contract checks added or reused
- Command intents run
- Skipped checks and reasons
- Remaining boundary leakage or provider risk
