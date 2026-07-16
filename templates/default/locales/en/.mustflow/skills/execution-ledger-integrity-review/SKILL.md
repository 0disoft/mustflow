---
mustflow_doc: skill.execution-ledger-integrity-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: execution-ledger-integrity-review
description: Apply this skill when runs, attempts, leases, approvals, checkpoints, tool or provider effects, receipts, terminal outcomes, resume, reconciliation, or replay depend on an append-only execution ledger rather than ordinary logs or session handoff summaries.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.execution-ledger-integrity-review
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

# Execution Ledger Integrity Review

<!-- mustflow-section: purpose -->
## Purpose

Keep execution history truthful enough to explain, resume, reconcile, and safely replay decisions.
Record observable inputs, actions, approvals, attempts, effects, checkpoints, and outcomes without
turning hidden reasoning, secrets, raw conversations, or full logs into durable authority.

<!-- mustflow-section: use-when -->
## Use When

- A system must later prove which run, attempt, lease owner, checkpoint, approval, effect, or terminal
  outcome happened.
- Resume or reconciliation depends on an operation ledger, execution ledger, semantic checkpoint,
  effect receipt, result digest, provenance, or replay record.
- A reliability claim depends on durable execution facts rather than ordinary trace or log lines.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task is ordinary logging or trace-field quality; use `backend-log-evidence-review` or
  `observability-debuggability-review`.
- The record is a coding-session handoff; use `restricted-handoff-resume`.
- The record is a credit, payment, accounting, or business balance ledger; use the corresponding
  ledger-integrity skill.
- The main concern is duplicate acceptance, workflow step order, compensation, or policy evaluation;
  use `idempotency-integrity-review`, `durable-workflow-orchestration`, or
  `policy-decision-integrity-review` respectively.
- A request ID in logs is not an execution ledger, and an idempotency key alone does not prove which
  attempt performed an external effect.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Execution identity ledger: run, parent run, logical action, attempt, causation, and correlation.
- Input and version ledger: safe input digest plus code, configuration, policy, model, provider,
  tool, and schema versions required to interpret the result.
- Action and effect ledger: selected action, safe argument digest, approval, effect identity, and
  pre-effect intent record.
- Attempt and outcome ledger: owner or lease, start, result digest, receipt, unknown or partial
  outcome, terminal classification, and supersession.
- Checkpoint, integrity, retention, privacy, replay, and reconciliation ledgers.

<!-- mustflow-section: preconditions -->
## Preconditions

- Read the nearest instructions, command contract, execution path, persistence schema, checkpoint
  and resume code, effect boundaries, privacy policy, replay path, and current tests.
- Separate audit, resume, reconciliation, and replay requirements. Do not add an event-sourced domain
  model when only execution evidence is needed.
- Treat stored summaries and traces as derived evidence below current source, policy, and durable
  receipts.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Add or tighten execution identities, append-only entries, sequence or hash links, lease generations,
  semantic checkpoints, effect receipts, terminal outcomes, replay inputs, reconciliation, retention,
  redaction, focused tests, docs, and directly synchronized templates.
- Add public projections or exports only with their owning public-contract procedure.
- Do not store hidden reasoning, raw prompts, raw conversations, full terminal output, credentials,
  secret-bearing tool payloads, or unbounded provider responses as ledger evidence.

<!-- mustflow-section: procedure -->
## Procedure

1. State whether the ledger supports audit, resume, reconciliation, replay, or a bounded combination.
2. Define stable run, parent, logical action, attempt, causation, correlation, approval, and effect
   identities. Do not collapse a retry attempt into a new logical action.
3. Record safe input digests and every code, configuration, policy, model, provider, tool, and schema
   version needed to interpret the decision and result.
4. Keep model, provider, and tool content minimal: safe normalized fields, evidence pointers, and
   digests. Redact or omit raw sensitive payloads before persistence.
5. Bind approval to the exact actor, resource, action, arguments or digest, policy decision, version,
   expiry, and effect that it permits.
6. Append an accepted intent before an external effect and append the observed outcome afterward.
   Preserve a gap or unknown outcome if the process dies between them.
7. Separate logical action state from attempts. Record owner, lease or generation, attempt number,
   deadline, retry reason, supersession, and the terminal attempt that owns the outcome.
8. Treat timeout or missing response as unknown, not failed, until provider lookup, durable receipt,
   or reconciliation establishes the result.
9. Store semantic state and the last committed ledger position in a checkpoint. Reconstruct runtime
   objects and verify pending effects on resume.
10. Enforce append-only ordering with unique identities, monotonic sequence or equivalent causal
    links, durable constraints, and tamper or truncation detection appropriate to the threat model.
11. Make terminal outcomes monotonic. A late attempt cannot overwrite a succeeded, cancelled,
    superseded, or manual-review result without an explicit corrective entry.
12. Replay pure decisions against pinned inputs and inject recorded observations for external calls.
    Never make replay re-send email, charge money, mutate providers, or publish events implicitly.
13. Test missing entries, partial append, duplicate outcome, stale lease, late attempt, version drift,
    unknown provider result, checkpoint gap, tampering, retention expiry, and replay side-effect blocks.

<!-- mustflow-section: postconditions -->
## Postconditions

- Every observable effect links to a logical action, attempt, owner, approval when required, and
  result or explicit unknown outcome.
- Resume cannot skip a ledger gap, stale lease, version mismatch, or unresolved effect silently.
- Replay does not execute external mutations and reports version drift instead of false equivalence.
- Retained evidence is bounded and privacy-safe without relying on hidden reasoning or raw logs.

<!-- mustflow-section: verification -->
## Verification

- Use configured `changes_status` and `changes_diff_summary` for scope evidence.
- Use `lint`, `build`, and `test_related` for implementation and ledger failure fixtures; use `test`
  or `test_audit` for shared ledger or coverage claims.
- Use `docs_validate_fast`, `test_release`, and `mustflow_check` for public exports, package, template,
  or Mustflow changes.
- Report unavailable database fault injection, provider reconciliation, tamper testing, or retention
  expiry evidence rather than inventing commands.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If run, action, attempt, or effect identity cannot be separated, stop replay or resume claims and
  report the ambiguous identity.
- If a ledger gap or unknown effect cannot be reconciled, preserve manual-review state; do not mark
  the run failed and retry automatically.
- If safe evidence requires storing secrets or raw transcripts, redesign the evidence pointer or
  digest before persistence.
- If verification fails, preserve the ledger invariant and use `failure-triage` before changing
  unrelated runtime code.

<!-- mustflow-section: output-format -->
## Output Format

- Audit, resume, reconciliation, and replay purposes reviewed
- Run, action, attempt, version, approval, effect, checkpoint, and terminal-outcome decisions
- Append-only, privacy, retention, unknown-outcome, and replay protections
- Failure-injection and drift evidence
- Files changed and public-contract impact
- Command intents run, skipped checks, and remaining ledger-integrity risk
