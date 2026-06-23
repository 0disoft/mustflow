---
mustflow_doc: skill.elysia-code-change
locale: en
canonical: true
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: elysia-code-change
description: Apply this skill when Elysia routes, schemas, plugins, decorators, derives, resolves, guards, auth, error handling, OpenAPI output, Eden clients, or Bun server behavior are created or changed.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.elysia-code-change
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

# Elysia Code Change

<!-- mustflow-section: purpose -->
## Purpose

Preserve Elysia schema-first runtime validation, type inference, plugin, auth, error, OpenAPI, Eden, and Bun runtime boundaries.

<!-- mustflow-section: use-when -->
## Use When

- `new Elysia`, route methods, `t.Object`, request or response schemas, `.use`, `.guard`, `.derive`, `.resolve`, `.decorate`, `.onError`, auth middleware, OpenAPI, Eden, or Bun server tests change.
- The task adds API routes, plugins, validators, error envelopes, authentication, or generated client contracts.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only edits framework-free service functions called by Elysia routes; use the relevant language or architecture skill.
- Another web framework owns the route surface.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Package metadata, Bun lockfile if present, TypeScript config, server entrypoint, route modules, plugin modules, schema/model files, auth/session files, error handling, OpenAPI config, Eden client exports, and tests.
- Existing response envelope, status-code contract, and strict TypeScript policy.

<!-- mustflow-section: preconditions -->
## Preconditions

- Identify whether schema is the source of truth for runtime validation and type inference.
- Inventory method, path, params, query, headers, cookies, body, response statuses, auth, and plugin/decorator dependencies.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Define request and response schemas with the route.
- Keep framework context at the route boundary and move only framework-free business logic into services.
- Preserve plugin, decorator, derive, resolve, and store inference through Elysia chaining.
- Use `.derive` only for intentional pre-validation context shaping. Use `.resolve` by default for auth, session, user, tenant, permission, or other request-derived values that depend on validated headers, body, query, or params.
- Keep OpenAPI and Eden clients aligned with route schemas when present.

<!-- mustflow-section: procedure -->
## Procedure

1. Read server entry, routes, plugins, schemas, auth, error handling, OpenAPI, Eden exports, and tests.
2. Build a route inventory for the changed surface.
3. Add or update schemas for every external input and meaningful response status.
4. Do not annotate handlers with broad `any`, duplicated manual interfaces, or imported `Context` types that erase inference.
5. Keep request-specific state out of module-level mutable globals.
6. For request-derived context, choose the lifecycle hook by validation dependency:
   - use `.derive` only when transforming raw request context before validation is intentional;
   - use `.guard()` to apply schema and auth-related validation around a route group;
   - use `.resolve()` inside the validated chain for user, session, tenant, permission, or other values that depend on validated input;
   - check the order between `.resolve()` and `beforeHandle` before relying on a value in an auth or permission hook.
7. Centralize expected error envelope and auth failure behavior.
8. If OpenAPI or Eden is used, confirm the generated contract follows the schema change.
9. Choose configured verification intents that cover types, server boot, route happy path, validation failure, auth failure, OpenAPI, and Eden inference when available.

<!-- mustflow-section: postconditions -->
## Postconditions

- Schemas, runtime validation, and inferred types remain one contract.
- Error and auth responses are consistent.
- OpenAPI and Eden impact is known.
- No route relies on unvalidated input, pre-validation auth context, or erased context types.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `lint`
- `build`
- `test_related`
- `test`
- `docs_validate_fast`
- `mustflow_check`

Report missing route, OpenAPI, or Eden verification intents when relevant.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If schema and manual types diverge, make schema the source of truth or report the competing contract.
- If plugin inference breaks after extraction, return context-sensitive code to the Elysia chain or narrow the extraction.
- If auth or session state is derived before validation through `.derive`, move it to a validated `.guard()` plus `.resolve()` chain or report the validation-order risk.
- If auth behavior is unclear, stop the route change and inspect or request the auth contract.

<!-- mustflow-section: output-format -->
## Output Format

- Boundary checked
- Schema and type inference notes
- Auth, error, OpenAPI, or Eden impact
- Files changed
- Command intents run
- Skipped checks and reasons
- Remaining Elysia risk
