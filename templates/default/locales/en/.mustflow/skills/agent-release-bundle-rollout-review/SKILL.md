---
mustflow_doc: skill.agent-release-bundle-rollout-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: agent-release-bundle-rollout-review
description: Apply this skill when an LLM agent's model, settings, rendered prompts, examples, tool schemas, adapters, policy, retrieval, memory, runtime, or evaluator changes must be packaged as one immutable behavior release and promoted through replay, shadow, canary, staged rollout, rollback, or emergency restriction without changing in-flight behavior unpredictably.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-release-bundle-rollout-review
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

# Agent Release Bundle Rollout Review

<!-- mustflow-section: purpose -->
## Purpose

Release agent behavior as an attributable, immutable unit. Prevent a moving model alias, prompt,
tool contract, policy, retrieval index, runtime, or evaluator from changing one automation path
silently while it is running or while its result is being compared with another version.

<!-- mustflow-section: use-when -->
## Use When

- An agent behavior change includes a model or generation setting, rendered prompt, example set,
  tool schema or adapter, external policy, retrieval or memory configuration, runtime dependency,
  evaluator, or eval dataset.
- A candidate agent version needs offline replay, shadow execution, canary exposure, staged
  promotion, stable-pointer movement, rollback, or emergency capability restriction.
- A rollout claim depends on cohort assignment, SLO gates, control comparison, whole-task
  observation, side-effect suppression, compatibility, or per-version attribution.
- Several automations consume shared prompts, models, tool definitions, policies, indexes, or
  runtime libraries and a global change could create correlated failures.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only deploys generic servers, workers, containers, migrations, configuration, or feature
  flags with no agent-behavior bundle; use `deployment-rollout-safety-review`.
- The task only designs agent approval, capability, tool-call, or effect controls within one pinned
  version; use `agent-execution-control-review`.
- The task only designs eval datasets, graders, trajectory scoring, or oracle quality; use
  `agent-eval-integrity-review`.
- The task only manages prompt wording or output contracts; use `prompt-contract-quality-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Bundle manifest: bundle ID and digest; model identifier and settings; fully rendered prompt and
  examples; tool schema, adapter, and backend contract versions; policy version; retrieval, memory,
  embedding, index, and chunking versions; runtime and library lock; eval dataset and evaluator
  versions; build provenance; creation time; and compatibility requirements.
- Channel ledger: candidate, stable, rollback target, immutable bundle references, assignment rule,
  assignment reason, sticky cohort key, exposure percentage or bounded population, and promotion
  history.
- Rollout ledger: static checks, offline replay, shadow, canary, staged expansion, observation
  window, hard safety gates, quality and cost gates, control comparison, owner, and stop criteria.
- Effect ledger: read, draft, write, send, delete, spend, credential, memory-write, compensation,
  idempotency, unknown outcome, and whether shadow execution can suppress each effect.
- Rollback ledger: pointer reversal, in-flight safe point, compatibility window, capability
  revocation, pending effect reconciliation, compensation owner, and schema or data downgrade rule.

<!-- mustflow-section: preconditions -->
## Preconditions

- Pin current source, bundle inputs, provider or framework contracts, and baseline metrics before
  comparing a candidate.
- Treat model aliases, remote prompts, mutable tool schemas, external policy, retrieval indexes, and
  evaluator defaults as moving dependencies until resolved to immutable identities.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  rollout, traffic movement, model calls, production writes, or release publication.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine bundle manifests, immutable identifiers, channel records, assignment rules, rollout
  gates, shadow adapters, effect suppression, compatibility checks, rollback plans, revocation,
  observability, focused tests, docs, route metadata, and synchronized templates.
- Add an emergency safety overlay only when it can reduce capability, scope, budget, or exposure.
- Do not let an emergency overlay add tools, widen permissions, increase budget, weaken approval,
  lower validation, or promote a candidate.
- Do not mutate the behavior bundle assigned to an in-flight run. Start a new run or use a declared
  safe migration point with compatibility and effect reconciliation.

<!-- mustflow-section: procedure -->
## Procedure

1. Define one behavior bundle. Include every input that can change agent decisions, tool calls,
   retrieved evidence, side effects, evaluation, or runtime semantics. Hash the canonical manifest
   and preserve component digests rather than recording only a marketing version.
2. Resolve mutable references. Pin the exact model snapshot when the provider supports it, rendered
   prompt, examples, tool schema, adapter and backend contract, policy, index, embedding model,
   memory schema, runtime lock, evaluator, and eval dataset used by the run.
3. Keep candidate creation separate from stable promotion. Automation may build and register a
   candidate, but it must not move the stable pointer until the declared gates succeed.
4. Build a dependency and compatibility matrix. Name every automation and cohort that consumes the
   changed component, plus tool, state, memory, event, prompt, and output schema compatibility.
5. Run static and offline gates first. Validate manifest completeness, signatures or provenance,
   schema compatibility, policy monotonicity, deterministic fixtures, regression replay, and
   adversarial cases before online exposure.
6. Shadow without external authority. Let the candidate observe representative inputs, but remove
   write, send, delete, spend, credential, production-memory-write, and other committing tools.
   Compare proposed actions and final state predictions without pretending suppressed effects prove
   real-world success.
7. Select canaries by stable work-unit identity, not a fresh random choice per request. Keep one
   task, conversation, workflow, or account on one bundle unless a declared safe transition changes
   it. Cover high-risk and representative cohorts without exposing only easy traffic.
8. Observe at least one complete business work unit. Choose duration from task lifetime, delayed
   effects, traffic volume, and detection latency; do not copy a universal time or percentage.
9. Gate safety before quality and cost. Stop on authorization bypass, duplicate or unknown effects,
   privacy or secret exposure, invariant violation, unsafe action rate, inability to reconcile, or
   rollback failure even when aggregate quality improves.
10. Compare both absolute limits and a concurrent control. Shared provider or infrastructure
    failures can move candidate and stable together, while a healthy control can still hide an
    absolute SLO breach.
11. Expand in stages only after evidence is attributable to the exact bundle. Preserve cohort,
    sample size, task mix, risk mix, confidence limits, delayed outcomes, and excluded traffic.
12. Roll back the complete behavior contract. Move the pointer, revoke candidate capabilities,
    stop new assignments, reconcile in-flight UNKNOWN effects, preserve idempotency, compensate
    when exact reversal is impossible, and keep old schema readers and tool adapters available for
    the declared compatibility window.
13. Keep the emergency path attenuation-only. Apply a separately versioned, audited restriction
    that can disable tools, narrow scopes, reduce budgets, require stronger approval, or stop
    traffic. Never use it as an untested feature channel.
14. Route infrastructure traffic, probe, shutdown, container, migration, and generic deployment
    details to `deployment-rollout-safety-review`; route eval validity to
    `agent-eval-integrity-review`; route tool authority and side-effect controls to
    `agent-execution-control-review`.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every run is attributable to one immutable bundle and assignment decision.
- Candidate creation cannot silently promote stable or rewrite in-flight behavior.
- Shadow mode lacks committing capabilities, canaries are sticky and representative, and promotion
  uses hard safety gates plus absolute and control-relative evidence.
- Rollback covers capabilities, compatibility, in-flight effects, reconciliation, and compensation,
  not only a routing pointer.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer live rollout, provider, production, traffic, model, or release commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If a bundle component is mutable or unknown, stop attribution claims and record the unresolved
  dependency.
- If shadow execution can commit an effect, disable that capability before treating shadow evidence
  as safe.
- If candidate and control assignment is unstable, restart the comparison with a sticky cohort.
- If rollback cannot reconcile in-flight effects or read old state, stop expansion and preserve the
  last compatible bundle and evidence for the named owner.

<!-- mustflow-section: output-format -->
## Output Format

- Bundle identity and component manifest
- Candidate, stable, assignment, and cohort decision
- Offline, shadow, canary, staged-promotion, and hard-gate evidence
- Compatibility, attribution, and delayed-outcome findings
- Rollback, revocation, reconciliation, and compensation readiness
- Command intents run and skipped checks
- Remaining agent-release rollout risk
