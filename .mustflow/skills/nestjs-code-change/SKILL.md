---
mustflow_doc: skill.nestjs-code-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: nestjs-code-change
description: Apply this skill when NestJS modules, controllers, providers, dependency injection, pipes, guards, interceptors, filters, decorators, OpenAPI metadata, adapters, lifecycle hooks, queues, schedulers, WebSockets, microservices, or Nest-backed HTTP API tests are created, changed, reviewed, or upgraded.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.nestjs-code-change
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - docs_validate_fast
    - mustflow_check
---

# NestJS Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve NestJS module boundaries, dependency-injection ownership, request pipeline order, validation, auth, error, OpenAPI, adapter, lifecycle, and test-module behavior while making focused Nest-backed service or API changes.

<!-- mustflow-section: use-when -->
## Use When

- `@Module`, `@Controller`, route decorators, providers, custom decorators, dependency injection tokens, dynamic modules, global modules, guards, pipes, interceptors, filters, middleware, or Nest testing modules change.
- The task touches REST controllers, GraphQL resolvers, WebSockets, microservices, queues, schedulers, lifecycle hooks, adapters, request-scoped providers, validation pipes, class-transformer/class-validator behavior, OpenAPI metadata, or generated clients.
- The task changes auth, tenant, permission, request id, session, cache, transaction, or outbound integration behavior inside a Nest request path.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes framework-free service code behind a Nest provider and no provider scope, module export, decorator, pipeline, route, or test-module behavior changes; use the relevant language, architecture, data, or security skill.
- The project uses Hono, Elysia, Axum, Express without Nest, Fastify without Nest, or another framework as the route owner.
- The task only updates version prose; use `source-freshness-check` unless the NestJS procedure itself changes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, Nest package versions, TypeScript config, app bootstrap, adapter choice, modules, controllers, providers, decorators, guards, pipes, interceptors, filters, middleware, OpenAPI setup, generated client surfaces, and tests.
- Route ledger: method, path, controller prefix, versioning, params, query, headers, cookies, body DTO, validation pipe behavior, auth boundary, response statuses, content types, and public error envelope.
- Dependency ledger: module imports, provider tokens, exports, scopes, dynamic module options, global modules, circular dependencies, async factories, config sources, request scope, and lifecycle hooks.
- Existing verification intents for typecheck, build, controller tests, provider tests, e2e HTTP tests, OpenAPI generation, and mustflow validation.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read package metadata, bootstrap, affected modules, controllers, providers, DTOs, decorators, pipeline components, OpenAPI setup, and tests before editing.
- Identify whether Express or Fastify is the active Nest adapter before using adapter-specific APIs.
- Identify global pipes, guards, interceptors, filters, middleware, versioning, CORS, prefix, and OpenAPI setup before changing route behavior.
- Refresh official or repository-local evidence before preserving exact latest-version, migration, or release-specific claims.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep Nest framework concerns at module, controller, provider, decorator, and pipeline boundaries.
- Keep framework-free business logic in services where possible, but do not erase provider tokens, scopes, or module ownership needed by DI.
- Update DTOs, validation pipes, guards, interceptors, filters, OpenAPI metadata, tests, and docs examples when public API behavior changes.
- Do not hide dependencies in global modules, static singletons, module-level mutable state, or `forwardRef()` unless the cycle is explicit and reported.
- Do not bypass configured command intents or run unconfigured Nest servers, watchers, migrations, or generators.

<!-- mustflow-section: procedure -->
## Procedure

1. Read bootstrap, app module, affected feature modules, controllers, providers, DTOs, guards, pipes, interceptors, filters, middleware, OpenAPI setup, and tests.
2. Build a module ledger: imports, providers, exports, dynamic module options, global modules, async factories, provider tokens, scopes, lifecycle hooks, and any circular dependencies.
3. Build a route ledger: controller prefix, method, path, version, params, query, headers, cookies, body DTO, validation pipe, auth and permission guards, interceptors, filters, response status, content type, and public client surface.
4. Keep dependency injection explicit. Prefer constructor injection with stable tokens, avoid service locators, and avoid importing concrete infrastructure providers into unrelated feature modules.
5. Treat provider scope as a performance and correctness contract. Use singleton scope by default, request scope only when request-local data truly belongs in DI, and transient scope only when every construction cost and state boundary is intentional.
6. Avoid `forwardRef()` as a casual cycle fix. If a cycle appears, inspect the module boundary, extract a port/interface, move shared policy, or report why the explicit cycle is accepted.
7. Check dynamic modules and async factories. Keep options typed, validate config at the boundary, avoid reading secrets into logs or reports, and make module initialization failure explicit.
8. Keep request-local data out of singleton provider mutable fields. Current user, tenant, request id, locale, transaction, or per-request cache should travel through request objects, guards, interceptors, CLS-style infrastructure with clear ownership, or explicit method arguments.
9. Review pipeline order:
   - middleware runs before guards;
   - guards decide access before interceptors and pipes complete the handler path;
   - pipes transform and validate inputs;
   - interceptors wrap handler execution and response mapping;
   - filters map thrown exceptions.
10. Do not treat CORS, Swagger hiding, or route omission from OpenAPI as authorization. Add real guards or report the exposure.
11. For DTOs, distinguish TypeScript shape from runtime validation. Class decorators, global `ValidationPipe` options, transform behavior, whitelist, forbid settings, nested validation, arrays, dates, enums, partial update DTOs, and file uploads must be checked against real runtime behavior.
12. For params, query, headers, and cookies, remember that HTTP input starts as strings. Use explicit parse pipes, DTO transform rules, or schema validation rather than relying on TypeScript annotations.
13. Keep response and error envelopes consistent. Map validation, auth, permission, not-found, conflict, rate-limit, upstream, timeout, and internal failures deliberately; do not leak stack traces, SQL, tokens, or provider details.
14. Review adapter-specific behavior. Express and Fastify differ in reply objects, middleware plugins, body parsing, cookies, streaming, multipart handling, and lifecycle hooks; isolate adapter-specific APIs.
15. Review OpenAPI and generated clients as separate public contracts. Ensure decorators, DTO metadata, mapped types, unions, file uploads, auth schemes, versioning, and hidden routes match the actual runtime route.
16. For GraphQL, WebSockets, queues, schedulers, and microservices, map the transport boundary, serialization, auth context, retry/ack semantics, idempotency, cancellation, and lifecycle shutdown behavior before editing.
17. For transactions, caches, queues, and outbound calls inside providers, apply the narrower data, transaction, performance, or third-party integration skill when those invariants change.
18. Keep test modules honest. Override only the provider under test, preserve guards/pipes/interceptors when testing route behavior, and avoid mocks that remove the behavior being changed.
19. Choose configured verification intents that cover type checking, build, controller/provider tests, validation failure, auth failure, OpenAPI output, and e2e adapter behavior when available.

<!-- mustflow-section: postconditions -->
## Postconditions

- Module imports, provider tokens, exports, scopes, and lifecycle hooks remain intentional.
- Route, validation, auth, interceptor, filter, response, adapter, OpenAPI, and generated-client behavior are synchronized.
- Request-local state is not hidden in singleton mutable fields.
- Any missing route-level, OpenAPI, adapter, lifecycle, queue, WebSocket, microservice, or e2e verification is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing Nest controller, provider, pipeline, OpenAPI, adapter, e2e, queue, WebSocket, microservice, or lifecycle verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If DI fails, inspect provider token registration, module imports and exports, dynamic module setup, circular dependencies, and test module overrides before adding globals or broad imports.
- If validation behaves unexpectedly, inspect global `ValidationPipe` options, DTO decorators, nested types, transform settings, and whether the route is using a raw body or file upload path.
- If auth or permission behavior is unclear, stop that route change and inspect guards, decorators, metadata readers, and route-level overrides before broadening access.
- If OpenAPI looks right but runtime behavior differs, make runtime behavior the source of truth and fix or report the documentation/client drift.
- If adapter-specific behavior cannot be covered by configured checks, report the skipped Express or Fastify smoke coverage.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Module, provider, DI token, scope, and lifecycle notes
- Route, DTO, validation, guard, interceptor, filter, and response notes
- Adapter, OpenAPI, generated client, GraphQL, WebSocket, queue, scheduler, or microservice notes when touched
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining NestJS risk
