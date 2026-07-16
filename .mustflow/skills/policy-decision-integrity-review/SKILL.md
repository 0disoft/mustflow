---
mustflow_doc: skill.policy-decision-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: policy-decision-integrity-review
description: Apply this skill when a policy object, specification, decision table, rule engine, capability policy, approval rule, limit, masking rule, or default-deny path returns allow, deny, require-approval, downgrade, or obligations from versioned actor, resource, action, context, and budget facts.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.policy-decision-integrity-review
  command_intents:
    - changes_status
    - changes_diff_summary
    - lint
    - build
    - test_related
    - test
    - test_audit
    - docs_validate_fast
    - test_release
    - mustflow_check
---

# Policy Decision Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Make allow, deny, approval, downgrade, masking, limit, and obligation decisions deterministic,
versioned, explainable, conflict-safe, and bound to enforcement. Separate whether an action is
permitted from how an already permitted action is implemented.

<!-- mustflow-section: use-when -->
## Use When

- Code creates or changes a policy object, specification, decision table, rule engine, approval
  rule, default-deny rule, capability scope, limit, masking obligation, or policy version.
- A boolean cannot represent required outcomes such as allow, deny, require approval, downgrade,
  redact, rate-limit, or continue with obligations.
- Policy facts, configuration timing, rule precedence, approval delay, or version drift can change
  the decision between evaluation and effect.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Authentication, session establishment, actor-resource ownership, or permission enforcement is the
  whole task; use the applicable auth or access-control skill.
- Code selects an interchangeable implementation such as Stripe versus Adyen; use
  `strategy-pattern`. Deciding whether an actor may refund under policy version 7 belongs here.
- A Mustflow command intent grants agent execution authority; use `command-contract-authoring`.
- One entity transition guard is the whole rule; use `state-machine-pattern`.
- The task only models invalid domain states or ledger-backed balances; use
  `type-state-modeling-review` or `credit-ledger-integrity-review`.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Policy-input ledger: actor, resource, action, context, normalized facts, provenance, freshness, and
  trusted owner.
- Rule ledger: stable ID, version, predicate, scope, priority, effective window, and obligations.
- Decision ledger: outcome, reason code, matched rules, obligations, decision ID, and policy version.
- Conflict and default ledger: precedence, no-match behavior, missing-fact behavior, and fail-open or
  fail-closed choice.
- Snapshot and enforcement ledger: pinned version, approval binding, expiry, recheck rule, and exact
  effect gate.
- Decision-table, boundary, conflict, stale-fact, and version-change tests.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions, command contract, policy source of truth, fact loaders, enforcement
  path, approval persistence, configuration or rollout path, and current tests.
- State the policy question in actor-resource-action terms or another equally bounded decision.
- Treat raw requests, model output, provider claims, cache entries, and stale summaries as untrusted
  until normalized by their owning boundary.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten normalized fact types, policy rules, decision tables, structured outcomes, reason
  codes, obligations, version snapshots, conflict resolution, approval binding, enforcement rechecks,
  focused tests, docs, and directly synchronized templates.
- Keep identity proof, external claim translation, command mechanics, state transitions, and balance
  invariants in their owning procedures.
- Do not hide rule conflicts behind array order, broad boolean defaults, current-time globals,
  mutable configuration reads mid-run, or UI-only enforcement.

<!-- mustflow-section: procedure -->
## Procedure

1. Write the decision question and enumerate actor, resource, action, context, and requested effect.
2. Normalize trusted facts before policy evaluation. Record provenance and freshness for tenant,
   ownership, membership, risk, budget, time, environment, and approval facts.
3. Return a structured decision containing outcome, reason code, obligations, policy version,
   decision ID, matched rules, and safe evidence pointers. Do not return only `true` or `false` when
   callers must approve, mask, downgrade, limit, or explain.
4. Give every rule a stable ID, version, scope, priority, effective window, and owner. Keep policy
   meaning out of handler order and provider configuration where possible.
5. Define conflict precedence for allow, deny, approval, and obligations. State whether deny wins,
   obligations merge, approval can override, or one scoped rule supersedes another.
   Human approval must not silently override a deny; require an explicit versioned rule bound to the
   exact action whenever approval is allowed to supersede another decision.
6. Define deterministic no-match, missing, stale, and unknown-fact behavior. Security- or
   money-relevant uncertainty must not become accidental allow.
7. Pin one policy snapshot for a command or run. Do not read mutable rules repeatedly and combine
   decisions from different versions without an explicit migration rule.
8. Bind the decision to the exact actor, resource, action, normalized parameters or digest, policy
   version, obligations, expiry, and effect it gates.
   Delegated capabilities must use attenuation only: a child capability may narrow actor or subject,
   tenant, resource, actions, effects, expiry, call count, or cost, but must never widen its parent
   grant. Bind the chain to parent capability ID, issuer, policy version, and revocation state, and
   consume call and cost limits atomically at the trusted effect boundary.
   Canonicalize normalized parameters before binding or hashing them; define how omitted and default
   arguments compare so equivalent calls do not produce ambiguous decision identities.
9. After a long approval wait or material fact change, revalidate the binding or recompute under a
   declared version rule before executing. Record why an old approval remains valid or expires.
10. Enforce obligations such as masking, maximum amount, read-only mode, selected region, extra
    audit, or rate limit at the trusted effect boundary, not only in UI or planning code.
11. Test the full decision table where bounded, plus boundary values, pairwise rule conflicts,
    no-match, default deny, missing and stale facts, changed-after-approval, version migration, and
    decision-to-effect mismatch.
12. Persist safe decision metadata and reason codes when audit or replay needs them. Avoid raw PII,
    secrets, model reasoning, or broad request bodies.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every material decision exposes outcome, reason, obligations, version, and binding evidence.
- No-match, conflict, stale fact, policy drift, and changed-after-approval paths are deterministic.
- Evaluation and enforcement use the same actor, resource, action, parameters, policy version, and
  obligations or perform an explicit recheck.
- Strategy selection, authentication, command authority, lifecycle, and ledger invariants remain in
  their owning procedures.

<!-- mustflow-section: verification -->
## Verification

- Use configured `changes_status` and `changes_diff_summary` for scope evidence.
- Use `lint`, `build`, and `test_related` for policy implementation and decision matrices; use `test`
  or `test_audit` for shared rule engines or coverage claims.
- Use `docs_validate_fast`, `test_release`, and `mustflow_check` for public rules, package, template,
  or Mustflow changes.
- Report unavailable production-policy, rollout, approval-delay, or authorization evidence instead
  of inventing commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If the policy question, trusted facts, or conflict precedence cannot be named, stop policy edits
  and report the ambiguous decision.
- If enforcement cannot bind to the evaluated actor, resource, action, and version, report a TOCTOU
  gap and do not approve the path from evaluation tests alone.
- If uncertainty currently allows a sensitive effect, fail closed or require approval according to
  the declared product rule; do not invent a universal deny when availability policy differs.
- If verification fails, preserve the decision row and expected obligation, then use
  `failure-triage` before broadening the change.

<!-- mustflow-section: output-format -->
## Output Format

- Policy question, trusted inputs, source of truth, and snapshot version
- Rule IDs, precedence, defaults, outcomes, reason codes, and obligations
- Approval binding, enforcement, expiry, and recheck decisions
- Decision-table, conflict, stale-fact, drift, and TOCTOU evidence
- Files changed and compatibility impact
- Command intents run, skipped checks, and remaining policy-decision risk
