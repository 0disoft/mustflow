---
mustflow_doc: skill.sui-execution-recovery-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-execution-recovery-review
description: Review Sui submitted-transaction outcomes, digest reconciliation, durable signed bytes, business idempotency, and safe resubmission.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-execution-recovery-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Execution and Recovery Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui submitted-transaction outcomes, digest reconciliation, durable signed bytes, business idempotency, and safe resubmission.

<!-- mustflow-section: use-when -->
## Use When

A Sui payment, payout or queue must recover after response loss, process restart, chain failure, duplicate business requests or uncertain submission.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

Use sui-ptb-composition-review for an unsigned builder failure. Use sui-rpc-resilience-review for provider transport and read availability. An HTTP timeout is not evidence that a submitted transaction failed.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Operation identity and payload, state machine, signing/submission boundary, durable outbox or journal, original bytes/signatures/digest, chain/expiry data, reader retention and synthetic execution effects.

Refresh version-sensitive details against the installed SDK and target network before using API examples or capability claims. Starting references: [Transaction lifecycle](https://docs.sui.io/develop/transactions/transaction-lifecycle), [Execution results](https://sdk.mystenlabs.com/sui/clients/executing), [Exchange integration](https://docs.sui.io/operators/exchange-integration).

<!-- mustflow-section: preconditions -->
## Preconditions

The target is a Sui integration and the requested scope matches this procedure. Read the target repository's command contract. Use synthetic/redacted fixtures for review; this skill does not authorize live signing, asset movement, key access or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change only the relevant application adapters, policy, builder or consumer logic, focused fixtures/tests, and documentation requested by the task. Preserve existing authority and secret boundaries; supporting skills do not grant command permissions.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate business operation identity from transaction digest. Enforce uniqueness in the actual tenant/account scope and compare the immutable payload on duplicate IDs. Where duplicate asset movement remains possible, consider an appropriately partitioned Move-side business guard rather than a global hot object.

2. Persist the operation before building, then persist the final bytes, all signatures, digest, chain and applicable expiry before the first submission. Restrict access to these replay-capable artifacts; logs and test reports should contain safe identifiers. A wrapper around signAndExecuteTransaction does not prove this persistence boundary exists.

3. Represent preparation rejection, chain success, chain failure and submitted outcome unknown separately. A returned FailedTransaction is failure even when the Promise resolves. Verify the expected recipient, full asset type, amount and business event before marking the operation complete.

4. After ambiguous transport failure, reconcile the saved digest using a reader with suitable retention. A not-found response, stale object error or cancelled HTTP request cannot alone prove nonexecution. If policy permits retransmission, resend the same original bytes and signatures under a bounded retry budget.

5. Rebuild only an unsigned/unsubmitted request, or after evidence establishes the previous signed transaction can no longer produce an additional effect and the business operation is still eligible. Expiry alone does not prove it never executed before expiry: reconcile history and the business guard first.

6. Keep pending submissions and asset reservations across process restarts. Commit business result application and durable progress together or use an idempotent outbox/consumer boundary. Reconcile old-worker submissions before handing an asset set to a replacement worker.

7. Separate execution evidence from visibility at the next reader. Confirm effects at the GraphQL/indexer endpoint actually used by follow-up reads; do not replace that observation with a fixed sleep or repeat payment when an indexer lags.

<!-- mustflow-section: postconditions -->
## Postconditions

Inject response loss after acceptance, restart before result persistence, resolved FailedTransaction, duplicate ID with a changed amount, missing archival history and expiry after prior execution. Assert one business payout, retained original bytes and an unresolved state when proof is absent.

Distinguish inspected code, mocked behavior, simulation and live-chain evidence. Do not report a stronger result than the observed evidence supports.

<!-- mustflow-section: verification -->
## Verification

Use the target repository's configured `test_related` and `build` intents when they cover the changed boundary. For mustflow-native skill/template changes, use configured `mustflow_check`. Run only eligible one-shot intents; these names are references, not permission to execute an unconfigured command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

Keep inconclusive submissions pending for bounded reconciliation or operator review. Escalate inaccessible original artifacts or missing historical evidence explicitly; never convert unknown into fresh-send permission.

<!-- mustflow-section: output-format -->
## Output Format

Report durable write order, operation/digest mapping, outcome transitions, retransmit-versus-rebuild decision, reconciliation evidence and unresolved work age.
