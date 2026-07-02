---
mustflow_doc: skill.third-party-api-integration-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: third-party-api-integration-review
description: Apply this skill when integrating, reviewing, debugging, or upgrading a third-party SDK or external API service, including authentication, scopes, sandbox versus production behavior, request timeouts, retries, rate limits, idempotency, pagination, webhooks, SDK/API drift, provider error mapping, changelogs, deprecations, migration guides, observability, or production-readiness tests.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.third-party-api-integration-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Third-Party API Integration Review

<!-- mustflow-section: purpose -->
## Purpose

Make third-party SDK and API integrations production-safe instead of merely making the first demo call succeed.

Developers usually suffer when provider complexity is pushed into the consuming product: unclear auth scopes, stale docs, SDK/API mismatch, opaque errors, rate limits, unsafe retries, duplicate webhooks, undocumented version drift, and missing recovery evidence. This skill turns those failure paths into explicit design and test requirements.

<!-- mustflow-section: use-when -->
## Use When

- A product calls, wraps, replaces, upgrades, or removes a third-party SDK, external REST/GraphQL/RPC API, hosted auth provider, payment provider, messaging provider, storage provider, analytics provider, AI provider, search provider, CRM, email/SMS/push provider, geocoding provider, or SaaS integration.
- Code handles provider authentication, authorization scopes, refresh tokens, tenant or organization ids, sandbox/production environments, API keys, service accounts, or webhook signing secrets.
- Code implements or reviews provider request timeouts, retry policy, rate-limit handling, pagination, idempotency keys, webhook event handling, provider error mapping, request ids, logs, metrics, traces, or dead-letter/replay behavior.
- A provider SDK version, API version, changelog, migration guide, deprecation notice, webhook payload, response shape, error shape, pagination model, or rate-limit policy changes.
- Integration tests, fakes, fixtures, docs, runbooks, or recovery tools must prove the integration handles unhappy paths.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The API is owned by the same repository or organization and the task is primarily public contract design; use `api-contract-change`, `api-misuse-resistance-review`, or `http-api-semantics-review`.
- The only question is where to place the provider boundary or how to hide provider types from core logic; use `adapter-boundary` first, then return here for provider operational behavior.
- The task is only a rate-limit implementation, retry loop, idempotency mechanism, queue consumer, or payment ledger change with no third-party provider integration; use the narrower integrity skill.
- The task is a one-off local script that is not production, repeated, automated, or connected to customer, money, entitlement, privacy, or operational state.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Provider name, SDK package and version, API version, environment, endpoint or event names, and whether the integration is inbound, outbound, or both.
- Source-of-truth ledger: provider reference docs, OpenAPI or schema files, SDK docs, changelog, migration guide, status page or incident notes when relevant, and local wrapper or adapter patterns.
- Auth ledger: credential source, secret storage boundary, auth flow, token lifetime, refresh behavior, scopes, tenant or organization binding, sandbox/production separation, and failure behavior for 401 versus 403.
- Operation ledger: reads, writes, mutating operations, money or entitlement effects, external side effects, pagination model, idempotency support, rate limits, retryability, unknown-outcome recovery, and rollback or reconciliation path.
- Webhook ledger when inbound events exist: signature verification, raw-body requirement, event id, duplicate policy, ordering assumptions, retry behavior, ack timing, async processing, replay tooling, and retention.
- Error and observability ledger: provider error codes, HTTP statuses, request id, retry-after or reset headers, local error taxonomy, redaction policy, logs, metrics, traces, alerts, and support diagnostics.
- Existing tests, fakes, sandbox credentials policy, fixtures, runbooks, and command-intent entries for verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- Secrets, credentials, tokens, webhook secrets, customer payloads, and provider console output are treated as sensitive. Do not copy them into code, fixtures, docs, logs, test output, or final reports.
- If provider docs and SDK behavior disagree, record the mismatch and choose an explicit compatibility path instead of guessing.
- If the provider operation can cause money movement, entitlement changes, customer communication, irreversible mutation, or external side effects, classify unknown outcomes before adding retries.
- If the provider boundary would leak provider SDK objects, raw provider ids, private URLs, or dashboard-only truth into core logic, use `adapter-boundary` for that boundary before implementing production behavior.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or update provider adapters, wrappers, clients, request/response mappers, error mappers, webhook handlers, fakes, fixtures, sandbox tests, contract tests, runbooks, and docs directly tied to the integration.
- Add explicit timeout, retry, backoff, jitter, rate-limit, idempotency, pagination, webhook dedupe, observability, and redaction behavior when the repository already supports the required primitives or the change can stay local.
- Add typed local errors and provider result models that preserve request id, retryability, support evidence, and safe diagnostic detail.
- Do not hardcode credentials, broaden provider scopes, introduce a new runtime dependency, enable live production calls, or change provider dashboard settings without explicit approval and command authority.
- Do not implement infinite retries, retry permanent errors, generate a new idempotency key for every retry of the same logical operation, trust webhook payloads before signature verification, or treat success-page redirects as proof of provider completion.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the integration surface.
   - Outbound: SDK or API call made by the product.
   - Inbound: webhook, callback, redirect, polling response, or provider event consumed by the product.
   - Bidirectional: outbound request plus later webhook or callback that confirms, rejects, or updates the same operation.
2. Establish source of truth before coding. Prefer current provider API reference or schema for wire shape, provider changelog or migration guide for version behavior, local wrapper patterns for code placement, and tests for repository expectations. Treat blog posts, examples, AI output, and stale snippets as hints only.
3. Choose SDK versus raw API explicitly.
   - Prefer the official SDK only when it supports the needed endpoint, runtime, auth method, timeout control, retry control, pagination, idempotency, error access, and request id access.
   - Use raw API only when the SDK lacks coverage or blocks a production requirement, and then provide typed local request/response models, timeout, retry policy, pagination, error mapping, and tests.
   - Do not let SDK convenience hide auth scopes, retries, idempotency, pagination, or error taxonomy.
4. Build the auth and environment contract.
   - Separate sandbox from production credentials.
   - Load credentials from approved secret surfaces.
   - Bind tokens or API keys to tenant, organization, account, or environment when applicable.
   - Validate required scopes before business logic.
   - Distinguish authentication failure from authorization or scope failure.
   - Handle token expiration and refresh without logging token values.
5. Classify every operation before adding retry behavior.
   - Reads may be retried when timeout and retry budget are bounded.
   - Mutating requests need a stable idempotency key or another documented duplicate-safety mechanism before retry.
   - Unknown outcomes after timeout or connection loss must trigger provider lookup, reconciliation, or manual recovery instead of blind replay.
   - Validation, authentication, authorization, missing-resource, malformed-request, and domain-rejection errors are not transient.
6. Implement request safety.
   - Set explicit per-attempt timeout and total attempt budget.
   - Respect documented rate-limit headers, reset times, and retry-after hints.
   - Use exponential backoff with jitter for transient failures.
   - Bound concurrency when provider capacity can starve local work.
   - Use documented pagination cursors, iterators, or link headers; do not invent next-page URLs or assume stable offset pagination unless the provider promises it.
7. Implement provider error mapping.
   - Map provider status, code, message, field errors, request id, retryability, and endpoint into local typed errors.
   - Preserve enough detail for support without logging secrets, full customer payloads, raw tokens, or payment data.
   - Make rate-limit, auth, validation, provider outage, timeout, and unknown-outcome errors distinguishable to callers.
   - Keep provider error classes and SDK response objects out of core logic.
8. Implement webhook and callback safety when events exist.
   - Verify signature using the raw body when the provider requires it.
   - Acknowledge quickly and move expensive work to an internal queue or use case when possible.
   - Store event id or delivery id before side effects.
   - Deduplicate repeated events and return safe success for already-processed duplicates.
   - Do not assume events arrive once, in order, immediately, or only after the user-facing redirect.
   - Make handlers idempotent and add replay or dead-letter handling when failures need recovery.
9. Handle SDK/API version drift.
   - Check changelog and migration guide before SDK or API version upgrades.
   - Identify breaking changes in auth, endpoint paths, request fields, response fields, error shape, pagination, rate limits, idempotency, webhook payloads, and retry behavior.
   - Keep old and new behavior side by side when migration risk is high.
   - Add compatibility tests before replacing production behavior.
10. Add observability that helps support without leaking data.
    - Record local operation id, provider request id, endpoint or event name, retry attempt count, final provider status category, retry-after timing, idempotency key hash or local operation id, and redacted error code.
    - Add metrics or logs for rate-limit hits, retries exhausted, webhook duplicates, invalid signatures, unknown outcomes, SDK version, and migration path when local patterns support them.
    - Avoid raw provider payload dumps in logs and fixtures.
11. Test failure paths, not only the first successful call.
    - Cover auth failure, scope failure, validation failure, timeout, transient 5xx, rate limit, retry exhaustion, idempotent duplicate request, pagination continuation, SDK error mapping, webhook invalid signature, webhook duplicate event, webhook out-of-order event when relevant, and version-upgrade fixture compatibility.
    - Prefer fakes or sandbox tests unless the repository has explicit live-provider test authority.
    - Do not mark the integration complete when only the happy path is tested.
12. Report provider ambiguity honestly. Name undocumented behavior, doc/SDK mismatch, skipped live checks, missing sandbox evidence, manual console steps, missing idempotency support, missing webhook replay tooling, and remaining operational risk.

<!-- mustflow-section: postconditions -->
## Postconditions

- The integration has explicit auth, environment, timeout, retry, rate-limit, idempotency, pagination, webhook, error, observability, version, and test decisions.
- Provider-specific behavior is contained at the integration boundary or explicitly classified as a public contract.
- Failure paths and recovery states are tested, faked, documented, or reported as missing evidence.
- Secrets and sensitive provider data are not copied into code, fixtures, logs, docs, or reports.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `test_audit`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use the narrowest configured tests that cover the changed provider adapter, webhook handler, error mapping, retry behavior, idempotency behavior, SDK version migration, and docs or template surfaces touched.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If provider docs are missing or contradictory, stop relying on inferred behavior and report the mismatch with the safest local fallback.
- If mutating operations lack idempotency support, avoid automatic retry and require reconciliation or manual recovery for unknown outcomes.
- If webhook signatures cannot be verified with current framework parsing, fix the raw-body handling before trusting the event.
- If tests would require live production credentials, skip them and report the missing configured sandbox or fake instead of using real credentials.
- If SDK retry behavior is implicit or unconfigurable, wrap or disable it when local retry budgets must be enforced.
- If a provider dashboard setting is required, document it as manual or config-owned evidence; do not claim code alone enforces it.

<!-- mustflow-section: output-format -->
## Output Format

- Third-party provider and SDK/API surface reviewed
- Source-of-truth docs, SDK version, changelog, and migration evidence checked
- Auth, environment, scope, and secret boundary decisions
- Timeout, retry, rate-limit, idempotency, pagination, and unknown-outcome decisions
- Webhook or callback delivery, signature, dedupe, ordering, and replay decisions
- Error mapping, observability, redaction, and support diagnostics
- Tests added, reused, skipped, or missing for happy and unhappy paths
- Command intents run
- Skipped checks and reasons
- Remaining provider, SDK drift, documentation, sandbox, or operational risk
