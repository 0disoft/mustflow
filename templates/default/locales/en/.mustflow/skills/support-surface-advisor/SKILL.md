---
mustflow_doc: skill.support-surface-advisor
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: support-surface-advisor
description: Apply this skill when designing, scoping, implementing, or reviewing an app, service, CLI, API, SDK, library, desktop app, automation tool, or developer tool and the agent must decide which user, developer, operator, automation, integration, recovery, upgrade, documentation, or observability surfaces to expose, defer, or explicitly not support.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.support-surface-advisor
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Support Surface Advisor

<!-- mustflow-section: purpose -->
## Purpose

Help agents turn vague product or program-development requests into a bounded support contract. A support surface is not just a feature; once exposed, it becomes a compatibility, documentation, testing, and maintenance promise.

<!-- mustflow-section: use-when -->
## Use When

- A user asks to build, scope, review, or evolve an app, service, CLI, API, SDK, library, desktop app, automation tool, or developer tool.
- It is unclear whether the product should expose UI, CLI, programming API, network API, webhooks, plugins, configuration, import/export, docs, logs, diagnostics, test support, recovery, performance limits, security/privacy, accessibility/i18n, or deployment/upgrade support.
- The user may be a solo founder, inexperienced developer, or product owner who knows the core idea but not the support routes real users will need.
- Multiple shells could reach the same core behavior, such as UI plus CLI, CLI plus API, or UI plus webhook automation.
- A support route might accidentally become a public API, stable file format, integration promise, operational runbook, or backward-compatibility burden.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a tiny local bug fix with no product, integration, operation, or public-contract decision.
- The user has already selected the support surfaces and only asks for implementation inside one route.
- A narrower API, CLI output, UI, security, data, or release skill already owns the specific changed contract.
- The work is only visual polish, copy editing, or one-off internal tooling with no exposed support promise.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Product stage: prototype, personal tool, team-internal tool, public SaaS, developer tool, library, CLI, desktop app, or another explicit stage.
- Primary actors: end users, developers, operators, automation systems, support staff, admins, or third-party services.
- Main usage path and the job it completes.
- Integration need: scripts, CI, external services, webhooks, plugins, SDK calls, imports, exports, or manual-only use.
- Public-contract willingness: which routes the user is ready to document, test, keep compatible, deprecate carefully, and support operationally.
- Explicit non-goals: routes not supported now and routes kept internal-only.
- Failure, recovery, upgrade, data movement, observability, security, privacy, accessibility, and localization expectations.
- Current repository evidence, existing product docs, command contracts, APIs, or public examples when working in an existing codebase.

<!-- mustflow-section: preconditions -->
## Preconditions

- Treat every exposed support route as a maintenance contract, not as a free feature checkbox.
- Do not ask for or recommend all support surfaces by default.
- Distinguish what is supported now, deferred, explicitly not supported, and internal-only.
- Keep command execution governed by `.mustflow/config/commands.toml`; this skill names intent concepts but does not authorize raw commands.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Ask focused scoping questions and propose a support-surface plan.
- Update product docs, implementation notes, tests, route metadata, or code boundaries directly tied to the selected support surfaces.
- Add only the selected surfaces and their tests/docs/contracts when the user asks for implementation.
- Do not create duplicate business logic in UI, CLI, API, SDK, webhook, or plugin shells.
- Do not expose internal functions, schemas, logs, error messages, settings, or file formats as public contracts by accident.
- Do not put internal implementation explanations in user-facing UI copy.

<!-- mustflow-section: procedure -->
## Procedure

1. Classify the product stage and primary actors first. Do not recommend surfaces until you know who must use, integrate, operate, or recover the product.
2. Identify the primary path. Pick the one route users should use first, such as UI for non-technical users, CLI for developer automation, SDK for library consumers, or network API for cross-service integration.
3. Define the core engine boundary before adding shells.
   - The core engine owns domain workflow, validation, state transitions, permissions, errors, data movement, and side-effect policy.
   - UI, CLI, API, SDK, webhook, and plugin shells should translate inputs and outputs, call the core, and present results.
   - UI, CLI, and API shells must not reimplement the same core rules separately.
4. Ask only blocking questions. Prefer at most three at a time, with a recommended default when evidence supports it:
   - Who will use this first: general users, developers, operators, admins, automation, or other services?
   - What is the main route for the core job right now: UI, CLI, programming API/SDK, network API, or another route?
   - Do scripts, CI, webhooks, imports, exports, or other services need integration in the next milestone?
   - Which routes are you willing to keep stable, document, test, and migrate later?
   - Which routes should be explicitly unsupported for now?
   - What failure, recovery, upgrade, data movement, logging, privacy, and accessibility level is needed for the first real users?
5. Use the support surface list as a risk prompt, not a checklist to fill:
   - UI, CLI, programming API/SDK, network API, webhook/events, plugin/extension, configuration, auth/permissions, import/export, version/backcompat, deprecation/migration, docs/examples, errors/diagnostics, logs/observability, test support, failure recovery, performance/resource limits, security/privacy, accessibility/i18n, deployment/upgrade/recovery.
6. Classify each relevant surface:
   - `support_now`: a named actor needs it in the next milestone, the team can maintain it, the contract can be tested, and failure behavior is understood.
   - `defer`: plausible later value exists, but there is no near-term user, integration, or operational capacity.
   - `explicitly_not_supported`: exposing it would imply stable API, schema, data, security, operational, or compatibility promises the product is not ready to carry.
   - `internal_only`: useful behind the scenes but not documented, not stable, and not safe for external reliance.
7. Apply stage heuristics:
   - Prototype or personal tool: one primary path, basic configuration, clear errors, a simple export or backup when data matters, and no SDK/webhooks/plugins unless they are the product.
   - Team-internal tool: UI or CLI, role or environment boundaries, logs, import/export when data moves, upgrade notes, and enough docs for handoff.
   - Public SaaS: UI, auth/permissions, security/privacy, diagnostics, recovery, observability, deployment/upgrade behavior, and docs; API/webhooks only when customers truly integrate.
   - Developer tool or CLI: non-interactive execution, help text, exit codes, machine-readable output when scripts need it, configuration precedence, errors, docs, dry-run or test fixtures when side effects matter.
   - Library or SDK: a narrow public API, typed errors, cancellation/resource cleanup where relevant, version/backcompat rules, examples, tests, and deprecation policy; no UI or network API unless that is the product.
   - Desktop app: UI, settings, import/export or backup, upgrade/rollback expectations, crash diagnostics, accessibility/i18n baseline, and CLI/API only when automation is a real user need.
8. Recommend a surface only when it has a real actor, near-term workflow, maintenance owner, compatibility story, and verification path.
9. Explicitly defer or reject surfaces that duplicate the primary path, create a second core implementation, require unsupported operations capacity, or would lock internal data formats too early.
10. For user-facing UI text, write natural product language. Do not leak implementation notes such as "this component handles..." or "this feature processes..." into visible copy.
11. If implementation follows, activate the narrower skill for each selected surface before changing that surface, such as API contract, CLI output, UI quality, security/privacy, data migration, docs, or tests.

<!-- mustflow-section: postconditions -->
## Postconditions

- The recommended support surfaces are tied to actors, workflows, and maintenance capacity.
- Deferred and explicitly unsupported surfaces are named instead of left as vague future work.
- The core engine versus shell boundary prevents duplicated business logic across UI, CLI, API, SDK, webhook, and plugin routes.
- Compatibility, docs, tests, failure, recovery, security, privacy, observability, accessibility, and upgrade risks are visible for every selected public route.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

When implementation changes code, schemas, templates, package metadata, or tests, also use the narrower configured intent named by the matching implementation skill.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the user cannot name users or a primary path, stop at questions and recommend the smallest reversible default.
- If a desired route implies an unsupported public contract, mark it `defer` or `explicitly_not_supported` and explain the contract cost.
- If UI, CLI, API, SDK, webhook, or plugin paths start duplicating core rules, move the rule decision to the core engine boundary before continuing.
- If implementation requires a support surface whose verification intent is missing, report the missing verification instead of claiming readiness.
- If the scope expands into every support route, reduce it to one primary route plus the minimum safety surfaces needed for the next real users.

<!-- mustflow-section: output-format -->
## Output Format

- Product stage and primary actors
- Recommended support surfaces
- Deferred support surfaces
- Explicitly unsupported or internal-only surfaces
- Immediate questions and recommended defaults
- Maintenance contract and compatibility risks
- Core engine versus shell boundary
- Staged adoption plan
- Follow-up skills needed for implementation
- Command intents run
- Skipped checks and reasons
- Remaining support-surface risk
