---
mustflow_doc: skill.security-regression-tests
locale: en
canonical: true
revision: 6
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
   - invalid ownership or privilege escalation
   - unsafe input shape, size, encoding, path, or MIME mismatch
   - unsafe output rendering or serialization
   - unsafe external URL, callback, redirect, or server-side request target
   - unsafe shell command construction, command name interpolation, clipboard command output, or executable lookup
   - filesystem escape through symlinks, path traversal, archive entries, generated state, or package contents
   - mismatch between two validators, linters, dashboards, schemas, or release gates that claim the same policy
   - release or package-publishing pipeline code execution before artifact publication
   - incomplete escaping, quoting, encoding, or sanitization where the safe behavior can be asserted without invoking a real shell or network target
   - stack trace or internal error exposure through a user-visible API, report, dashboard, or command output
   - workflow permission drift, mutable action references, wrong pinned-action object type, dependency scan overreach, or artifact credential leakage that can be checked through repository-local workflow tests or linters
   - payment, credit, coupon, subscription, refund, or entitlement abuse
   - personal-data or admin-only access leakage
   - unsafe direct execution of destructive, bulk, migration, billing, permission, publishing, or external-send operations without a reviewable plan/apply boundary
   - missing capability or scoped permission object where a sensitive operation depends on broad user, role, or global authorization state
   - missing invariant policy where a sensitive state change could violate a non-negotiable rule such as last-owner, entitlement, paid-order, refund, or retention constraints
   - missing idempotency key, action ledger, or outbox/inbox record where repeated execution of a side effect could charge, refund, notify, grant, revoke, publish, or delete more than once
3. Search for existing tests that already cover the same boundary. Strengthen the existing test when that gives clearer coverage than adding a new one.
4. Build the smallest safe negative test data: at least one allowed control case when useful, and one denied case that proves the boundary rejects the abuse condition.
5. For parser, validator, serializer, path, command, or workflow boundaries, consider a bounded property-based or fuzz-style regression when the invariant is clearer than a list of hand-written examples. Keep generators local, deterministic under the test runner, size-limited, and focused on the defensive invariant.
6. When adding a fuzzing or property-based testing dependency, keep dependency metadata, lockfiles, test selection rules, and package tests synchronized. Prefer an existing project dependency when it can express the invariant cleanly.
7. Use mocks or local fakes for external requests, uploads, redirects, webhooks, payment providers, file systems, shell commands, package registries, and CI workflows. Do not contact live suspicious endpoints or publish real artifacts.
8. Name the test after the defensive expectation, such as `cannot_read_other_users_invoice` or `rejects_private_network_callback_url`.
9. Keep assertions tied to observable behavior: status code, returned error shape, unchanged database state, missing side effect, sanitized output, rejected job, or invariant preserved for all generated cases.
10. Avoid dumping long exploit strings into the test. Use minimal representative inputs or generated values that prove the validation or boundary rule without becoming an offensive payload corpus.
11. For command and filesystem boundaries, assert the denied side effect directly: no injected command appears in a runnable recommendation, no repository-local shim is executed, no background shell pattern is counted runnable, no symlink target outside the root is read or written.
12. For plan/apply, capability, invariant, time, and idempotency boundaries, assert the safety contract directly: planning produces no side effect, commit rejects stale or unauthorized capability, invalid transitions preserve state, injected time controls expiry, and repeated side-effect keys do not repeat the effect.
13. For workflow scanner fixes, prefer repository-local assertions for durable contracts: action references are pinned to commit SHAs or digest-pinned containers, privileged permissions are job-scoped, deployment or scanner jobs can be manually rerun when useful, and dependency scans exclude fixture-only manifests unless intentionally included.
14. For scanner-driven fixes, include a regression only when the rule reflects a durable project contract. Do not add brittle tests that merely assert the scanner's current wording, line number, or severity.
15. If the project lacks enough context to write a deterministic test, output a concrete test proposal instead of inventing fixtures or behavior.

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
