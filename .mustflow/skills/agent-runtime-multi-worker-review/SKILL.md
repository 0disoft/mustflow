---
mustflow_doc: skill.agent-runtime-multi-worker-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: agent-runtime-multi-worker-review
description: Apply this skill when a production LLM agent runtime may use several agents or workers and must decide whether independent parallelism justifies coordination cost, then define orchestrator-worker topology, specialized roles, capability separation, artifact ownership, independent evidence, correlated-error controls, bounded fan-out, and central verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.agent-runtime-multi-worker-review
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

# Agent Runtime Multi-Worker Review

<!-- mustflow-section: purpose -->
## Purpose

Use multiple runtime agents only when independently solvable work, parallel context capacity, or
specialized tools create more accepted value than planning, communication, duplication, ownership,
and correlated-error cost. Keep the default architecture single-agent until evidence supports the
extra topology.

<!-- mustflow-section: use-when -->
## Use When

- A production agent runtime adds lead agents, managers, worker agents, peer agents, debate,
  independent reviewers, candidate generators, judges, or distributed research workers.
- A task may split by source, customer, document set, package, hypothesis, candidate solution, or
  another independently verifiable work unit.
- The design must choose worker count, topology, role diversity, task ownership, communication,
  artifact handoff, result aggregation, verification, or stop conditions.
- A claim says multi-agent execution improves quality, coverage, throughput, latency, or reliability
  enough to justify extra tokens, infrastructure, coordination, and failure surface.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Several coding agents coordinate files, worktrees, commands, and merges for one repository task;
  use `multi-agent-work-coordination`.
- One runtime parent already has a justified child set and the main risk is join, cancellation,
  deadlines, cleanup, or late results; use `structured-concurrency-supervision-review`.
- The main risk is durable resume, queues, short-lived workers, or sandbox isolation; use
  `agent-runtime-isolation-review`.
- The main risk is tool authority, approval, external effects, or one agent's autonomy envelope; use
  `agent-execution-control-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Work-unit ledger: total work, independent units, dependency graph, shared context, expected output,
  independent validator, merge rule, and serial critical path.
- Benefit ledger: single-agent baseline, coverage, quality, latency, throughput, task value, backlog,
  and accepted-outcome improvement attributable to parallel workers rather than extra total compute.
- Coordination ledger: planning, delegation, communication, context transfer, duplicate work,
  conflict resolution, merge, verification, supervision, and fixed operating cost.
- Topology ledger: orchestrator, workers, reviewers, verifier, allowed communication edges, worker
  admission rule, fan-out and depth budgets, wait policy, cancellation, and terminal owner.
- Role ledger: unique information, tools, model, search strategy, permissions, evaluation criterion,
  artifact owner, and forbidden overlap for each role.
- Correlation ledger: shared model, prompt, source, memory, retrieval, tool, evaluator, failure domain,
  and how supposedly independent conclusions remain correlated.

<!-- mustflow-section: preconditions -->
## Preconditions

- Prove that at least one meaningful work unit can be completed and validated without continuous
  access to another worker's hidden context.
- Establish a single-agent baseline under a comparable total-compute and outcome contract before
  attributing a gain to topology.
- Do not copy benchmark worker counts, token multipliers, break-even sizes, or universal formulas
  into runtime policy. Calibrate from the product's task distribution and operating evidence.
- Keep command execution under `.mustflow/config/commands.toml`; this skill does not authorize live
  worker spawning, model calls, production traffic, or background agent loops.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or refine worker admission, orchestrator-worker topology, delegation schemas, role and
  capability boundaries, artifact stores, central verification, independent review, correlation
  metrics, fan-out and depth budgets, cancellation, tests, docs, route metadata, and templates.
- Replace peer-to-peer debate with bounded independent work and one aggregation owner when debate
  does not provide unique evidence.
- Do not add workers merely because a task is difficult, long, or uses many tokens.
- Do not let several agents jointly own one authoritative artifact or external effect.

<!-- mustflow-section: procedure -->
## Procedure

1. Start from the single-agent baseline. Record accepted outcomes, latency, cost, failures, and
   context limits under the same task mix and total-compute accounting used for the candidate.
2. Decompose by independently completable and verifiable work units, not by arbitrary prompt turns.
   Reject parallelization when most steps share one evolving context, mutate the same authority, or
   depend on subtle upstream judgment.
3. Model the break-even qualitatively and quantitatively from local evidence. Count parallel quality
   or time value, then subtract planning, communication, duplication, ownership misses, conflict,
   verification, retry, and operating cost. If marginal benefit is non-positive, keep one agent.
4. Prefer a star topology. Let one orchestrator issue bounded work orders, let workers return
   independent artifacts or structured findings, and let one verifier or merge owner accept or
   reject them. Avoid all-to-all conversation whose message count and repeated context grow rapidly.
5. Give roles distinct information or capability. Separate sources, tools, models, search strategies,
   permissions, hypotheses, or evaluation criteria. Multiple copies of one prompt and source set are
   correlated samples, not independent experts.
6. Define one owner per artifact and effect. Workers may propose or review; the named owner admits
   the result, resolves conflict, and owns terminal state. Consensus does not erase accountability.
7. Preserve independent judgment before aggregation. Do not reveal peer answers to reviewers before
   their initial assessment when independence matters. Record shared failure domains and avoid
   treating majority vote as strong evidence when errors are correlated.
8. Use durable artifacts, not transcript relays. Store source-backed findings, patches, datasets,
   reports, hashes, or typed records under stable references; pass lightweight references and
   summaries to the orchestrator to reduce telephone-game loss and context duplication.
9. Bound admission from task evidence. Set active worker, queued worker, depth, tool-call, token,
   cost, and wall-clock budgets from expected independent units and resource capacity. Stop adding
   workers when remaining units overlap, coordination dominates, or the verifier becomes the
   bottleneck.
10. Make completion policy explicit. Choose all-required, quorum, first-valid, best-of-N under an
    external validator, or partial result. Define timeout, cancellation, late-result rejection,
    missing-worker behavior, and which failures can preserve useful artifacts.
11. Keep capabilities task-scoped and attenuation-only. A worker receives only the sources, tools,
    resources, effects, budget, and lifetime needed for its work unit. Worker failure must not trigger
    automatic privilege escalation.
12. Verify centrally with deterministic checks first. Use tests, schemas, source agreement,
    database state, checksums, invariants, or other independent evidence before an LLM judge. Keep
    creator, reviewer, and final authority distinct for high-impact outcomes.
13. Evaluate topology against the baseline. Attribute gains separately to extra compute, parallelism,
    role specialization, tool diversity, and verifier quality. Measure duplication, handoff loss,
    correlated failures, verifier load, orphan work, and cost per accepted outcome.
14. Route runtime lifetime and sandbox design to `agent-runtime-isolation-review`; route child join
    and cancellation mechanics to `structured-concurrency-supervision-review`; route outcome and
    trajectory grading to `agent-eval-integrity-review`.

<!-- mustflow-section: postconditions -->
## Postconditions

- Multi-worker execution is enabled only for independently solvable and verifiable units with a
  measured advantage over a comparable single-agent baseline.
- Communication is bounded, artifact ownership is singular, and correlated votes are not presented
  as independent proof.
- Fan-out, depth, capability, cost, wait, cancellation, and terminal ownership are explicit.
- One central owner verifies and admits worker results.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available: `changes_status`, `changes_diff_summary`,
`lint`, `build`, `test_related`, `test`, `docs_validate_fast`, `test_release`, and `mustflow_check`.
Do not infer raw worker, model, queue, load, or production commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If work units cannot be independently validated, serialize them under one owner.
- If worker roles differ only by name, reduce the worker set or redesign the evidence split.
- If communication or verification cost dominates the measured benefit, return to the single-agent
  baseline.
- If artifact or effect ownership is ambiguous, stop admission until one terminal owner is named.

<!-- mustflow-section: output-format -->
## Output Format

- Single-agent baseline and multi-worker decision
- Independent work units, dependencies, and validators
- Topology, roles, capabilities, communication, and artifact ownership
- Correlation, fan-out, wait, cancellation, and terminal policies
- Cost-per-accepted-outcome and attribution findings
- Command intents run and skipped checks
- Remaining runtime multi-worker risk
