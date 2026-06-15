---
mustflow_doc: skill.security-flow-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: security-flow-review
description: Apply this skill when code is created, changed, reviewed, or reported and security review needs source-to-sink tracing across authorization, object ownership, tenant scoping, IDOR or BOLA risk, mass assignment, admin-only surfaces, cache keys, exports, injection-like inputs, ORM raw paths, SSRF, file upload and extraction, path traversal, XSS, CSRF, OAuth, reset tokens, JWTs, cookies, cryptography, logs, fail-open error handling, async jobs, race conditions, or supply-chain and CI/CD paths.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.security-flow-review
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

# Security Flow Review

<!-- mustflow-section: purpose -->
## Purpose

Review security risk by following values, actors, resource identities, state changes, and trust
boundaries to the actual data sink. Do not stop at dangerous keywords, route guards, or scanner
labels.

The review question is not "does this file contain `eval`, `exec`, or raw SQL?" It is "where did
this value come from, which actor may use it, which resource or tenant does it touch, which state
changes, and where can data or authority leak?"

<!-- mustflow-section: use-when -->
## Use When

- Code review, implementation, or report work touches routes, handlers, services, repositories,
  resolvers, jobs, workers, admin tools, exports, imports, caches, files, external fetchers,
  OAuth callbacks, tokens, cookies, logs, CI workflows, package metadata, or dependency execution.
- A feature accepts an identifier, URL, filename, path, HTML, Markdown, sort key, filter, field list,
  status, role, price, entitlement, tenant id, organization id, user id, or client-provided state.
- The suspected issue may be BOLA, IDOR, missing authorization, tenant leak, mass assignment,
  injection, SSRF, path traversal, file upload abuse, XSS, CSRF, token misuse, fail-open behavior,
  duplicate side effect, or supply-chain trust drift.
- A scanner, checklist, or reviewer mentions a security label but the real source, sink, actor,
  resource, and failing permission path still need to be verified from the code.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task changes an authentication or authorization model and needs implementation guidance; use
  `auth-permission-change` as the primary skill and this skill only for cross-surface review.
- The task needs security or privacy disclosure review across logs, docs, retention, AI records, or
  packaged artifacts; use `security-privacy-review`.
- The task needs concrete abuse-case tests after a boundary is understood; use
  `security-regression-tests` for that part.
- The task is only dependency freshness or version selection; use `dependency-reality-check` or
  `version-freshness-check`.
- The task asks for penetration testing, live attack traffic, exploit development, credential
  guessing, or unsafe payload collection. Stay within local code review and defensive evidence.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User goal, current diff or target files, and the security claim being reviewed.
- Source-to-sink map: untrusted input, trusted context, transformations, authorization decisions,
  persistence, external calls, rendering, logs, cache keys, queue payloads, and returned data.
- Actor and resource map: principal, tenant, owner, organization, workspace, team, role, capability,
  service account, admin scope, and target resource id.
- Read and write surfaces: list, detail, count, export, download, search, stats, update, delete,
  approve, invite, upload, webhook, callback, job, and admin paths.
- Framework or platform escape hatches: raw query APIs, shell wrappers, HTML escape bypasses, file
  APIs, URL fetchers, parser options, cache behavior, token libraries, and CI/package lifecycle hooks.
- Existing tests, denial cases, scanner findings, security docs, command intent entries, and any
  missing context that blocks a confident conclusion.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- Required inputs are available, or missing actor, resource, source, sink, tenant, or test evidence
  can be reported without guessing.
- If the review identifies a concrete auth, cache, file, command, path, dependency, failure,
  concurrency, or regression-test problem, also use the narrower skill before editing that part.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Tighten server-side ownership checks, tenant-scoped queries, allowlisted updates, cache-key
  dimensions, URL and path validation, parser or renderer boundaries, upload and extraction limits,
  token validation, cookie flags, fail-closed error handling, queue revalidation, idempotency, and
  focused tests directly tied to the reviewed flow.
- Add small policy, mapper, validator, sanitizer, encoder, adapter, or result-mapping code only when
  it names the security boundary and reduces duplicated or caller-owned security decisions.
- Update directly synchronized docs, templates, fixtures, or route metadata when the public security
  contract changes.
- Do not add broad scanners, offensive payload corpora, live external probes, dependency installs,
  or unrelated hardening work under this skill.

<!-- mustflow-section: procedure -->
## Procedure

1. Start at the real sink.
   - For reads, identify the query, cache lookup, file read, search index, export builder, download
     signer, API response, rendered page, or log record where data leaves the system.
   - For writes, identify the database mutation, state transition, queue message, external call,
     file write, package artifact, CI action, or admin operation where authority changes the system.
2. Trace the source-to-sink path.
   - Mark every value as trusted server context, authenticated identity, repository data, provider
     data, user input, query string, path parameter, body field, header, cookie, token claim, file
     metadata, or CI/package metadata.
   - Do not treat framework validation, TypeScript types, generated clients, route placement, or a
     hidden frontend button as proof that the sink is safe.
3. Separate authentication from authorization.
   - `isAuthenticated`, a session, an API key, or a valid JWT answers who is calling.
   - Ask whether this actor may perform this action on this resource in this tenant right now.
4. Treat every resource identifier as an IDOR or BOLA candidate.
   - Review path ids, UUIDs, slugs, file keys, invoice ids, team ids, project ids, and nested member
     ids as attacker-controllable unless the server derives them from trusted context.
   - UUID is a long address, not a lock.
5. Compare list, detail, count, export, search, and download scopes.
   - If `findMany` filters by actor or tenant but `findOne`, `count`, `exportCsv`, `bulkDownload`,
     `searchUsers`, or `analytics` does not, report the mismatch before celebrating the route guard.
6. Review state-changing operations more strictly than reads.
   - For update, delete, approve, refund, invite, transfer, publish, purge, and role-change flows,
     name actor, resource, allowed state, target state, amount, limit, and audit expectation.
   - Reject direct assignment such as `status = req.body.status` when status transitions have policy.
7. Reject mass assignment at the boundary.
   - Flag `Object.assign(entity, body)`, `Model.create(input)`, `User.update(req.body)`, DTO-to-model
     blind copies, GraphQL input passthrough, and ORM update data built from raw request bodies.
   - Privileged fields such as `role`, `ownerId`, `tenantId`, `isPaid`, `plan`, `price`, `status`,
     `quota`, and `isAdmin` should be derived or allowlisted.
8. Slow down on admin-only and internal surfaces.
   - Frontend-only admin screens, support tools, debug routes, backoffice actions, impersonation,
     ops endpoints, and internal RPC still need server-side authorization, reason, audit, and scope.
9. Check tenant and permission dimensions in caches.
   - Cache keys for private or policy-shaped data need user, tenant, organization, role, permission,
     locale, experiment, filter, and data-version dimensions when those change the result.
   - Shared caches, CDN caches, SSR caches, fetch caches, Redis keys, and hydration data can freeze a
     security bug and serve it to the wrong viewer.
10. Treat sort, filter, field, include, expand, group, and query language as input sinks.
    - Parameterized `WHERE` clauses do not save `ORDER BY ${sort}`, raw ORM fragments, Mongo filters,
      Elasticsearch query DSL, GraphQL field selection, LDAP, XPath, or filesystem path composition.
    - Validate against a static allowlist for grammar positions, not by escaping arbitrary strings.
11. Look past obvious command execution calls.
    - Image conversion, PDF generation, archive tools, video processing, git wrappers, kubectl
      wrappers, antivirus scans, backups, and package scripts may invoke a shell or executable.
    - Keep user filenames, URLs, formats, and options out of shell syntax; prefer argv arrays and
      static command maps.
12. Review every server-side URL fetch as an SSRF candidate.
    - Webhook tests, image proxies, OG previews, PDF renderers, RSS imports, S3 URL imports, OAuth
      metadata, XML parsers, and storage-copy features fetch on behalf of the user.
    - Check scheme allowlists, redirect policy, DNS re-resolution, localhost, private network,
      link-local metadata, credential forwarding, timeout, and response size.
13. Review file upload by what happens after upload.
    - Check preview, download, conversion, thumbnailing, admin review, metadata extraction, content
      sniffing, storage path, executable web root, signed URL generation, and authorization on read.
    - SVG, HTML, PDF, DOCX, archive, and image metadata paths need different rules than extension
      checks alone.
14. For archives, check Zip Slip and decompression bombs together.
    - Normalize each archive entry and prove the final path stays inside the target directory.
    - Bound extracted file count, total bytes, nested archives, compression ratio, and processing time.
15. Check path traversal beyond download routes.
    - Locale files, templates, themes, attachments, logs, static proxies, backup restore, plugin
      loaders, model loaders, and generated state all need real-path containment after symlinks and
      normalization.
16. Trace browser-code execution contexts.
    - XSS can enter through Markdown, rich text, translations, email templates, chart labels, admin
      dashboards, CSV exports, hydration data, JSON-in-script blocks, and framework escape hatches.
    - Identify the output domain first: HTML text, HTML attribute, URL, JavaScript string, CSS, JSON,
      Markdown, CSV, XML, or log line.
17. Review CSRF whenever browsers send credentials automatically.
    - Cookie-authenticated state changes need method discipline, SameSite posture, origin or CSRF
      token checks, content-type handling, and CORS credential boundaries.
18. Review OAuth, SSO, reset, magic-link, JWT, and cookie trust.
    - OAuth needs `state`, `nonce`, exact redirect binding, PKCE when applicable, and safe account
      linking.
    - Reset and magic-link tokens need randomness, one-time use, short TTL, safe storage, session
      revocation, and protection from link previews and logs.
    - JWT validation needs issuer, audience, expiry, not-before, key rotation, stale claim handling,
      tenant claim distrust, and current server-side permission for important actions.
    - Cookies need `HttpOnly`, `Secure`, `SameSite`, domain, path, lifetime, refresh rotation, and
      server-side logout or revocation when tokens are durable.
19. Reject homegrown cryptography and weak token generation.
    - Watch for custom ciphers, fixed IVs, ECB, nonce reuse, unauthenticated encryption, unsalted or
      fast password hashes, predictable tokens, and non-cryptographic randomness.
20. Review logs in both directions.
    - Too much logging leaks tokens, sessions, reset links, API keys, prompts, personal data,
      payment data, private filenames, provider payloads, and internal notes.
    - Too little logging hides login failures, denied access, admin changes, token refreshes,
      payment failures, webhook failures, and permission changes.
21. Search for fail-open error handling.
    - `try { checkPermission() } catch { allow() }`, default-allow policies, empty catches, fallback
      owners, auth-service-down pass-through, and default public cache entries are security bugs in
      normal clothes.
22. Recheck asynchronous and queued work at execution time.
    - Queue payloads, exports, file conversions, email sends, payment refunds, invitations, and
      permission changes need actor, tenant, resource, state, and permission revalidation when the
      worker runs, not only when the job was enqueued.
23. Review race conditions where money, inventory, entitlement, coupons, seats, roles, or invites
    can be used twice.
    - Look for transaction boundaries, unique constraints, row locks, idempotency keys, action
      ledgers, outbox or inbox records, and reconciliation for unknown external outcomes.
24. Review supply-chain and CI/CD paths as code execution.
    - Dependency manifests, lockfiles, postinstall scripts, codegen, Docker base images, GitHub
      Actions permissions, workflow triggers, artifact upload, CI secrets, package publish identity,
      Terraform modules, Helm charts, and deployment scripts can execute or leak authority.
25. Convert the finding into the smallest defensive action.
    - Fix the owner closest to the sink when the boundary is clear.
    - If evidence is incomplete, report the exact unverified source, sink, actor, resource, tenant,
      state, or test gap instead of making a broad security claim.

<!-- mustflow-section: postconditions -->
## Postconditions

- The reviewed flow names source, sink, actor, resource, tenant or owner, trust boundary, state
  change, and data disclosure path when those apply.
- Authentication, authorization, object ownership, tenant scoping, and admin scope are not collapsed
  into one route guard claim.
- Input sinks are classified by grammar or output domain rather than by generic "sanitize input"
  wording.
- Security-sensitive caches, workers, queues, logs, tokens, files, browser renderers, and CI/CD paths
  are either checked or explicitly reported as outside the current evidence.
- Any concrete security bug fix has denial-case or invariant evidence, or the missing test surface is
  reported.

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

Prefer the narrowest configured test intent that proves the reviewed defensive boundary. Use
`security-regression-tests` when adding or proposing abuse-case tests.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If actor, tenant, resource, source, or sink evidence is missing, report the missing link and avoid
  claiming the flow is safe.
- If a sensitive value appears in logs, diffs, fixtures, screenshots, command output, or final
  reports, stop repeating it and use `secret-exposure-response` when it may be a real secret.
- If the fix would require a broad authorization model change, switch to `auth-permission-change`
  before editing that scope.
- If scanner output names a class without a reproducible source-to-sink path, treat it as a lead and
  either prove the path or report it as unverified.
- If verification requires live scanners, external systems, credentials, production data, or unsafe
  traffic, skip that path and report the remaining risk.

<!-- mustflow-section: output-format -->
## Output Format

- Security flow reviewed
- Source, sink, actor, resource, tenant or owner, and state-change map
- Authorization and ownership notes
- Input, file, network, browser, token, cookie, crypto, log, fail-open, async, race, cache, and
  supply-chain findings when relevant
- Fixes made or recommendation
- Tests, denial cases, or invariant evidence
- Command intents run
- Skipped checks and reasons
- Remaining security-flow risk
