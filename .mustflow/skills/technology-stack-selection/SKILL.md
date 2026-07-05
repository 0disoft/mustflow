---
mustflow_doc: skill.technology-stack-selection
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: technology-stack-selection
description: Apply this skill when choosing, adding, replacing, upgrading, rejecting, or standardizing a technology stack, framework, runtime, database, cache, queue, auth provider, payment provider, AI provider, SDK, hosting platform, deployment tool, build tool, ORM, observability tool, or vendor integration, especially when the decision affects migration path, rollback path, ecosystem maturity, maintainer risk, debugging surface, lock-in, CI/CD cost, deployment cost, operating toil, or solo-maintainer survivability.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.technology-stack-selection
  command_intents:
    - changes_status
    - changes_diff_summary
    - docs_validate_fast
    - test_related
    - test_release
    - mustflow_check
---

# Technology Stack Selection

<!-- mustflow-section: purpose -->
## Purpose

Choose technology by whether the project can operate, debug, deploy, upgrade, pay for, and
replace it for the full expected life of the product.

This skill prevents agents from accepting technology because it is fashionable, fast in a
benchmark, convenient for a demo, popular in another company's architecture, or attractive to the
developer. For indie, solo, and small-team projects, the core question is whether the stack can
keep earning value while the maintainer is tired, busy, away from the codebase, or handling an
incident without a dedicated platform team.

Treat survival-path decisions as failure-survivability decisions, not feature-implementation
decisions.

<!-- mustflow-section: use-when -->
## Use When

- A task chooses, compares, adopts, replaces, upgrades, rejects, or standardizes a technology,
  framework, runtime, database, queue, cache, auth provider, payment provider, AI provider, SDK,
  hosting platform, deployment tool, build tool, ORM, observability tool, package ecosystem, or
  vendor integration.
- A technology is proposed for authentication, authorization, billing, payment, durable data,
  permissions, deployment, backup, restore, queueing, file storage, customer money, customer data,
  security, or another survival path.
- The decision depends on migration path, rollback path, local reproducibility, CI/CD cost,
  deployment cost, operating toil, observability cost, backup and restore cost, maintainer capacity,
  hiring availability, lock-in, data export, ecosystem maturity, or debugging surface.
- A new or experimental technology may belong in a differentiating edge feature, internal tool,
  read-only path, derived-data path, analytics surface, search layer, recommendation layer, AI
  layer, or feature-flagged experiment.
- A stack choice is being justified for solo, indie, small-team, funded-startup, open-source,
  library, or enterprise contexts where the same technology can be appropriate in one context and
  dangerous in another.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only edits code within an already selected technology and no new dependency, runtime,
  vendor, data contract, deployment path, or operational surface is being chosen. Use the matching
  implementation skill.
- The task only checks whether a dependency exists, is declared, or is safe to import. Use
  `dependency-reality-check`.
- The task only chooses a primary language, runtime, compile target, or execution environment. Use
  `runtime-target-selection` first, then this skill only for broader stack and operations tradeoffs.
- A user or repository owner has already mandated the technology. In that case, use this skill only
  to document constraints, guardrails, migration, rollback, observability, and verification.
- The task asks for an unconstrained brainstorming list with no adoption decision. Use
  `idea-triage` or `complex-decision-analysis` when those narrower conditions match.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Decision scope: affected product surface, repository, packages, services, data, deployment,
  users, operators, and time horizon.
- Candidate technologies: name, intended role, version range when relevant, adoption type, and
  whether the candidate is a new stack, replacement, upgrade, or vendor migration.
- Baseline and boring default: current choice, no-change option, most conventional low-risk option,
  current pain, current costs, known failure modes, and existing team knowledge.
- Criticality: `experiment`, `internal_tool`, `customer_facing`, `production_core`, or
  `irreversible_core`.
- Reversibility class: `code_only`, `config`, `build_pipeline`, `runtime_dependency`,
  `persistent_data`, `public_api`, `customer_workflow`, `vendor_contract`, `security_boundary`, or
  `money_or_permission`.
- Team and maintainer capacity: solo, indie, small team, funded startup, enterprise, open-source
  maintainer count, on-call owner, runbook owner, training cost, and hiring or support availability.
- Evidence: repository patterns, official docs, changelogs, migration guides, security advisories,
  issue trackers, production incidents, prototypes, CI results, command receipts, pricing pages, and
  support or SLA evidence when available.
- Success and failure criteria: what must improve, what must not regress, what would stop the
  adoption, and what evidence would reverse the recommendation.

<!-- mustflow-section: preconditions -->
## Preconditions

- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the
  current scope.
- External AI output, blog posts, vendor marketing, popularity signals, benchmark claims, and
  famous-company usage are evidence candidates only, not authority.
- Current external facts such as versions, prices, license terms, platform limits, and release
  status are refreshed through an authorized source path or marked as unverified when they affect
  the decision.
- The status quo and a boring default are included unless the user explicitly fixed the option set.
- A narrower implementation skill will be selected before editing implementation files.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Create or update technology decision records, architecture notes, migration plans, rollback
  plans, runbook notes, route metadata, skill procedures, template metadata, tests, and docs that
  directly support the stack decision.
- Add only the smallest reversible implementation scaffold when the user requests implementation
  and the decision has passed this skill's gates.
- Do not install dependencies, run package managers, start services, run benchmarks, perform
  migrations, deploy, open vendor dashboards, or change cloud resources unless the repository
  command contract and user request explicitly allow that action.
- Do not let a score total, popularity, benchmark, developer experience, or novelty override a hard
  rejection gate.

<!-- mustflow-section: core-definitions -->
## Core Definitions

`survival_path` means a path where failure can block accounts, money, permissions, durable data,
deployment, backup, recovery, customer trust, or the maintainer's ability to keep the product alive.
Typical surfaces include auth, authorization, payment, billing, database, deployment, backup,
restore, queues, file storage, secrets, customer money, customer data, and operational recovery.

`migration_path` means a staged move from the baseline to the candidate while keeping the product or
workflow usable. It covers code, data, configuration, deployment, tests, cutover, ownership, and the
middle state. A big-bang rewrite is not a migration path.

`rollback_path` means a rehearsable return to the previous stable state or a safe degraded state. It
covers data compatibility, schema compatibility, feature flags, routing, backups, cutover timing,
customer impact, and the point after which rollback becomes unsafe. Backup alone is not rollback.

`ecosystem_maturity` means the candidate and its surrounding tools can survive ordinary production
use: docs, changelogs, migration guides, security response, integrations, testing tools, debugging
tools, production failure knowledge, release cadence, and available operators.

`maintainer_risk` means the risk that the candidate becomes abandoned, unsupported, vendor-captured,
relicensed, incompatibly changed, underfunded, or dependent on too few people.

`debugging_surface` means the layers and opaque states a maintainer must inspect during failure:
generated code, runtime magic, plugins, hidden cache, async queues, network boundaries, vendor
dashboards, local reproducibility, logs, traces, metrics, error codes, and request correlation.

<!-- mustflow-section: hard-rejection-criteria -->
## Hard Rejection Criteria

Reject a candidate for `production_core` or `irreversible_core` when any condition is true:

- No staged migration path exists.
- The only migration path is a big-bang rewrite.
- Rollback depends on luck, manual data surgery, unbounded downtime, or customer-visible data loss.
- The candidate writes persistent data, events, files, auth state, money records, permission
  records, cache keys, or public API contracts that the previous system cannot read or safely ignore.
- The candidate is beta, experimental, preview-only, unstable, deprecated, or vendor-opaque for a
  customer-facing or core surface.
- Maintainer risk concentrates on one person, one abandoned project, one unfunded package, or one
  vendor-controlled API without an adapter, fork, export, or replacement plan.
- The ecosystem lacks current docs, migration guides, security response, basic integrations, or
  searchable operational failure knowledge for the intended use.
- Debugging crosses opaque generated code, hidden runtime state, async infrastructure, or remote
  vendor behavior without local reproduction, logs, traces, metrics, request IDs, and an error
  taxonomy.
- The team cannot operate the technology and has no owner, training plan, runbook, or support plan.
- License, pricing, data retention, region, privacy, compliance, or security constraints conflict
  with the project.
- The candidate solves taste, novelty, resume value, or aesthetic discomfort rather than a real
  product, operational, security, performance, or maintenance bottleneck.
- A local reversible problem would become a global architecture commitment.

Do not average scores until hard rejection criteria have been applied.

<!-- mustflow-section: scoring-rubric -->
## Scoring Rubric

Score each non-rejected candidate from 0 to 5:

- `0`: no evidence, impossible, or actively unsafe.
- `1`: theoretical, undocumented, or dependent on heroic manual work.
- `2`: possible with high manual cost, fragile assumptions, or large downtime.
- `3`: usable with known limits, documented mitigation, and acceptable blast radius.
- `4`: documented, staged, testable, rehearsable, observable, and owned.
- `5`: boring, standard, widely proven, easy to operate, easy to replace, and compatible with the
  project.

Required dimensions:

- Migration path
- Rollback path
- Ecosystem maturity
- Maintainer health
- Debuggability
- Operating surface and toil
- Cost predictability
- Data ownership and export
- Security and privacy fit

For `experiment` or `internal_tool`, scores of 2 or 3 can be acceptable when the candidate is
isolated, timeboxed, feature-flagged, and easy to remove.

For `customer_facing`, require no hard rejection and at least 3 in migration, rollback, ecosystem,
maintainer health, and debuggability.

For `production_core`, require no hard rejection, at least 4 in migration, rollback, debuggability,
operating surface, and data ownership, and at least 3 in ecosystem and maintainer health.

For `irreversible_core`, require no hard rejection, at least 4 in every dimension, a named owner,
and a rehearsed recovery path.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the decision contract: what is being chosen, what is not being chosen, baseline, boring
   default, owner, time horizon, and affected survival paths.
2. Classify criticality and reversibility. Raise the evidence bar for persistent data, public APIs,
   auth, payment, permission, deployment, backup, restore, and customer workflows.
3. Build the option set. Include the status quo and boring default. Compare no more than three
   additional candidates unless the user asks for a broader survey.
4. Build the evidence ledger. Separate facts, inferences, assumptions, and unknowns. Prefer current
   primary evidence over social proof, benchmark marketing, generated advice, or repeated citations.
5. Evaluate maintainer life. For solo or indie work, prefer the smallest operating surface: one
   understandable app path, managed boring infrastructure, simple CI/CD, automatic backups,
   observable failures, and cheap rollback. Treat maintainer time as a real cost.
6. Place experimentation at the edge. New or experimental technology belongs in replaceable parts,
   read-only paths, derived-data paths, internal tools, feature-flagged features, analytics, search,
   recommendation, or AI differentiators that can fail without corrupting the source of truth.
7. Assess migration path for each candidate: source, target, compatibility layer, data conversion,
   dual-run or shadow mode, cutover, validation, owner, blast radius, and stop condition.
8. Assess rollback path for each candidate: trigger, steps, data preservation, schema compatibility,
   feature flag or routing control, backup and restore limits, customer impact, irreversible cutoff,
   and rehearsal requirement.
9. Assess ecosystem maturity and maintainer risk: docs, changelog, release cadence, security
   response, issue and PR handling, governance, funding, license stability, support, and exit path.
10. Assess debugging surface: local reproduction, logs, traces, metrics, request IDs, error codes,
    generated code, runtime magic, caches, queues, network boundaries, vendor dashboards, and blind
    spots.
11. Assess cost and operating surface: fixed cost, variable cost, CI/CD cost, observability cost,
    backup and restore cost, failure-spike cost, egress, retry storms, log volume, billing meters,
    and monthly maintainer labor.
12. Apply hard rejection criteria before scoring. Do not rescue a hard-failed candidate with
    popularity, performance, developer experience, or future promises.
13. Score remaining candidates with one sentence of evidence for each dimension. Avoid invented
    weights unless the user provided a decision model.
14. Attack the leading candidate. State the strongest reason not to choose it and the smallest
    evidence that would reverse the recommendation.
15. Choose exactly one decision state: `adopt`, `adopt_with_constraints`, `experiment_first`,
    `defer`, `reject`, or `reject_until_evidence_exists`.
16. Define the next action. For adoption, specify the smallest safe rollout, guardrails, migration,
    rollback, observability, owner, verification, and stop condition. For experiment, specify the
    question, timebox, success criteria, failure criteria, cleanup path, and decision-reversing
    evidence.
17. Hand off to implementation only after selecting the narrower implementation skill and carrying
    forward accepted constraints, migration steps, rollback steps, observability, and verification.

<!-- mustflow-section: postconditions -->
## Postconditions

- The recommendation is based on survivability, reversibility, debugging, operating cost, and team
  capacity, not novelty.
- Survival-path choices prefer boring proven technology unless the candidate proves a stronger
  recovery and operating story.
- Experimental technology is isolated from source-of-truth data, money, permissions, and deployment
  unless the project explicitly accepts the risk and can roll back.
- Hard rejection criteria are applied before any score comparison.
- Migration, rollback, observability, owner, and stop conditions are explicit.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `changes_status`
- `changes_diff_summary`
- `docs_validate_fast`
- `test_related`
- `test_release`
- `mustflow_check`

Use `docs_validate_fast` when a decision record, architecture note, skill, template, or mustflow doc
changes. Use `test_related` or `test_release` when installed template behavior, package output, or
tests change. Use `mustflow_check` when mustflow-owned skills, routes, indexes, templates, or command
contracts change.

Report missing benchmark, migration, deployment, restore, cloud, vendor, pricing, or observability
verification instead of inventing raw commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the user provides only a favorite technology and no baseline, compare it with the status quo
  and a boring default.
- If evidence is missing for a production-core decision, return `reject_until_evidence_exists` or
  `experiment_first`, not `adopt`.
- If rollback is weak, constrain the candidate to experiment, edge usage, or non-core usage.
- If a mature candidate creates a large debugging surface, require observability and local
  reproduction before adoption.
- If maintainer risk is concentrated, require an adapter, fork plan, vendor alternative, or deferral.
- If cost cannot be estimated across normal, success, and failure-spike scenarios, mark cost
  predictability as unresolved.
- If every option fails hard constraints, return `defer`, `reject`, or
  `reject_until_evidence_exists` and name what would need to change.

<!-- mustflow-section: output-format -->
## Output Format

- Skill selection and overlap decision
- Decision state: `adopt`, `adopt_with_constraints`, `experiment_first`, `defer`, `reject`, or
  `reject_until_evidence_exists`
- Decision scope, baseline, boring default, criticality, reversibility class, owner, and time horizon
- Candidate matrix with hard-gate result, scores, evidence, mitigations, and verdict
- Survival-path impact and experimental-edge placement
- Migration path
- Rollback path
- Debugging surface
- Cost and operating-surface notes
- Hard rejections and exact criteria
- Guardrails, owner, runbook, observability, security, privacy, and data-export requirements
- Experiment plan when the decision is `experiment_first`
- Command intents run
- Skipped verification and reasons
- Remaining risk and decision-reversing evidence
