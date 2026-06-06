---
mustflow_doc: skill.security-privacy-review
locale: en
canonical: true
revision: 22
lifecycle: mustflow-owned
authority: procedure
name: security-privacy-review
description: Apply this skill when code, configuration, docs, templates, logs, telemetry, traces, baggage, behavior analytics, core events, credentials, data flows, data residency policy, region or processing-location claims, AI-generated code, AI prompts outputs usage cost records budgets policies or cache keys, authentication, authorization, server-side permission checks, admin operations, audit logs, file uploads or downloads, signed URLs, API responses, cache policy, cache-as-authority decisions, claim or policy data, comparison or affiliate data, user-generated content, webhooks, job queues, search logs, analytics SaaS exports, external API call records, network calls, dependencies, runtime security patch policy, third-party terms or data-use promises, cryptography, secure transport, agent configuration, or release surfaces affect secrets, personal data, retention, access control, vendor disclosure, or external disclosure.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.security-privacy-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Security and Privacy Review

<!-- mustflow-section: purpose -->
## Purpose

Catch security, privacy, and disclosure risks introduced by ordinary code, documentation, template, configuration, logging, or reporting changes.

<!-- mustflow-section: use-when -->
## Use When

- A change touches authentication, authorization, sessions, admin behavior, tenant boundaries, personal data, secrets, tokens, credentials, API keys, or private files.
- A feature adds role, permission, administrator, internal-tool, feature-flag, emergency-access, support, or back-office exceptions that could make the authorization model less explicit over time.
- A change comes from AI-generated code, vibe-coded output, copied examples, or a broad assistant patch that may have optimized for the happy path without proving abuse boundaries.
- A change adds or modifies logging, telemetry, diagnostics, receipts, reports, caches, generated state, retention, redaction, export, or external transmission.
- A change adds or modifies behavior analytics events, event schemas, page views, clicks, searches, impressions, scroll data, experiments, attribution, request traces, or observability data that may include personal data or sensitive context.
- A change stores, forwards, exports, or relies on logs, search query logs, click logs, product events, billing events, job events, audit records, analytics SaaS events, email platform tags, or provider dashboard data to explain security, privacy, billing, entitlement, or customer-support behavior.
- A change propagates telemetry context, trace context, baggage, request ids, user ids, provider ids, job metadata, webhook metadata, or observability attributes across service, queue, worker, cron, webhook, browser, or external API boundaries.
- A tool, platform, model provider, analytics service, observability vendor, authentication provider, file store, or automation service has data retention, data training, commercial-use, export, API-limit, account-suspension, or unilateral terms-change implications for user data or service continuity.
- A cloud, database, file store, logging backend, analytics tool, support tool, payment system, or AI provider choice affects where customer content, personal data, backups, logs, prompts, usage metadata, billing metadata, or support-access data is stored or processed.
- A runtime, framework, dependency, or platform choice affects supported-version policy, end-of-life exposure, security patch timing, scanner coverage, deployment smoke tests, or rollback expectations.
- A change touches administrator operations such as publishing, slug or redirect changes, canonical or robots changes, SEO updates, filter definition updates, advertisement policy, cache purge, search reindexing, ranking refresh, role changes, or audit-log snapshots.
- A change touches legal, policy, privacy, finance, health, comparison, ranking, price, eligibility, affiliate, or high-risk factual claims that need source, reviewer, jurisdiction, effective-date, or human-approval boundaries.
- A change touches identity, consent, editorial, catalog, community, analytics, billing, messaging, or audit data ownership boundaries, including account deletion, anonymization, export, or retention behavior.
- A change touches comments, reviews, reports, user-submitted links, affiliate links, sponsored links, public rankings, or user-generated content moderation.
- A change touches shared caches, CDN caching, cache-control headers, cache keys, cache tags, private or personalized responses, admin responses, search endpoints, or public cache purge endpoints.
- A change uses cache, Redis, generated state, search documents, or read models to make authorization, ownership, subscription, entitlement, payment, inventory, or admin decisions.
- A change adds external URL fetching, webhook callbacks, redirects, browser previews, remote downloads, database-as-a-service rules, security headers, CORS, CSRF handling, or rate limits.
- A change stores webhook payloads, external API requests or responses, retry errors, dead-letter jobs, AI prompts or outputs, email bodies, or provider diagnostic data.
- A change adds or modifies public intake surfaces such as action handlers, webhook handlers, callback receivers, job enqueue endpoints, idempotency stores, replay APIs, or default verifier, authenticator, authorizer, normalizer, or deduplication collaborators.
- A change records AI usage, model pricing, token counts, cache keys, feature metadata, prompt hashes, provider call metadata, retry cost, or failed AI calls that could include confidential content or identify users.
- A change records AI budgets, feature policies, policy decisions, blocked reasons, model downgrades, agent steps, tool calls, provider budget status, or emergency disables that could reveal customer behavior, sensitive feature use, or regulated processing.
- A change touches cookies, JWTs, reset tokens, invite tokens, OAuth callbacks, file upload or download, browser storage, business rules, pricing, entitlements, database queries, ORM bulk operations, or deployment configuration.
- A change relies on frontend role checks, hidden buttons, client-provided `userId`, `workspaceId`, `role`, `price`, `status`, or `isAdmin`, or direct API calls that need server-side resource authorization.
- A change returns API responses that may expose raw database rows, internal ids, storage keys, permanent private file URLs, password hashes, billing provider ids, internal notes, last login IPs, or other fields not required by the caller.
- A change touches cryptography, password hashing, token generation, random number generation, TLS/HTTPS, certificate validation, scanner gates, or a security invariant that could drift across architecture boundaries.
- A change adds, imports, recommends, or installs third-party dependencies that may affect the software supply chain.
- A change introduces or edits agent configuration, MCP/tool configuration, prompt files, model instructions, or repository-local rule files.
- A change adds or modifies policy engines, architecture linters, rule catalogs, validators, generated compliance reports, or governance gates that can approve sensitive data, payment, API, AI, tier, or deployment boundaries.
- A change affects CI/CD workflow permissions, fork pull-request handling, build scripts, package lifecycle scripts, deployment secrets, container users, storage buckets, debug flags, or public admin, metrics, GraphQL, cache, or search endpoints.
- Documentation, templates, examples, tests, or final reports mention sensitive data handling, privacy behavior, secret handling, or user-identifying data.
- A diff could expose data through filenames, paths, command output, screenshots, generated artifacts, package contents, or public docs.
- A change constructs, recommends, copies, resolves, or runs commands based on repository-controlled names, configuration, or generated reports.
- A change reads or writes repository paths, follows filesystem links, packages files, or publishes release artifacts.
- A workflow gains publish credentials, package registry identity, OIDC permissions, or third-party actions before artifact publication.
- A code-scanning, Scorecard, CodeQL, zizmor, or dependency-scanning alert reports a security or quality issue that may cross a trust, disclosure, permission, or release boundary.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task needs a concrete abuse-case regression test; use `security-regression-tests` for that part.
- The task is only dependency availability, package version freshness, or artifact packaging without sensitive data.
- The task is a general security checklist with no changed boundary, data flow, or disclosure surface to inspect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Changed files, diff summary, and the user goal.
- Sensitive data, actor, trust boundary, storage, logging, retention, export, or external disclosure surfaces involved.
- Actor, resource owner, tenant boundary, server-side authorization rule, state-changing route, external network target, dependency source, and agent/tool permission surface involved.
- Permission model shape when authorization is involved: actor, resource, action, scope, condition, default decision, exception path, emergency-access path, and audit expectation.
- Read, list, search, update, delete, upload, attach, download, invite, billing, and admin actions affected, including whether the server scopes each action by actor, owner, workspace, organization, team, role, or capability.
- Cookie, JWT, OAuth, file upload, file download, business-value, database mutation, ORM bulk operation, CI/CD permission, deployment setting, or secret-source surface involved.
- Cryptographic primitive, password hashing, random-token, secure transport, certificate validation, scanner gate, or security invariant involved.
- Existing project rules for secrets, privacy, generated state, public docs, package contents, and command output.
- Policy or rule-catalog source of truth, trusted metadata source, fallback behavior when a rule file is missing, and any untrusted repository-local fields that might be treated as ownership, tier, role, or exemption evidence.
- Admin operation list, role or capability model, audit-log fields, cache visibility policy, and cache invalidation surface when those are involved.
- Behavior analytics event names, event versions, actor identifiers, anonymous identifiers, properties, retention period, deletion or anonymization policy, and whether event writes can be delayed or lost.
- Core event ownership, including which signup, login failure, account recovery, payment, refund, subscription, entitlement, permission, file, search, admin, webhook, queue, and security events must remain internally stored instead of only in a SaaS dashboard.
- Observability identifier policy, including request id, trace id, span id, user or anonymous id, tenant or organization id, job run id, webhook event id, baggage fields, retention period, external propagation, redaction, and whether identifiers can be tied back to direct personal data.
- Third-party data-use and operational terms that affect privacy or continuity, including retention, training use, export availability, commercial-use limits, API-limit changes, account suspension, deletion guarantees, and whether sensitive operational features are gated behind a plan.
- Data residency and processing-location policy, including home region, storage region, backup region, log region, analytics region, AI processing region, support-tool region, payment or tax data region, disaster-recovery replica region, deletion expectations, and whether provider system data is outside customer-content residency guarantees.
- Data classification policy when available, including sensitive personal data, ordinary personal data, product usage data, public content, AI prompts or outputs, and which classes may enter logs, analytics, support tools, AI providers, or cross-region backups.
- Runtime and dependency patch policy, including supported or LTS version requirement, end-of-life ban, lockfile expectation, vulnerability scan source, patch response target, smoke-test surface, canary or rollback route, and whether experimental runtime choices are kept off survival paths.
- Webhook and external-call record policy, including signature verification, processed-event deduplication, safe request hashes, redacted provider responses, unknown-result reconciliation, dead-letter retention, and whether raw payloads are needed or should be replaced by bounded metadata.
- Public intake default policy, including whether verifiers, authenticators, authorizers, deduplication stores, idempotency stores, and normalizers are required by registration, explicit opt-in, or silently replaced by permissive defaults.
- Attacker-controlled key and header limits for idempotency keys, webhook event ids, provider names, action names, replay ids, dedupe keys, request ids, and any in-memory map or queue keyed by public request data.
- AI record policy, including prompt and output retention, cache-key hashing, provider request id handling, feature-key properties, pricing snapshots, token usage, failed-call errors, user or account identifiers, and whether raw prompts or generated text are omitted, redacted, encrypted, or retained under a narrow rule.
- AI budget and gateway policy, including whether provider budgets are hard stops or only alerts, whether product-owned hard limits exist, which identifiers are recorded for user, organization, feature, model, request, provider call, policy decision, and whether blocked or downgraded decisions are logged without exposing prompt text.
- Cache authority boundary, including which data is final source of truth and which values are disposable, stale, private, or shared.
- Security or privacy performance advice, including which invariant it would relax, whether revocation or consent must be immediate, what metadata may be cached, and which event invalidates that cache.
- Claim or policy registry fields, source reference, jurisdiction, risk tier, review owner, effective date, comparison methodology, affiliate relationship, user-generated link policy, and human approval path when those are involved.
- Data-domain owner for identity, consent, editorial, catalog, community, analytics, billing, messaging, and audit records, plus deletion, anonymization, export, and retention expectations when personal data is involved.
- Relevant command-intent contract entries for status, diff, docs, release, or mustflow validation.
- Any repository-controlled names, paths, symlinks, command strings, environment path entries, workflow actions, or package contents that cross a trust boundary.
- Scanner name, rule identifier, alert location, severity, data-flow evidence, and whether the alert is fixable in code or requires repository settings.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten redaction, masking, omission, retention, disclosure, or documentation wording when the changed surface justifies it.
- Remove sensitive-looking sample values from docs, fixtures, templates, logs, reports, and final output when they are not required.
- Mark unknown privacy or secret-handling behavior as unverified instead of claiming it is safe.
- Do not invent compliance claims, privacy guarantees, secret scanning results, or audit coverage.
- Do not treat a working UI, passing happy-path test, or generated assistant explanation as proof that authorization, privacy, dependency, or external-request boundaries are safe.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the sensitive surface: secret, personal data, actor, permission, storage location, log, generated artifact, package file, public document, or external recipient.
2. Decide whether the change creates, stores, reads, transforms, logs, exports, deletes, or reports sensitive information.
3. Check whether the changed surface is public, packaged, generated, cached, retained, user-visible, or sent outside the repository boundary.
4. Treat AI-generated code as untrusted until the protected resource, actor, ownership rule, and denied case are inspected. UI-only hiding, client-side role checks, hidden buttons, and passing happy-path flows do not prove server-side authorization.
5. For each read, write, update, delete, export, or admin route, confirm the server-side query or policy binds the session actor to the target resource owner, tenant, role, or capability.
6. Do not stop at "is logged in". Separate authentication from authorization, then inspect tenant, workspace, organization, team, owner, role, and guest filters on both reads and writes.
   - Treat client-provided actor ids, role names, workspace ids, plan names, prices, discounts, entitlement flags, and status values as untrusted input. Derive trusted actor and tenant context from server-side authentication and membership checks.
   - Check list, search, detail, attachment, export, and download paths as carefully as mutation paths. Read access is still data access.
   - Reject mass assignment. Server code should allowlist mutable fields instead of passing raw request bodies into database updates where privileged fields could be set by the client.
   - Review permission rules as actor, resource, action, scope, and condition rather than role name alone. "Admin can do it" is not enough; the rule should say which administrator can perform which action on which resource and under which tenant or system scope.
   - Treat growing exceptions such as `isAdmin`, hardcoded user ids, company-email suffixes, internal-tool bypasses, feature-flag bypasses, or support-only shortcuts as authorization-model decay. Replace them with explicit capabilities, scoped roles, or time-limited emergency access.
   - Emergency access should have a reason, time limit, notification or approval path, and audit log. It should not become a permanent silent superuser branch.
7. For high-impact admin operations, require a server-side capability or role check, actor attribution, target identity, reason or change note where useful, before/after evidence, and a rollback, preview, or recovery path proportionate to the impact.
   High-impact examples include publish/unpublish, slug change, redirect change, canonical change, robots or sitemap change, filter definition change, advertisement slot or policy change, cache purge, search reindex, ranking refresh, bulk edit, and role or permission change.
8. For high-risk content claims, require source attribution, jurisdiction or market, effective date, verification date, risk tier, review owner, affected-content lookup, and human approval before publication when the domain is legal, privacy, finance, health, safety, eligibility, pricing, ranking, comparison, or compliance.
9. For comparison, ranking, review, affiliate, and sponsored content, check that methodology, evidence, affiliate relationship, outbound-link policy, and editorial responsibility are explicit. Do not let paid placement, sponsored links, or user-generated links look like ordinary editorial links.
10. For database and ORM changes, check for unscoped `findMany`, `updateMany`, `deleteMany`, mass assignment of `role`, `price`, `ownerId`, `isPaid`, or similar privileged fields, unsafe migration defaults, and missing row-level or policy-based access controls where the platform supports them.
11. For personal data ownership, confirm that analytics, content, community, billing, messaging, and audit records do not store direct identifiers they do not need. Prefer anonymous ids or internal ids, and keep email, phone, payment, and consent details inside their owning boundaries.
12. For behavior analytics, logs, traces, metrics, and event streams, check that direct identifiers, sensitive form values, raw request bodies, payment data, access tokens, cookies, session ids, and confidential user content are omitted unless a narrow product rule and retention path exist.
    - For trace context and baggage, assume propagated fields can cross service and external API boundaries. Keep values to opaque internal ids, hashes, or low-sensitivity correlation data; do not propagate email, names, phone numbers, JWTs, session tokens, payment customer ids, raw provider ids, raw prompts, uploaded document text, or private file names.
    - Keep request ids and trace ids useful for debugging without making them account identifiers. User, organization, and tenant ids should be internal or anonymized when they leave the protected boundary.
    - Treat search queries, clicked result ids, failed login reasons, webhook errors, queue errors, and support diagnostic properties as sensitive by default when they can reveal private user intent, file names, customer state, security posture, or business disputes.
    - Do not rely on analytics or observability SaaS as the only copy of events needed for security review, customer support, billing disputes, entitlement history, file deletion, or administrator accountability.
    - Check storage and processing location separately for primary data, backups, logs, analytics events, support tools, AI prompts, AI outputs, AI usage metadata, payment metadata, and disaster-recovery copies. A database region alone does not prove the full privacy boundary.
    - Treat provider data residency claims narrowly. Customer content location, inference location, logs, account metadata, usage metadata, billing metadata, abuse monitoring, and support access may follow different policies.
13. Separate behavior analytics from audit logs. Behavior analytics may be delayed, sampled, or partly lossy; audit logs for administrator, permission, payment, publication, privacy, security, and destructive operations should preserve actor, target, action, reason, bounded before/after evidence, and retention expectations.
14. For account deletion, export, anonymization, consent withdrawal, and retention behavior, check each data area separately. Billing, audit, community content, analytics, messaging, and identity records may need different deletion or retention actions; do not claim one delete flag covers them all.
15. For user-generated content, comments, reports, and public profile data, check moderation status, edit and delete history, parent-child deletion behavior, spam or abuse handling, report workflow, and whether user-submitted links are qualified safely.
16. For state-changing routes that rely on cookies or browser credentials, check CSRF, origin, CORS, same-site, and rate-limit behavior instead of assuming the framework default is active.
17. For session and token behavior, check cookie flags, JWT verification instead of decode-only logic, expiration, issuer and audience validation, reset or invite token entropy and lifetime, server-side revocation, logout invalidation, and reauthentication before sensitive account or payment changes.
   - Do not relax short TTL, opaque-token, consent-recheck, revocation, or fail-closed requirements only because outside advice says the extra lookup is slow. Prefer bounded metadata-only caching with explicit invalidation by consent, permission, credential, revocation, or policy-change events.
   - Stateless bearer tokens, JWTs, or Macaroon-like tokens for sensitive access need an explicit architecture decision, short lifetime, revocation story, audit correlation, issuer and audience checks, and no raw personal data, prompt text, credential material, consent snapshot, or source-content claims.
18. For shared cache behavior, verify that admin, authenticated, personalized, tenant-scoped, or otherwise private responses cannot be stored in a shared cache. Prefer `no-store` for admin or sensitive responses and private-cache behavior only when the data is safe for the user's own browser cache.
19. For cache-backed decisions, verify that cache cannot become the only unchecked authority for permissions, ownership, subscription, entitlement, payment, inventory, or destructive admin actions unless it is intentionally operated as a durable state store with a fail-closed policy.
   - Security and privacy caches should store only bounded operational metadata such as ids, versions, scopes, expirations, hashes, or revocation markers. Do not cache raw payloads, secrets, credential values, prompts, outputs, source content, message bodies, consent records, or provider responses unless a narrow retention policy explicitly allows it.
20. For cache purge, search reindex, ranking refresh, and generated-state rebuild endpoints, treat them as privileged state-changing operations with authorization, rate limiting, audit logs, idempotency, and bounded target selection.
21. For external URL, webhook, preview, redirect, download, or callback behavior, check allowlists, protocol restrictions, redirect handling, DNS/IP re-resolution, private network ranges, link-local metadata endpoints, webhook signatures, timeout limits, retry limits, and open redirect parameters such as `next` or `redirect`.
   - For webhooks, verify the signature against the raw body before trusting parsed data. Store only the raw body reference or bounded raw payload when replay, verification, or support needs justify it.
   - Do not silently install allow-all, unsigned, no-op, nil, null-object, or test-only verifiers for public webhook or callback endpoints. Missing verifier, authenticator, or authorization configuration should fail registration unless the caller explicitly selects a clearly named unsafe or local-only mode.
   - Store processed event identifiers to avoid duplicate effects. Keep provider event payloads, request bodies, and response bodies out of ordinary logs and dead-letter records unless they are redacted and have a retention rule.
22. For database-as-a-service, storage bucket, or realtime rules, check that server-side policies are default-deny, ownership-scoped, and not left in public read/write development mode.
23. For input sinks, check parameterized queries, ORM binding, static command maps, output encoding, HTML/Markdown rendering boundaries, unsafe dynamic evaluation, XML/YAML/Markdown parser options, redirect and sort parameters, page-size limits, and framework escape hatches.
   - For escaping, quoting, encoding, or sanitization alerts, identify the exact output domain first: URL component, URL path segment, HTML, SQL, shell argument, regular expression, Markdown, JSON, XML, YAML, log line, or filename. Prefer a structured, domain-aware encoder, parser, query binder, or URL API over manual string replacement.
   - If custom escaping is unavoidable, prove that repeated metacharacters, backslashes, separators, quotes, existing encoded sequences, and reserved characters are handled according to that domain. Treat single-occurrence string replacement, non-global regular expressions, partial slash or quote handling, and `encodeURI` versus `encodeURIComponent` confusion as scanner-worthy patterns until reviewed.
24. For file upload and download, check MIME and content signatures, size limits, storage outside executable web roots, SVG/HTML/PDF rendering rules, image or document metadata, filename controls, Unicode confusion, path traversal, download authorization, and resource limits for resizing, archive extraction, or document conversion.
   - Prefer server-generated asset ids or hash-like storage keys over user filenames in storage paths. Keep original filenames as metadata only.
   - For private files, avoid returning permanent public URLs or raw storage keys. Recheck authorization before issuing a short-lived signed download URL.
   - For direct-to-object-storage uploads, authorize the target resource before issuing the signed upload URL, confirm upload completion before making the asset usable, and keep pending, uploaded, processing, ready, failed, and deleted states separate.
   - Inspect actual file bytes instead of trusting extension or `Content-Type`. Re-encode images and strip metadata when practical before serving user uploads.
25. For business logic, check that server code does not trust client-supplied prices, discounts, roles, owners, entitlement state, plan limits, usage counters, inventory, seats, refunds, credits, or coupon state. Inspect idempotency, transactions, uniqueness, and concurrent requests for repeated side effects.
   - For public action or intake endpoints, validate cheap request shape and attacker-controlled idempotency keys before permanently claiming the key. If a request is rejected before the trusted side effect starts, release or avoid storing the key so malformed traffic cannot poison future valid retries.
   - Bound default in-memory idempotency, deduplication, replay, rate-limit, and request-tracking stores by key length, entry count, TTL, eviction, or a durable backend contract. A process-memory map keyed by unbounded public headers or event ids is an availability boundary, not just an implementation detail.
26. For API responses, check that the response contains only fields the caller may see and needs for the use case. Do not expose password hashes, internal storage keys, permanent private URLs, raw billing provider ids, internal moderation notes, private IP data, privileged flags, or database columns merely because they are present on the model.
27. For dependency failure policy, distinguish fail-closed from degraded behavior. Authentication, authorization, payment, entitlement, and destructive admin decisions should usually fail closed; analytics, recommendation, statistics, AI summaries, and email should usually avoid exposing private data or blocking core state changes.
   - For dead-letter queues, retry logs, and external API call records, check that errors contain safe codes and bounded metadata rather than full prompts, email bodies, payment details, tokens, private files, or personal data.
   - For unknown provider outcomes, require reconciliation before repeating security-, money-, entitlement-, or privacy-impacting effects.
   - For AI usage ledgers and cost records, store operational metadata such as feature key, model, token counts, cost unit, safe request id, and cache-hit type without storing raw prompts, confidential documents, personal data, or full model outputs unless a specific retention and access policy requires them.
   - For AI cache keys, store hashes or opaque identifiers. Do not make prompts, uploaded document text, user messages, or personally identifying fields part of readable cache keys, logs, traces, metrics, or final reports.
   - For AI budget and gateway records, store enough information to enforce limits and investigate abuse without retaining prompt text, uploaded document contents, full outputs, or personal data by default. Record blocked, downgraded, and emergency-disabled decisions as security-relevant events when they protect cost, privacy, or region policy.
28. For secrets, logs, and audit records, check hardcoded credentials, frontend bundle exposure, public versus secret key confusion, real-looking samples, raw request or session dumps, stack traces, error payloads, screenshots, receipts, generated reports, unbounded before/after snapshots, and whether leaked keys need revocation guidance.
    - If a real or plausible secret value appears, activate `secret-exposure-response` and stop repeating the value before continuing ordinary review.
29. Treat shell commands, copyable command text, executable names, workflow action references, publish identities, package manifests, lifecycle scripts, Dockerfiles, and environment path entries as disclosure and execution surfaces, not as harmless strings.
30. For dependency changes, activate `dependency-reality-check` to confirm the package is declared, real, necessary, locked when appropriate, and not an assistant-hallucinated or lookalike dependency.
    - For third-party services used as core infrastructure, review whether the terms allow commercial use, export, backup, deletion, data retention control, model training opt-out, stable API limits, and service continuity. If the project cannot verify the terms under the current task, report the risk instead of claiming the provider is safe for sensitive or core data.
31. For agent configuration, MCP/tool setup, prompt files, external instructions, or AI context settings, activate `external-prompt-injection-defense` and check hidden instruction text, suspicious Unicode controls, broad filesystem or shell permissions, network egress, sensitive context inclusion, and over-privileged service tokens.
32. For filesystem changes, distinguish lexical containment from the real target. Check symlinks, generated state, package contents, and file APIs that may follow links before claiming a path stays inside the repository.
33. For code-scanning alerts, group findings by root cause and rule. Fix the underlying pattern, not only the exact flagged line, and separate repository-setting alerts such as branch protection or maintainer activity from code changes.
    - For incomplete escaping or encoding findings, search the same sink class for adjacent ad hoc sanitizer patterns such as first-occurrence `.replace`, non-global replacement, hand-escaped slashes, quotes, backslashes, path separators, or mixed URL encoders. Replace the pattern with a domain-owned transformation and add a regression test or narrow source-pattern guard when the behavior is release-sensitive.
34. For workflow scanner alerts, check action pinning, `persist-credentials`, job-level permissions, reusable workflow permissions, fork pull-request secret exposure, artifact upload boundaries, and privileged identity timing before treating the warning as cosmetic.
35. For pinned action references, distinguish tag objects from the commit that implements the tag. Verify pinned SHAs against the action repository so scanner tooling does not report an imposter or non-member commit.
36. For dependency scanner alerts, separate production dependency manifests from fixtures, examples, generated test repositories, and intentionally vulnerable samples. Narrow the scan scope before treating fixture-only alerts as product vulnerabilities.
37. For deployment settings, check debug mode, sample admin accounts, default credentials, public admin panels, open metrics endpoints, public storage, root container users, HTTPS enforcement, and exposed GraphQL or development consoles.
38. For runtime and framework security updates, check that supported versions are documented, end-of-life versions are rejected, dependency locks exist where appropriate, security patches can be tested and deployed quickly, and rollback or redeploy can happen without manual dashboard memory. Do not treat a fashionable or high-performance runtime as safe unless the patch path is operationally credible.
39. For transport security, check HTTPS/TLS requirements, certificate validation, insecure HTTP downgrade paths, disabled verification flags, and whether sensitive traffic can bypass the secure channel.
40. For cryptography, reject custom cryptography and tutorial-grade shortcuts. Check password hashing uses a password-hashing primitive such as bcrypt, scrypt, or Argon2id where supported by the project; random tokens use secure randomness; keys are separated from encrypted data; and weak hashes such as MD5, SHA-1, or bare SHA-256 are not used for password storage.
41. For policy engines, architecture linters, compliance validators, and generated governance gates, identify the canonical policy source and the canonical object identity before trusting a pass result.
    - Do not let repository-controlled advisory fields, nested duplicates, labels, components, owners, stages, tiers, or exemption fields override a trusted catalog, server-derived identity, or central registration.
    - When two fields can describe the same security decision, such as top-level and nested owner values, validate their consistency or choose the canonical source explicitly instead of reading the first convenient path.
    - Treat missing, wrong, or fallback rule catalogs as fail-closed or explicitly degraded; a misplaced rule file should not silently disable validation for public API, payment, AI, tier, deployment, or data-boundary controls.
    - Required security-control declarations should validate meaningful values, not merely non-null presence. Reject `false`, `0`, empty objects, empty arrays, empty strings, or type-mismatched placeholders unless the policy specifically allows that value.
    - Derive deny decisions from metadata classes when possible instead of only from static name denylists that can miss newly introduced repositories, services, tenants, roles, or providers.
    - When the same policy appears in YAML, TypeScript validator constants, Rust markers, documentation, and tests, treat the machine-readable contract as the source of truth unless the repository states otherwise. Cross-check every duplicate or report it as manual drift risk.
42. For read-only commands that inspect repositories, remember that the underlying tool can still execute configured helpers. Disable or neutralize repository-local hooks, fsmonitor helpers, credential helpers, package lifecycle hooks, and executable lookup through untrusted PATH when the command is meant to be safe inspection.
43. For architecture drift, name the security invariant before accepting the generated structure. Confirm the invariant still holds across UI, handler, service, repository, database policy, workflow, and deployment boundaries.
44. For SAST, SCA, or scanner output, treat scanner output as evidence rather than command authority. Map the finding to a repository-owned boundary, configured verification intent, dependency metadata, or regression test before claiming the issue is fixed.
    - In skeleton or pre-runtime repositories, add narrow source-pattern guards for obvious violations such as raw payload proxy routes, raw secret or PII logging, weak cryptography, direct credential storage, or direct source-content persistence. Strip comments before simple text scans where practical, and report that pattern guards are an early tripwire rather than proof of correct masking, cryptography, or authorization.
45. Verify that examples, fixtures, screenshots, command outputs, and final reports do not expose real-looking secrets or unnecessary personal data.
46. Prefer omission or minimal metadata over masking when the sensitive value is not needed for the user to understand the result.
47. If the change affects an authorization, SSRF, CSRF, rate-limit, upload, download, token, business-logic, injection, logging, telemetry, cache authority, cache disclosure, admin operation, agent permission, cryptography, transport, scanner, policy-engine, rule-catalog, or abuse boundary, activate `security-regression-tests` for test selection instead of folding test generation into this review.
48. Run the narrowest configured verification that covers the changed docs, templates, package, or mustflow contract.

<!-- mustflow-section: postconditions -->
## Postconditions

- Sensitive data and disclosure surfaces have been identified or explicitly reported as unknown.
- AI-generated or happy-path-only security assumptions have been replaced with inspected server-side, dependency, tool-permission, or test evidence.
- Public and packaged surfaces do not include unnecessary secrets, personal data, or misleading privacy guarantees.
- Admin operations, shared-cache behavior, generated-state rebuilds, and audit logs are treated as security-sensitive when they affect private data, permissions, public indexing, traffic, or monetization.
- Client-side permission displays, file upload or download flows, private asset URLs, and API response fields are treated as disclosure and access-control surfaces.
- Permission models define actor, resource, action, scope, condition, and default-deny behavior when authorization is involved, or the missing model is reported as a risk.
- Administrator, support, internal-tool, feature-flag, and emergency-access exceptions are audited, time-bounded, or reported as authorization-model drift.
- Behavior analytics, observability, and audit logs are separated by durability, retention, attribution, personal-data, and loss-tolerance expectations.
- Core security, privacy, billing, entitlement, file, search, job, webhook, and administrator events are internally owned or explicitly reported as SaaS-only with the resulting export, retention, and incident-reconstruction risk.
- Trace context, baggage, request ids, user ids, tenant ids, job ids, and webhook ids are reviewed for sensitive data, external propagation, retention, and backend portability when those surfaces exist.
- Webhook receipts, retry logs, external API call records, and dead-letter records are bounded, redacted, deduplicated, and retained according to their sensitivity when those surfaces exist.
- Data residency, processing location, backup location, log location, analytics location, support-tool access, and AI provider location are separated or reported as unknown when those surfaces affect privacy, regulation, or customer commitments.
- Runtime and dependency patchability is reviewed when a stack choice or update policy affects security exposure.
- Cache-backed security, payment, entitlement, subscription, ownership, and inventory decisions fail closed or use a real source of truth instead of trusting disposable shared cache state.
- Sensitive cache and token changes keep raw payloads, secrets, prompts, source content, consent snapshots, and credential material out of cache entries, token claims, logs, traces, and final reports unless a narrow retention policy is named.
- Duplicated policy constants, language markers, and validator allowlists are checked against the canonical policy source or reported as manual drift risk.
- High-risk claims, comparison results, affiliate links, user-generated content, data ownership boundaries, and deletion or retention behavior are treated as security and privacy surfaces when they affect trust, disclosure, or personal data.
- The final report names remaining unverified security or privacy risks without revealing sensitive values.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Use a narrower configured test, build, or documentation intent when it better proves the changed sensitive surface.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a sensitive value appears in command output, stop copying it and summarize the issue without the value.
- If the project lacks enough context to confirm privacy or secret handling, report the uncertainty and avoid claiming safety.
- If authorization, SSRF, CSRF, rate-limit, BaaS policy, or agent-tool permission evidence is missing, report the exact unverified boundary and do not rely on client-side behavior as a substitute.
- If a copyable command, executable lookup, symlink-following path, or publishing workflow uses repository-controlled input across a trust boundary, treat it as a security issue until quoting, validation, no-follow file handling, or workflow isolation is verified.
- If a scanner reports many alerts from test fixtures or generated sample repositories, do not hide them by dismissal first. Prefer narrowing scanner inputs to the real release and runtime dependency surfaces, then document any intentionally scanned fixture exceptions.
- If a package, generated artifact, or public doc includes sensitive data, remove or redact it before continuing unrelated work.
- If verification requires unavailable scanners or live systems, report the missing check and the remaining risk.

<!-- mustflow-section: output-format -->
## Output Format

- Sensitive surfaces reviewed
- AI-generated happy-path assumptions checked
- Disclosure or retention paths checked
- Behavior analytics, observability, webhook, external-call, dead-letter, admin, audit-log, cache-authority, cache-disclosure, and generated-state rebuild boundaries checked when relevant
- Core event ownership, SaaS-only analytics risk, search-log sensitivity, queue-error retention, and incident-reconstruction boundaries checked when relevant
- Trace context, baggage, third-party data-use terms, export gating, and account-suspension or unilateral-terms risks checked when relevant
- Data residency, data classification, AI processing location, runtime patch, and hard-limit policy checked when relevant
- Claim, comparison, affiliate, user-generated content, data-ownership, deletion, anonymization, export, and retention boundaries checked when relevant
- Authorization, session, token, input, file, network, business-logic, dependency, cryptography, transport, deployment, scanner, and agent-tool boundaries checked
- Permission exception and emergency-access boundaries checked when relevant
- Redaction, omission, or wording changes made
- Related security-regression test need
- Command intents run
- Skipped checks and reasons
- Remaining security or privacy risk
