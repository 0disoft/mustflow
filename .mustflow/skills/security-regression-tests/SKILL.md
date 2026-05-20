---
mustflow_doc: skill.security-regression-tests
locale: en
canonical: true
revision: 9
lifecycle: mustflow-owned
authority: procedure
name: security-regression-tests
description: Apply this skill when security-sensitive code or behavior changes need abuse-case regression tests.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.security-regression-tests
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
    - build
---

# Security Regression Tests

<!-- mustflow-section: purpose -->
## Purpose

Convert security-sensitive behavior changes into safe negative tests that preserve defensive expectations without turning the task into vulnerability scanning, exploit development, or penetration testing.

<!-- mustflow-section: use-when -->
## Use When

- Authentication, authorization, session, CSRF, rate-limit, admin, payment, credit, subscription, personal-data, or tenant-boundary behavior changes.
- Input validation, output encoding, file upload, path handling, webhook callback, redirect, or external URL handling changes.
- Cookie, JWT, OAuth callback, reset token, invite token, logout, reauthentication, file download, upload processing, business-rule, entitlement, pricing, inventory, database query, ORM bulk operation, or deployment-configuration behavior changes.
- AI-generated or vibe-coded routes, data access, external fetchers, admin screens, or database rules need denied-case coverage beyond a happy-path test.
- Cryptography, password hashing, secure randomness, HTTPS/TLS, certificate validation, scanner-gate, or security-invariant behavior changes.
- Command construction, command recommendation, executable resolution, command-contract linting, or copy-to-clipboard command behavior changes.
- Filesystem containment, symlink handling, package publishing, build pipeline, or release automation behavior changes.
- A bug fix closes an abuse case and the fix needs a regression test to prevent reintroduction.
- A review identifies a concrete security-sensitive boundary that can be expressed as a deterministic test.
- A static analysis alert identifies a concrete data flow, permission boundary, command boundary, artifact boundary, or input-handling bug that can be locked with a local test.
- A repository health scanner flags missing fuzzing or property-based testing, and the project has a real parser, validator, serializer, path, command, or workflow boundary worth exercising with generated inputs.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is only a general security review, dependency audit, static analysis request, or policy discussion.
- The repository lacks enough application context to identify the real protected resource, actor, trust boundary, or existing test harness.
- The only available output would be a generic test such as "prevents XSS" without a specific route, component, serializer, or data flow.
- The test would require real external services, live attack traffic, credential guessing, destructive input, or unsafe payload collection.
- The user explicitly asks not to add or propose tests.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The changed behavior, diff, route, component, handler, data model, or bug fix that creates the security-sensitive boundary.
- The relevant actors, ownership rules, trust boundary, allowed and denied state combinations, and expected status or error behavior.
- Existing test framework, fixtures, factories, mocks, request helpers, and naming conventions.
- `.mustflow/config/commands.toml` entries for test, audit, lint, and build-related intents.
- Any project context or public contract that defines privacy, authorization, upload, callback, payment, or tenant rules.
- The executable, shell, filesystem, package, or workflow boundary that should reject repository-controlled input.
- Static-analysis rule identifier, flagged location, source-to-sink path, and the intended defensive outcome after the fix.
- Existing fuzzing or property-based testing libraries, package metadata, lockfiles, and test-runner conventions when generated-input tests are added.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.
- The test can be written as a defensive expectation without teaching an exploit recipe or contacting unsafe targets.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Prefer existing test files, fixtures, factories, mocks, and helper APIs before adding new test structure.
- Do not broaden command permission, invent project facts, introduce external scanners, add offensive payload corpora, or change unrelated workflow files.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the protected boundary: actor, resource, operation, trust boundary, and expected defensive outcome.
2. Classify the abuse case using project-specific facts, not broad labels alone:
   - unauthorized actor or cross-tenant access
   - BOLA/IDOR-style object access where the resource identifier is valid but belongs to another actor or tenant
   - invalid ownership or privilege escalation
   - UI-only admin gating without server-side role, owner, or capability enforcement
   - authentication-only checks that omit owner, tenant, workspace, organization, team, or capability constraints
   - unsafe session or token handling such as decode-only JWT checks, missing expiry, missing issuer or audience validation, missing logout revocation, or missing reauthentication before sensitive changes
   - unsafe input shape, size, encoding, path, or MIME mismatch
   - unsafe sort, redirect, pagination, parser, Markdown, XML, YAML, or template input that reaches a query, file path, HTML, or command boundary
   - unsafe output rendering or serialization
   - file upload or download authorization, content-type, signature, size, filename, metadata, web-root, or conversion resource-limit failure
   - unsafe external URL, callback, redirect, or server-side request target
   - SSRF-style private network, localhost, link-local metadata, redirect, or DNS re-resolution target
   - missing webhook signature validation or unsafe retry behavior for external callbacks
   - CSRF-style state change that relies on browser credentials without an origin, token, or same-site boundary
   - missing rate limit or lockout on login, signup, token reset, invitation, webhook, or expensive generation endpoints
   - client-supplied price, discount, role, owner, entitlement, plan, inventory, seat, refund, coupon, or usage value trusted by the server
   - ORM mass assignment, unscoped `findMany`, `updateMany`, `deleteMany`, unsafe migration default, or missing database policy enforcement
   - unsafe shell command construction, command name interpolation, clipboard command output, or executable lookup
   - filesystem escape through symlinks, path traversal, archive entries, generated state, or package contents
   - mismatch between two validators, linters, dashboards, schemas, or release gates that claim the same policy
   - release or package-publishing pipeline code execution before artifact publication
   - incomplete escaping, quoting, encoding, or sanitization where the safe behavior can be asserted without invoking a real shell or network target
   - stack trace or internal error exposure through a user-visible API, report, dashboard, or command output
   - insecure password storage, custom cryptography, weak hash use, insecure randomness, or predictable reset or invite tokens
   - disabled certificate validation, insecure HTTP downgrade, or missing HTTPS enforcement for sensitive traffic
   - architecture drift where a refactor preserves the happy path but drops a security invariant across a layer boundary
   - workflow permission drift, mutable action references, wrong pinned-action object type, dependency scan overreach, or artifact credential leakage that can be checked through repository-local workflow tests or linters
   - payment, credit, coupon, subscription, refund, or entitlement abuse
   - personal-data or admin-only access leakage
   - unsafe direct execution of destructive, bulk, migration, billing, permission, publishing, or external-send operations without a reviewable plan/apply boundary
   - missing capability or scoped permission object where a sensitive operation depends on broad user, role, or global authorization state
   - missing invariant policy where a sensitive state change could violate a non-negotiable rule such as last-owner, entitlement, paid-order, refund, or retention constraints
   - missing idempotency key, action ledger, or outbox/inbox record where repeated execution of a side effect could charge, refund, notify, grant, revoke, publish, or delete more than once
   - exposed debug, admin, metrics, storage, GraphQL, development console, root container user, default credential, or fork pull-request secret path that can be checked locally
3. Search for existing tests that already cover the same boundary. Strengthen the existing test when that gives clearer coverage than adding a new one.
4. Build the smallest safe negative test data: at least one allowed control case when useful, and one denied case that proves the boundary rejects the abuse condition.
5. For ownership and tenant boundaries, use two actors and two resources. Prove that the valid owner succeeds and the non-owner fails for the same resource identifier shape.
6. For SSRF and redirect boundaries, use local fake resolvers or request adapters and assert that private, loopback, link-local, metadata, unsupported protocol, and redirect-to-denied targets are rejected without making live network calls.
7. For CSRF and browser-credential state changes, assert that the mutating operation rejects missing or mismatched token, origin, or same-site evidence according to the project framework.
8. For rate limits and lockouts, use injected time, local stores, or fake counters to prove repeated attempts are bounded without slowing the suite.
9. For session, JWT, OAuth, reset, invite, logout, or reauthentication boundaries, assert the denied condition directly: invalid signature, expired token, wrong issuer, wrong audience, missing state, revoked token, reused token, or missing recent authentication.
10. For upload and download boundaries, use local fixture files and fake storage. Assert authorization, content signature, MIME, size, filename, path, metadata stripping, and conversion resource-limit behavior without using live user files.
11. For business-rule boundaries, use server-side fixtures that try manipulated price, discount, role, owner, entitlement, plan, inventory, seat, refund, coupon, or usage fields. Assert that state remains unchanged or is recalculated from trusted server data.
12. For database and ORM boundaries, assert scoped queries or policies through observable behavior: cross-tenant rows stay invisible, bulk update or delete affects only owned rows, mass-assigned privileged fields are ignored, and unsafe migration defaults cannot create elevated access.
13. For cryptography and token-generation boundaries, assert behavior through the project-owned API rather than hard-coding private implementation details: password verifiers reject plaintext or fast-hash storage, token generation uses injected secure randomness or a deterministic test double, and custom cryptography shortcuts are absent where the project exposes that decision.
14. For transport-security boundaries, assert configuration rejects disabled certificate validation or insecure HTTP for sensitive endpoints when the project owns that configuration.
15. For architecture-drift boundaries, write the test around the security invariant, not the refactor shape: unauthorized access stays denied, sensitive output stays omitted, and side effects remain scoped after the generated structure changes.
16. For parser, validator, serializer, path, command, or workflow boundaries, consider a bounded property-based or fuzz-style regression when the invariant is clearer than a list of hand-written examples. Keep generators local, deterministic under the test runner, size-limited, and focused on the defensive invariant.
17. When adding a fuzzing or property-based testing dependency, keep dependency metadata, lockfiles, test selection rules, and package tests synchronized. Prefer an existing project dependency when it can express the invariant cleanly.
18. Use mocks or local fakes for external requests, uploads, redirects, webhooks, payment providers, file systems, shell commands, package registries, and CI workflows. Do not contact live suspicious endpoints or publish real artifacts.
19. Name the test after the defensive expectation, such as `cannot_read_other_users_invoice` or `rejects_private_network_callback_url`.
20. Keep assertions tied to observable behavior: status code, returned error shape, unchanged database state, missing side effect, sanitized output, rejected job, or invariant preserved for all generated cases.
21. Avoid dumping long exploit strings into the test. Use minimal representative inputs or generated values that prove the validation or boundary rule without becoming an offensive payload corpus.
22. For command and filesystem boundaries, assert the denied side effect directly: no injected command appears in a runnable recommendation, no repository-local shim is executed, no background shell pattern is counted runnable, no symlink target outside the root is read or written.
23. For plan/apply, capability, invariant, time, and idempotency boundaries, assert the safety contract directly: planning produces no side effect, commit rejects stale or unauthorized capability, invalid transitions preserve state, injected time controls expiry, and repeated side-effect keys do not repeat the effect.
24. For workflow scanner fixes, prefer repository-local assertions for durable contracts: action references are pinned to commit SHAs or digest-pinned containers, privileged permissions are job-scoped, fork pull requests do not receive secrets, deployment or scanner jobs can be manually rerun when useful, and dependency scans exclude fixture-only manifests unless intentionally included.
25. For deployment and configuration fixes, prefer local config assertions: debug flags are off for production, sample credentials are absent, public admin or metrics endpoints are not enabled by default, storage is not public, containers do not run as root when the project controls that setting, and HTTPS requirements are preserved.
26. For scanner-driven fixes, include a regression only when the rule reflects a durable project contract. Do not add brittle tests that merely assert the scanner's current wording, line number, or severity.
27. If the project lacks enough context to write a deterministic test, output a concrete test proposal instead of inventing fixtures or behavior.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.
- New tests are justified by a concrete security-sensitive behavior contract, not by a habit of adding tests to every change.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `test_related`
- `test`
- `test_audit`
- `lint`
- `build`

Prefer the narrowest configured test intent that covers the changed boundary. Do not infer missing test, lint, scanner, or build commands. If a relevant intent is unknown or manual-only, report that status and the remaining verification risk.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a generated test fails because the defensive behavior is missing, inspect the nearest production code that owns the boundary before weakening the test.
- If a generated test fails because fixtures or assumptions are wrong, fix the test setup or report the missing project fact.
- If the test would require unsafe traffic, real credentials, live external targets, or destructive data, replace it with a local mock-based expectation or a written test proposal.
- If existing tests already prove the boundary, report the existing coverage rather than adding duplicate cases.
- If the repository's testing policy requires more evidence before adding tests, report the security-sensitive contract that justifies the test or stop at a proposal.

<!-- mustflow-section: output-format -->
## Output Format

- Security-sensitive boundary reviewed
- Abuse case classification
- Defensive structure selected, such as plan/apply, capability, invariant policy, adapter, injected time, or action ledger
- Required test data
- Tests added or strengthened
- Property-based or fuzz-style invariant covered, if used
- Existing coverage reused
- Suspected code location if the test fails
- Command intents run
- Skipped command intents and reasons
- Remaining security or verification risks
