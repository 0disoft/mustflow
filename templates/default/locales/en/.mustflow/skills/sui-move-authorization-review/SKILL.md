---
mustflow_doc: skill.sui-move-authorization-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-move-authorization-review
description: Review Sui Move capability target binding, asset authorization, signed claims, revocation and onchain replay prevention.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-move-authorization-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Move Asset Authorization Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui Move capability target binding, asset authorization, signed claims, revocation and onchain replay prevention. Produce authority matrix and payout conservation witnesses.

<!-- mustflow-section: use-when -->
## Use When

- Review Sui Move capability target binding, asset authorization, signed claims, revocation and onchain replay prevention.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Wallet authentication or signer custody alone; use sui-wallet-signing-review. Submission recovery alone uses sui-execution-recovery-review.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Privileged entrypoints, capability issuance and ownership paths, asset types, trusted issuers and canonical business entitlement identities.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://docs.sui.io/develop/security/best-practices
- https://docs.sui.io/references/framework/sui_sui/transfer
- https://docs.sui.io/references/framework/sui_sui/coin

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Capability checks and one-use claim transitions, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Map each operation to caller, capability, target, action, asset, limits and revocation state. Trace all issuance paths. A valid AdminCap for vault A must not authorize vault B; compare the cap's target and current authorization generation at every relevant entrypoint.

2. Separate object input eligibility from withdrawal permission. Audit public methods, returned mutable references and extension paths that can reach Balance or UID. Review transfer/freeze exposure of capabilities, including immutable caps passed by shared reference.

3. Validate actual supplied Coin<T> or Balance<T>, its accepted type and actual quantity, not a caller-declared payment number. State conservation across price, fee and change. Specify rounding, zero/underpayment behavior and overflow-safe intermediate arithmetic; test fee splitting attacks.

4. Bind one-use state to a service-recognized entitlement, not an attacker-chosen new order ID. Consume the entitlement or atomically mark it with payout. Distinguish transaction deduplication from repeated claims in newly built transactions.

5. For signed claims, define unambiguous canonical bytes binding network, protocol/policy, action, recipient, asset, amount, entitlement, expiry and nonce. Verify against a trusted issuer registry, not a caller-selected trusted key; check current policy and expiry and consume nonce atomically with the effect.

6. Design revocation without requiring possession of a stolen capability. Separate upgrade, mint and routine operational authority. Identify old-package entrypoints that bypass new guards and route their closure to sui-move-upgrade-review.

7. Keep chain effects and backend credits as distinct atomic boundaries. Hand off durable digest recovery and database idempotency to sui-execution-recovery-review; an event or timeout alone does not prove the authorized payout.

<!-- mustflow-section: postconditions -->
## Postconditions

- Authority matrix and payout conservation witnesses identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Use two legitimate vault/cap pairs and swap them; test revoked caps, unauthorized issuers, changed signed fields, repeated entitlements, wrong assets, underpayment and valid settlement.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If a reachable theft path exists, report exact source-to-effect evidence and a bounded fix. Do not claim resource abilities or a successful signature check prove business authorization.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Authority matrix and payout conservation witnesses
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
