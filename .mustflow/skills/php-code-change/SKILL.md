---
mustflow_doc: skill.php-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: php-code-change
description: Apply this skill when PHP source, Composer packages, Laravel or Symfony applications, Eloquent or Doctrine persistence, PHP-FPM, OPcache, Octane, RoadRunner, Swoole, Messenger or queue workers, authentication, sessions, uploads, database concurrency, tests, or PHP deployment behavior are created, changed, reviewed, migrated, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.php-code-change
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

# PHP Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve PHP language, Composer, dependency injection, request lifetime, ORM, transaction, input,
authentication, session, filesystem, worker, FPM, OPcache, container, and deployment contracts.
Do not let PHP-FPM's request reset hide stateful design that leaks users or resources under Octane,
RoadRunner, Swoole, Messenger, queue workers, persistent connections, or other long-lived processes.

<!-- mustflow-section: use-when -->
## Use When

- PHP source, Composer metadata or lockfiles, autoloading, extensions, static analysis, tests,
  framework bootstrap, console commands, queues, scheduled jobs, or package APIs change.
- Laravel, Symfony, Eloquent, Doctrine, service containers, middleware, events, cache, sessions,
  authentication, authorization, uploads, validation, serialization, or database behavior changes.
- PHP-FPM pools, OPcache, web-server/FastCGI integration, containers, health probes, timeouts,
  long-running workers, deployment caches, migrations, or rollout behavior changes.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The change is framework-free frontend code or another language with no PHP runtime boundary.
- Only SQL schema or database operations change and PHP behavior is unaffected; use the narrower
  data or migration skill.
- The task asks only for the current PHP, Laravel, Symfony, or Doctrine version; use
  source-freshness guidance unless code or durable documentation changes too.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- PHP version source, supported runtime range, required extensions, Composer metadata and lockfile,
  autoload rules, framework and ORM versions, static-analysis level, test config, CI and image.
- Execution model: PHP-FPM, CLI, server, Octane, RoadRunner, Swoole, queue worker, Messenger,
  scheduled job, persistent process, or mixed deployment.
- Request and state ledger: container scope, request/user/tenant state, globals, statics, singleton
  fields, ORM unit of work, sessions, caches, connections, files, timers, buffers, and reset owners.
- Security ledger: input sources, validation, output context, SQL, commands, paths, uploads,
  deserialization, secrets, passwords, authentication, CSRF, session lifetime, and proxy trust.
- Data ledger: query count, rows and bytes, hydration, lazy loading, transaction owner, connection,
  locks, unique constraints, optimistic versions, retries, outbox, pagination, and batch ownership.
- Runtime ledger: FPM mode and limits, OPcache policy, timeouts, web server, probes, container
  resources, deployment cache generation, worker reload, observability, and rollback.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read repository PHP, Composer, framework, ORM, extension, deployment, and test evidence before
  using current APIs or migration guidance.
- Refresh official PHP, Composer, Laravel, Symfony, Doctrine, web-server, database, and platform
  sources before preserving exact version, default, deprecation, security, or support claims.
- Treat version research as a dated snapshot. The official-source snapshot reviewed on 2026-07-11
  identified PHP 8.5.8 as stable and PHP 8.6.0 Alpha 1 as prerelease; recheck the current stable,
  supported branches, migration guides, and each feature's actual release status before reuse.
- Identify whether process state ends after one request. Treat every service as potentially reused
  until the selected runtime proves request-scoped destruction.
- Apply narrower auth, upload, transaction, cache, queue, logging, performance, or deployment skills
  when those boundaries materially change.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Make focused PHP, Composer, framework, ORM, config, test, deployment, and docs changes required by
  the task.
- Add explicit DTOs, query objects, reset hooks, transaction owners, validation, session controls,
  performance instrumentation, or deployment checks where they protect changed behavior.
- Preserve supported PHP versions and framework conventions unless migration is explicit.
- Do not hide failures by lowering static analysis, disabling tests, granting broad filesystem
  permissions, enabling unsafe deserialization, widening session scope, or raising resource limits
  without evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. **Classify runtime and package contracts.**
   - Record PHP SAPI, version, extensions, Composer platform requirements, autoload roots, scripts,
     plugins, package type, framework, ORM, worker model, image, and deployment target.
   - Treat Composer scripts and plugins as executable supply-chain boundaries. Review lockfile,
     platform checks, extension requirements, optimized autoload, authoritative classmaps, and
     packaged files separately from source-tree success.
   - Keep library dependency ranges compatible and application environments reproducible. Commit
     application lockfiles, use `composer install` in CI and deployment, and validate the lock
     rather than resolving a fresh graph during release.
   - Treat repository priority, canonical repositories, package names, `replace`, `provide`,
     `conflict`, stability flags, Composer plugins, and `autoload.files` as supply-chain behavior.
     Do not assume a dependency's `repositories` configuration propagates to the root project.
   - Use `composer why` and `why-not` before widening constraints or deleting a lockfile. Verify the
     built artifact with real platform requirements; `config.platform` and
     `--ignore-platform-reqs` do not prove that production has the required PHP or extensions.
   - Enforce PSR-4 path and case correctness on a case-sensitive CI filesystem and detect ambiguous
     classes. Optimize production autoloading, but use authoritative classmaps only after proving
     that runtime-generated proxies or classes do not depend on fallback discovery.
2. **Keep dependencies and state ownership visible.**
   - Confine container access and service location to composition roots. Prefer constructor
     injection of narrow contracts over global helpers, facades, or arbitrary container lookup.
   - Add layers only where policy, representation, transaction, authorization, or replacement
     changes. Remove pass-through controller, action, service, manager, and generic repository
     chains that hide cost without owning a boundary.
   - Keep request, user, tenant, locale, auth, and transaction state out of singleton and static
     fields. Pass request values explicitly or use a resettable request-scoped owner.
   - For long-lived runtimes, reset application state, ORM units of work, log buffers, caches,
     files, connections, and framework services between jobs or requests. Bound worker lifetime and
     reload workers during deployment.
3. **Separate ORM entities from external contracts.**
   - Do not use Eloquent models or Doctrine entities as universal API, queue, event, cache, or
     integration payloads. Define whether a queued job needs an identifier and execution-time state
     or an immutable publication-time snapshot.
   - Keep business invariants in explicit application or domain operations. Do not hide critical
     payments, stock, authorization, or external effects in model listeners whose execution differs
     across bulk update, delete, flush, or import paths.
   - Use transactional outbox and idempotent consumers for external side effects.
4. **Measure query shape, not only query count.**
   - Detect N+1 by request-level query count, normalized fingerprints, total DB time, rows, bytes,
     and result-size scaling. Make unexpected lazy loading fail in development or tests.
   - Do not replace N+1 with an unbounded eager-loaded graph or multi-collection join explosion.
     Page parent identifiers first and batch child, aggregate, or projection queries deliberately.
   - Use entities for behavior-changing writes. Use DTO, scalar, array, DBAL, or query-builder
     projections for lists, reports, exports, counts, and read-only views.
   - Use bounded iteration, keyset or cursor pagination, stable unique tie-breakers, and unit-of-work
     clearing for large datasets. Avoid deep OFFSET and per-request exact counts without product need.
   - Avoid `fetchAll()` and full ORM hydration for large streams. Select only required columns,
     choose an explicit fetch mode, and account for driver buffering, identity maps, and connection
     restrictions while an unbuffered result remains open.
5. **Own transactions and concurrency at the use case.**
   - Let one business operation own begin, commit, rollback, retry, and the shared connection.
     Nested work cannot commit independently; use explicit savepoints only when supported and intended.
   - Keep HTTP, email, queue publication, and long computation outside row-locking transactions.
     Store business data and outbox records atomically, then publish after commit.
   - Enforce uniqueness and invariants with database constraints and atomic updates or upserts.
     Treat check-then-insert and read-compute-write as races.
   - Verify affected rows, optimistic versions, lock scope, index support, and deterministic lock
     order. Retry the whole transaction on classified deadlock or serialization failure with a
     bounded backoff; never repeat only the final statement with stale reads.
   - Persistent PDO connections require explicit cleanup of transactions, locks, temporary state,
     and session settings before reuse.
6. **Validate input by meaning and encode output by context.**
   - Avoid loose comparison for authentication, tokens, signatures, hashes, identifiers, and
     security decisions. Use strict types and constant-time comparison where secret equality matters.
   - Distinguish filtering from validation. Normalize only according to a named domain rule and
     preserve missing, empty, null, zero, and false as different states where the contract does.
   - Use parameterized SQL for values and allowlists for identifiers, sort direction, table,
     column, operator, and dynamic query structure.
   - Avoid `extract()`, variable variables, mass assignment, and broad array-to-object hydration at
     trust boundaries. Define allowed fields and nested shapes explicitly.
   - Encode output for HTML text, attributes, URLs, JavaScript, JSON, headers, and logs at the final
     sink; one escaping function does not fit every context.
7. **Harden files, commands, serialization, and secrets.**
   - For uploads, validate authorization, size, count, extension, MIME, magic bytes, image or archive
     structure, decompression limits, generated server-side names, storage outside executable roots,
     and safe download headers. Never trust the client filename or MIME alone.
   - Canonicalize and constrain filesystem paths against an owned root, accounting for symlinks,
     races, archive traversal, stream wrappers, and web-server handlers.
   - Avoid shell construction. Use argument-safe process APIs, narrow executable allowlists,
     timeouts, bounded output, environment control, and least OS privilege.
   - Do not `unserialize()` untrusted data. Use explicit schemas; when signed client state is
     unavoidable, authenticate integrity and separate confidentiality requirements.
   - Keep secrets out of errors, dumps, logs, phpinfo, source control, build artifacts, caches, and
     browser-visible configuration.
8. **Harden passwords, authentication, and sessions.**
   - Use supported password APIs and sufficient storage width. Account for bcrypt's byte limit,
     reject over-limit input rather than truncating, avoid silent normalization, and rehash after
     successful login when policy changes.
   - Keep unknown-account and wrong-password responses, status, shape, and expensive hash path
     comparable. Apply bounded risk-based throttling without creating an attacker-controlled
     permanent account lock.
   - Generate reset and verification URLs from a configured trusted origin. Store token hashes,
     enforce short expiry and single use, and revoke affected sessions after sensitive changes.
   - Enable strict session-ID handling, cookie-only transport, secure cookie attributes, ID rotation
     at privilege changes, and a concurrency-safe transition from old IDs.
   - Treat SameSite as defense in depth, not CSRF authorization. Protect state-changing and login
     requests with CSRF tokens and origin checks as appropriate.
   - Enforce idle, absolute, renewal, revocation, and recent-authentication policy server-side;
     garbage collection and cookie expiry are not authentication policy.
9. **Design cache and middleware cost explicitly.**
   - Include tenant, locale, currency, authorization visibility, query shape, and schema version in
     cache identity. Avoid caching ORM entities.
   - Prevent stampedes with jitter, locks, stale-while-revalidate, and one refresh owner.
   - Keep global middleware and subscribers limited to truly universal work. Measure auth, tenant,
     session, locale, feature flag, audit, and activity-update costs by route.
   - Release a file-backed session lock as soon as session mutation is complete. Do not hold one
     user's parallel requests behind database, HTTP, upload, or other slow work.
10. **Measure algorithm, allocation, and discovery cost before micro-optimizing.**
    - Profile representative data sizes and concurrency with wall time, CPU, allocations, peak RSS,
      I/O waits, and tail latency. Do not trade clarity for `isset()`-scale folklore while quadratic
      copying, serialization, locks, or network waits dominate.
    - Avoid repeated `array_merge()` accumulation and front-removal with `array_shift()` in growing
      loops. Append directly, merge once, use a cursor, or choose a queue with the required
      complexity while preserving numeric and string key semantics.
    - Remember that PHP arrays are ordered maps, not compact primitive vectors. Avoid retaining
      millions of rows or duplicate numeric and associative PDO keys; benchmark specialized
      structures before accepting their compatibility and maintenance cost.
    - Collapse filter-map-reindex chains when intermediate arrays dominate memory. Use generators
      or streaming only when every downstream stage also remains bounded; laziness does not repair a
      consumer that collects the whole result again.
    - Rely on copy-on-write for ordinary read-only arguments instead of adding references as a
      speculative optimization. Minimize aliases, return explicit result objects instead of output
      parameters, and `unset` a reference variable immediately after reference iteration.
    - Bound adversarial input before regular expressions and remove ambiguous nested repetition.
      Check regex failure separately from no-match; raising backtracking limits is not a fix for
      catastrophic backtracking.
    - Compile route, container, event, serialization, template, and class discovery metadata during
      build or cache warmup where supported. Account for autoload side effects from `class_exists()`,
      and instantiate delayed attributes in CI so invalid targets do not wait for first traffic.
    - Observe OPcache capacity, cached scripts, wasted memory, hit rate, and restart causes. Do not
      infer health from `opcache.enable` alone, and do not assume JIT improves framework or I/O-bound
      workloads without a representative benchmark.
11. **Tune FPM, OPcache, web server, and containers from evidence.**
    - Bound FPM concurrency by the smallest of memory, CPU/tail-latency, and downstream connection
      budgets. Choose static, dynamic, or ondemand from traffic shape, not container folklore.
    - Set worker recycling from measured memory growth. Observe listen queue, max-children events,
      worker RSS, CPU throttling, DB waits, slow logs, and OOM behavior together.
    - Order database, application, FPM, FastCGI, proxy, and load-balancer timeouts deliberately.
      Know whether post-response work remains subject to termination and cancellation.
    - Keep liveness limited to restart-recoverable process failure; use startup and readiness for
      boot and dependency availability without causing restart storms.
    - Build or warm environment-independent caches before traffic and environment-dependent caches
      only after correct configuration exists. Do not let every replica race migrations or mutate
      a shared cache directory.
    - Treat OPcache preload and immutable-container assumptions as deployment contracts. Reload
      FPM and long-running workers when code or cached containers change.
12. **Apply language and type contracts deliberately.**
    - Enforce `declare(strict_types=1)` across owned source files, not only entrypoints. Remember that
      scalar argument coercion follows the calling file, return coercion follows the defining file,
      and typed-property assignment follows the write site; strict types do not validate domain
      formats, ranges, or decoded input shapes.
    - Keep `mixed` at untrusted or dynamic boundaries and narrow it immediately. Layer precise
      PHPDoc shapes, lists, ranges, callable signatures, generics, conditional returns, and
      assertions over native runtime types rather than replacing native types with comments.
    - Prefer `Closure` plus an analyzed signature for stored callbacks. Preserve generic type
      relationships and collection variance; mutable collections are not automatically covariant.
    - Fix inaccurate types at their source through native declarations, PHPDoc, stubs, generics,
      assertions, or analysis extensions. Do not scatter inline `@var` claims or grow a baseline to
      silence new errors; run the strongest practical rules and make legacy suppressions shrink.
    - For PHP 8.5 upgrades, verify URI interpretation against the actual consumer, pipe only unary
      callables, preserve shallow-clone semantics, and test ignored `#[NoDiscard]` results as
      failures where the return value is contractual. Instantiate delayed attributes during build.
    - Audit migration warnings and deprecations before changing the runtime, including OPcache
      loading assumptions, destructuring non-arrays, lossy numeric casts, legacy casts, backtick
      execution, legacy serialization hooks, null array keys, and changed extension APIs. Keep
      prerelease-only features out of production code unless the project explicitly targets them.
13. **Verify framework-specific behavior.**
    - For Laravel, inspect container and facade use, mass assignment, model events, lazy loading,
      queue model serialization, after-commit dispatch, cache locks, config/route/view caches,
      Octane reset behavior, and worker reload.
    - For Symfony and Doctrine, inspect service scope and reset, kernel subscribers, Messenger
      redelivery, Doctrine hydration and identity map, flush/listener behavior, cache warmup, and
      long-running worker reset.
    - Treat framework cache, ORM, queue, and runtime features as separate version-sensitive tracks.
14. **Verify the real execution model.**
    - Cover static analysis, unit and integration tests, query-count growth, transaction conflict,
      auth/session failure, upload rejection, repeated request/job state reset, FPM/container smoke,
      worker reload, and production cache behavior according to the changed surface.
    - Report missing configured intents rather than running raw servers, migrations, deploys,
      dependency installs, or long-running workers.

<!-- mustflow-section: postconditions -->
## Postconditions

- Runtime, package, container, request state, ORM, transaction, validation, authentication, session,
  filesystem, worker, FPM, cache, and deployment ownership are explicit.
- Code that is safe only because PHP-FPM resets the request is not silently reused in a persistent process.
- Query and performance claims include rows, hydration, concurrency, memory, and tail-latency evidence.
- Security decisions do not depend on loose comparison, client metadata, unsafe serialization,
  cookie expiry, or application-only uniqueness checks.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot intents that cover the changed scope:

- `changes_status`
- `changes_diff_summary`
- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the PHP, framework, ORM, SAPI, or worker track is unclear, preserve existing behavior and
  report the missing evidence.
- If a performance fix only raises workers, memory, timeout, eager loading, or cache TTL without
  proving the bottleneck, keep it out and report the missing measurement.
- If a transaction path includes external side effects, split it behind an outbox or report the
  atomicity gap before claiming safety.
- If long-running reset behavior cannot be verified, keep services stateless and report missing
  repeated-request or repeated-message coverage.

<!-- mustflow-section: output-format -->
## Output Format

- PHP runtime, Composer, framework, ORM, SAPI, and worker tracks
- State, security, data, cache, FPM, container, and deployment owners
- Structural, performance, compatibility, and migration decisions
- Verification evidence and configured intents run
- Skipped checks and remaining PHP, framework, persistence, security, or deployment risk
