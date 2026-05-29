---
mustflow_doc: skill.config-env-change
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: config-env-change
description: Apply this skill when environment variables, config keys, secrets, public env prefixes, build-time or runtime config, config schemas or parsers, feature flags, deployment variables, CI secrets, Docker or Compose env, Kubernetes ConfigMaps or Secrets, Cloudflare bindings, Vite, Next.js, Astro, SvelteKit, Tauri, Node, Bun, generated env types, .env examples, config docs, or config validation behavior are created, changed, reviewed, or reported.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.config-env-change
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

# Config Env Change

<!-- mustflow-section: purpose -->
## Purpose

Keep configuration and environment changes from leaking secrets, freezing runtime values at build time, or drifting across local, CI, and deployment surfaces.

A config or env change is not just adding a key. It is deciding who can see the value, when the value is fixed, where the value is validated, how errors are redacted, and which deployment surfaces must change together.

<!-- mustflow-section: use-when -->
## Use When

- A task adds, removes, renames, defaults, validates, documents, or reports an env var, secret, config key, feature flag, runtime setting, build define, platform binding, or deploy variable.
- Code reads from `process.env`, `import.meta.env`, `Bun.env`, framework env helpers, worker bindings, CI variables, Docker env, Kubernetes env, platform env stores, mobile or desktop packaged config, or app updater config.
- A change touches `.env.example`, `.env.template`, `.env.test`, `.dev.vars.example`, config schemas, config parsers, generated env types, deployment docs, CI workflow env, Docker Compose env, Kubernetes ConfigMap or Secret, Terraform or Pulumi env wiring, or hosting provider config.
- A final report claims a config key is public, private, runtime, build-time, optional, required, secret, safe to expose, changed without rebuild, or controlled by a feature flag.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only changes product behavior behind an existing config value and the config contract is untouched.
- The task only edits command-intent environment policy in `.mustflow/config/commands.toml`. Use `command-contract-authoring` for that primary scope.
- The task only reviews a broad sensitive-data change without config or env surfaces. Use `security-privacy-review`.
- The task only changes release publication variables for a remote registry or channel. Use `release-publish-change` for that primary scope and this skill only if env behavior itself changes.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Key name, value meaning, sensitivity, visibility, timing, required environments, owner, default, validation shape, and removal or deprecation plan if replacing another key.
- Read-first surfaces: env examples, config schema or parser, runtime config loader, framework env conventions, CI variables or secrets, Docker or Compose config, Kubernetes or cloud config, typed env helpers, deployment docs, and tests.
- Platform timing: build-time, startup runtime, request runtime, command runtime, tenant runtime, packaged-app time, or provider-evaluated feature flag.
- Visibility boundary: server-only, client bundle, static asset, sourcemap, mobile app, desktop app, container image, CI log, cloud dashboard, telemetry, or user-visible docs.
- Verification options from the command contract for config validation, build, tests, docs, package or template release, and secret redaction checks.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Higher-priority instructions and the command contract have been checked for the current scope.
- The config source of truth is identified before editing. If several files define the same key differently, resolve authority before adding another copy.
- Real secrets are not read, printed, copied, committed, or requested unless the user explicitly authorizes a secret-handling task and the active rules allow it.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Update config schemas, parser code, runtime loader wiring, generated type expectations, example env files with fake values, deployment docs, tests, CI or deployment variable names, and feature-flag defaults directly required by the config change.
- Add redacted validation errors that name the key and expected shape without printing the value.
- Add migration aliases, deprecation warnings, or removal notes when replacing keys.
- Do not commit real `.env` files, private keys, tokens, service account JSON, production connection strings, or secret values.
- Do not add unchecked raw env reads outside the central parser unless the repository already has a narrower pattern and the exception is documented.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the value before editing:
   - Sensitivity: public config, private server secret, credential, internal topology, business rule, user-specific setting, or feature flag.
   - Visibility: server-only, client bundle, static output, packaged mobile or desktop app, container image, CI log, telemetry, or docs.
   - Timing: build-time, startup runtime, request runtime, command runtime, tenant runtime, packaged-app time, or feature-flag provider runtime.
   - Mutation action after value change: no action, process restart, pod rollout, container redeploy, static rebuild, app rebuild, store release, or flag flip.
2. Read existing env and config surfaces before adding a key.
   - Env examples and test env files.
   - Config schema or parser.
   - Runtime loader and central config object.
   - Framework env helpers and bundler defines.
   - CI, Docker, Compose, Kubernetes, cloud platform, and hosting provider wiring.
   - Generated env types and docs.
   - Tests for missing, malformed, defaulted, successful, and redacted behavior.
3. Treat public prefixes as exposure markers, not security.
   - `VITE_`, `NEXT_PUBLIC_`, `PUBLIC_`, client env, frontend build defines, static JSON, mobile resources, and desktop app resources are public or effectively public.
   - Do not put secrets, privileged internal URLs, signing keys, service credentials, tenant maps, entitlement gates, pricing gates, webhook secrets, or admin tokens in public or packaged surfaces.
4. Separate build-time from runtime.
   - Values inlined into frontend bundles, static builds, package resources, or build defines usually require rebuild and redeploy to change.
   - Runtime values read from server process env, worker bindings, platform secrets, mounted secret volumes, or provider flags may still require restart, pod rollout, or deployment depending on platform.
   - Do not promise that changing an env var will affect already built client JavaScript, static HTML, mobile apps, desktop apps, or container image defaults.
5. Validate through the central parser.
   - Parse booleans explicitly. The string `false` must not become truthy behavior.
   - Validate numbers with ranges, URLs with protocol and host expectations, paths with safe path rules, enums with allowlists, and secrets with presence and format checks only.
   - Keep validation errors redacted. Show key name and expected shape, not actual value.
6. Update every dependent surface for a new key.
   - Schema validation, runtime loader, type definitions, safe defaults, fake-value env examples, local setup docs, deploy docs, tests, CI variables or secrets, Docker or Compose, Kubernetes or cloud config, observability redaction, and rollback or restart notes.
   - If a surface is not updated because it is outside scope, report it as deferred with risk.
7. Handle framework-specific env boundaries conservatively.
   - Vite and Next public prefixes are client bundle exposure.
   - SvelteKit static env helpers are build-time; dynamic helpers are runtime.
   - Astro env should distinguish client or server and public or secret schema.
   - Cloudflare Worker secrets and bindings arrive through runtime `env`; plaintext vars are not secret storage.
   - Docker `ARG` and baked `ENV` are not secret storage.
   - Compose interpolation env is not the same as container env.
   - Kubernetes env vars are captured at pod start; mounted config may update differently.
   - Tauri, mobile, and desktop packaged config should be treated as public because users can inspect app artifacts.
8. Treat feature flags as contracts.
   - The default value is real product behavior when the provider is down, cache is empty, or local dev is offline.
   - Kill switches should be runtime-controllable unless the runbook explicitly accepts rebuild delay.
   - Rollouts should use stable user, tenant, org, or device keys, not per-request randomness.
   - Sensitive authorization must use server evaluation as source of truth.
   - New flags need owner, expiry or cleanup issue, default, provider-down behavior, and client/server divergence tests when relevant.
9. Detect config drift.
   - Schema key missing from examples.
   - Deploy key missing from schema.
   - Secret-looking key with public prefix.
   - Runtime docs for a build-time value.
   - Staging missing keys required in production.
   - Tests depending on private `.env.local`.
   - Compose `.env` used for interpolation but not passed into the container.
   - Kubernetes env var changed with no rollout note.
   - Worker binding only present in production.
   - Mobile or desktop package containing privileged credentials.
10. Keep fallbacks safe.
   - Local and test defaults must not silently connect to production services.
   - Optional integrations may validate lazily, but must fail clearly at first use.
   - Core values such as database, auth, session, encryption, signing, queue, and required external APIs should fail fast at startup or command start.
11. Select verification from configured command intents. Prefer config validation, build, typecheck, related tests, docs validation, release/package checks, and secret-redaction checks when exposed by the command contract. Do not infer raw package manager, cloud, Docker, Kubernetes, or CI commands.

<!-- mustflow-section: postconditions -->
## Postconditions

- Each changed key has sensitivity, visibility, timing, validation, default, owner, required environments, and change-action classification.
- Schema, loader, examples, docs, generated types, tests, CI/deploy surfaces, and redaction behavior are synchronized or explicitly deferred.
- Public prefixes and packaged app surfaces contain no secrets.
- Build-time and runtime behavior are described accurately.
- Feature flag defaults and provider-down behavior are classified when flags are involved.

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

Prefer narrower configured config-schema, env-validation, type-generation, deployment-doc, release-template, and secret-redaction intents when the command contract exposes them.

Do not infer commands from package manager files, Docker files, cloud config, framework config, or CI workflow names. Report missing command-intent coverage instead.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a value might be secret and the visibility is unclear, classify it private until proven public.
- If build-time or runtime timing is unclear, do not promise hot config changes. Report the rebuild, restart, redeploy, rollout, or release uncertainty.
- If schema, example, docs, tests, and deploy surfaces disagree, fix the source of truth first and report any deferred surface.
- If validation would print a value, redact it before continuing.
- If a feature flag default is unknown, do not claim provider-down behavior is safe.
- If a real secret appears in tracked files, stop ordinary work and report the secret exposure according to repository security rules.

<!-- mustflow-section: output-format -->
## Output Format

- Keys or flags changed
- Sensitivity, visibility, timing, and required action after value change
- Source of truth and synchronized surfaces
- Public/private boundary and redaction notes
- Build-time versus runtime classification
- Feature flag default and provider-down behavior when relevant
- Command intents run
- Skipped checks and reasons
- Remaining config/env risk
