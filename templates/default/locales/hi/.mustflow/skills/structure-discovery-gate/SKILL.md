---
mustflow_doc: skill.structure-discovery-gate
locale: hi
canonical: false
revision: 12
lifecycle: mustflow-owned
authority: procedure
name: structure-discovery-gate
description: Apply this skill before introducing new feature structure, folders, file boundaries, routing, data models, or integration boundaries.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.structure-discovery-gate
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Structure Discovery Gate

<!-- mustflow-section: purpose -->
## Purpose

Find hidden structure decisions before coding so new files, folders, names, routing, data models, and integration boundaries reduce future change cost instead of producing a neat but brittle tree.

<!-- mustflow-section: use-when -->
## Use When

- The task asks for a new feature, module, folder layout, architecture, scaffold, refactor, API integration, website, app flow, routing structure, data model, state model, or file split.
- A named technology or service may be only an implementation choice rather than the product domain, such as AdSense, Stripe, Supabase, Firebase, Resend, SendGrid, Google Analytics, Plausible, or a CMS.
- The request may hide costly structural decisions around localization, SEO, authentication, authorization, payments, ads, analytics, admin workflows, deployment, content management, storage, retention, or external service replacement.
- The agent is about to create new top-level folders, shared modules, providers, adapters, services, constants, or public names.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is a tiny mechanical edit with an obvious target file and no new boundary.
- The user explicitly asks for a disposable prototype, spike, or one-off example where future structure is out of scope.
- A structure decision has already been made in current project instructions, accepted design docs, or the immediately preceding user answer.
- The task is only to match an existing local pattern; use `pattern-scout` unless hidden product assumptions may still change the shape.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- User request and intended product or code change.
- Current project instructions, relevant context, and nearby implementation patterns when available.
- Known target platform, language, framework, package, or deployment constraints.
- Any named external services, content sources, user roles, locales, data stores, algorithms, policies, feature flags, or revenue surfaces in the request.
- Risk surfaces that could require a plan/apply gate, capability object, Result or Option return shape, command execution unit, facade entry point, invariant policy, state machine, pure core with an imperative shell, dependency injection boundary, adapter boundary, composition over inheritance, injected clock, state transition table, or idempotency ledger.
- Optional collaborators whose absence might require a null object, disabled implementation, identity implementation, deny-all policy, or explicit failure.
- Relevant command-intent contract entries for later verification.

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available from current context or can be stated as unknown without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Use this skill to shape the plan, questions, assumptions, file boundaries, and the smallest resulting implementation.
- Edit only files needed for the accepted or reasonably assumed structure.
- Do not create broad design documents, policy files, shared folders, provider systems, or abstractions just because they sound tidy.
- Do not treat this skill as permission to delay every task for a long interview; ask only questions that can change the structure.

<!-- mustflow-section: procedure -->
## Procedure

1. Restate the requested change as the product capability or code responsibility, not just the named technology.
2. Identify hidden decisions that could change routing, folder names, file boundaries, data model, state ownership, environment variables, tests, deployment, SEO, localization, external integrations, or legal and policy requirements.
3. Classify each decision:
   - Blocking: the answer can change the basic structure and cannot be safely assumed.
   - Structure-impacting: the answer changes boundaries, but a conservative default can be stated if the user does not answer.
   - Preference: the answer affects styling, wording, or minor details and should not block structure.
4. Ask at most five high-value questions before coding. Prioritize localization, authentication, authorization, payments, ads, personal data, destructive data actions, admin workflows, SEO, content storage, and external service replacement.
5. For any question not asked, state the default assumption briefly. Defaults should keep future changes possible without adding speculative layers.
6. Select structure patterns only when the task's risk shape requires them:
   - Use a plan/apply gate for destructive, bulk, migration, billing, permission, publishing, or external-send operations that need review before execution.
   - Use a capability object when a function should require a specific granted action instead of reading broad user or role state.
   - Use Result and Option values for expected business failures, meaningful absence, not found, invalid input, denied access, stale state, or blocked policy. Use `result-option` before editing that return-shape contract.
   - Use a Null Object only when an optional collaborator can safely implement the same interface with honest neutral behavior and the caller should not branch on presence. Use `null-object-pattern` before editing that optional dependency boundary.
   - Use a command pattern when a state-changing user or system intent needs explicit payload, context, authorization, transaction, idempotency, outbox, audit, retry, concurrency, or queue and worker reuse. Use `command-pattern` before editing that execution unit.
   - Use a facade pattern when controllers, handlers, workers, command handlers, services, or UI events need one stable high-level entry point over a repeated multi-step subsystem workflow. Use `facade-pattern` before editing that entry point.
   - Use invariant policy modules when a state change must preserve non-negotiable rules, such as last-owner, paid-order, refund, or entitlement constraints.
   - Use a state machine when status, state, phase, step, or stage controls allowed events, terminal states, guards, effects, transition history, duplicate-event handling, or concurrency. Use `state-machine-pattern` before editing that lifecycle.
   - Use a strategy pattern when several algorithms, policies, calculations, provider choices, feature-flag variants, or scoring methods share one purpose and should not keep branching inside the stable workflow. Use `strategy-pattern` before editing that strategy family.
   - Use pure core with an imperative shell when business decisions, validation, authorization, pricing, eligibility, state transitions, domain events, or effect descriptions would otherwise be mixed with I/O, clocks, generated identifiers, randomness, environment reads, or framework objects.
   - Use composition over inheritance when behavior varies by multiple dimensions, class inheritance is proposed for implementation reuse, or framework subclasses could stay thin by delegating to explicit collaborators.
   - Use dependency injection when core logic would otherwise construct, import, resolve, or hide databases, SDKs, clocks, random generators, configuration, loggers, framework objects, filesystems, queues, AI clients, payment gateways, or email senders.
   - Use an adapter boundary when external APIs, databases, model responses, webhooks, files, queues, caches, framework objects, or command output cross into internal logic or leave it.
   - Inject time or a time context when expiration, scheduling, retries, leases, or rate windows affect behavior.
   - Use explicit state transitions when three or more states have meaningful allowed moves.
   - Use an action ledger or idempotency key when repeating a side effect would be harmful.
7. Prefer the smallest local version of the selected pattern. Do not add a framework, base class, service locator, global event bus, broad repository layer, or abstract factory when a plain function, table, adapter, or narrow policy object is enough.
8. Separate product domains from vendor implementations. Use broad names at the product boundary and specific names inside provider or adapter internals.
   - Prefer `monetization/ads/providers/adsense` over top-level `adsense`.
   - Prefer `payments/providers/stripe` over top-level `stripe`.
   - Prefer `notifications/email/providers/resend` over top-level `resend`.
   - Prefer `analytics/providers/google-analytics` over top-level `googleAnalytics`.
9. Propose the smallest folder and file structure that follows the answers and assumptions. For each new file or folder, state its responsibility and what it must not contain.
10. Check the structure against local precedent with `pattern-scout` when the repository already has a nearby pattern.
11. If the selected structure changes expected failure, meaningful absence, thrown business errors, null returns, or public error mapping, use `result-option` before editing that scope.
12. If the selected structure creates or repairs a state-changing execution unit, use `command-pattern` before editing that scope.
13. If the selected structure introduces or repairs lifecycle state transitions, use `state-machine-pattern` before editing that scope.
14. If the selected structure introduces interchangeable algorithms, policies, calculations, provider choices, or feature-flag variants, use `strategy-pattern` before editing that scope.
15. If the selected structure introduces one high-level entry point over several subsystem collaborators, use `facade-pattern` before editing that scope.
16. If the selected structure separates business decisions from execution, use `pure-core-imperative-shell` before editing that scope.
17. If the selected structure introduces inheritance, base classes, protected state, or subclass variants, use `composition-over-inheritance` before editing that scope.
18. If the selected structure introduces or repairs an external dependency boundary, use `dependency-injection` for construction and collaborator flow, and `adapter-boundary` for external data, protocol, error, timeout, retry, idempotency, security, and observability handling.
19. Implement only after the questions, assumptions, structure, dependency direction, and verification surface are clear enough for the task size.

<!-- mustflow-section: postconditions -->
## Postconditions

- The final structure follows an explicit set of answers or assumptions.
- Top-level names reflect product responsibilities rather than replaceable vendor names unless the vendor is the product itself.
- New folders and files have clear responsibilities, non-responsibilities, and dependency direction.
- Any skipped question, deferred decision, or intentionally narrow assumption is reported.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_release`
- `mustflow_check`

Also run narrower configured tests or builds required by the changed source, template, documentation, or public contract.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If too many structural unknowns remain, ask only the highest-impact blocking questions and report the assumptions that are unsafe to make.
- If the user does not answer non-blocking questions, proceed with conservative defaults and keep the first implementation small.
- If a vendor name has already leaked into broad public structure, either localize it inside a provider or report why renaming is out of scope.
- If a proposed abstraction has only one known use and no likely replacement pressure, keep it close to the feature instead of moving it to shared code.
- If this skill overlaps with `codebase-orientation`, use orientation to map the existing area first, then return to this skill for the structure decision.

<!-- mustflow-section: output-format -->
## Output Format

- Capability or responsibility being built
- Blocking questions asked, or none
- Structure-impacting assumptions
- Proposed files and responsibilities
- Dependency direction
- Structural patterns selected or intentionally skipped
- Local pattern used or reason no pattern applies
- Command intents run
- Skipped checks and remaining structure risk
