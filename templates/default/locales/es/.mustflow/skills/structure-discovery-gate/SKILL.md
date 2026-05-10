---
mustflow_doc: skill.structure-discovery-gate
locale: es
canonical: false
revision: 1
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
- Any named external services, content sources, user roles, locales, data stores, or revenue surfaces in the request.
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
6. Separate product domains from vendor implementations. Use broad names at the product boundary and specific names inside provider or adapter internals.
   - Prefer `monetization/ads/providers/adsense` over top-level `adsense`.
   - Prefer `payments/providers/stripe` over top-level `stripe`.
   - Prefer `notifications/email/providers/resend` over top-level `resend`.
   - Prefer `analytics/providers/google-analytics` over top-level `googleAnalytics`.
7. Propose the smallest folder and file structure that follows the answers and assumptions. For each new file or folder, state its responsibility and what it must not contain.
8. Check the structure against local precedent with `pattern-scout` when the repository already has a nearby pattern.
9. Implement only after the questions, assumptions, structure, dependency direction, and verification surface are clear enough for the task size.

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
- Local pattern used or reason no pattern applies
- Command intents run
- Skipped checks and remaining structure risk
