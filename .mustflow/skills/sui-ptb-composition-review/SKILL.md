---
mustflow_doc: skill.sui-ptb-composition-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-ptb-composition-review
description: Build or review Sui programmable transaction blocks, Move result references, object inputs, exact integer amounts, and onchain atomicity.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-ptb-composition-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui PTB Composition Review

<!-- mustflow-section: purpose -->
## Purpose

Build or review Sui programmable transaction blocks, Move result references, object inputs, exact integer amounts, and onchain atomicity.

<!-- mustflow-section: use-when -->
## Use When

A Sui Transaction builder composes Move calls, coin transfers, returned resources or atomic payment steps.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

Use sui-wallet-signing-review for signing authority. Use sui-execution-recovery-review when a submitted digest has an unknown outcome. General TypeScript refactoring without a Sui PTB does not activate this procedure.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Business invariants, Move function signatures and abilities, builder helpers, network and SDK versions, input object ownership/version strategy, amount and type validation, and final build/simulation fixtures.

Refresh version-sensitive details against the installed SDK and target network before using API examples or capability claims. Starting references: [Building transactions](https://sdk.mystenlabs.com/sui/transactions/basics), [PTB inputs and results](https://docs.sui.io/develop/transactions/ptbs/inputs-and-results), [Offline building](https://sdk.mystenlabs.com/sui/transactions/offline).

<!-- mustflow-section: preconditions -->
## Preconditions

The target is a Sui integration and the requested scope matches this procedure. Read the target repository's command contract. Use synthetic/redacted fixtures for review; this skill does not authorize live signing, asset movement, key access or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change only the relevant application adapters, policy, builder or consumer logic, focused fixtures/tests, and documentation requested by the task. Preserve existing authority and secret boundaries; supporting skills do not grant command permissions.

<!-- mustflow-section: procedure -->
## Procedure

1. Define the business steps that must commit together. Keep only that onchain unit atomic; an application DB update, email or external API is outside PTB atomicity. Failure can still incur gas processing. Keep independent payouts in bounded batches with distinct business identities.

2. Parse amounts directly into base-unit integers from validated decimal strings or bigint. Check decimals, sign and u64 bounds before serialization. Bind recipients, full coin types and network explicitly; successful BCS serialization does not validate business intent.

3. Pass command result references into subsequent commands instead of querying intermediate objects. Index or destructure TransactionResult values; do not spread them or use Array.from. They represent future results, not values on which a TypeScript if can branch.

4. Track every owned, borrowed, consumed and returned resource to its final destination. Route non-drop values and zero-value change coins to transfer, storage or a valid destruction path. Do not reuse a moved object or a merge source after consumption.

5. Make reusable helpers append to a caller-owned Transaction and return references. Keep signing and submission at the application boundary. Put execution-time minimum output, expiry and duplicate-order checks in Move when the business invariant must hold onchain.

6. Resolve mutable object references close to execution. Use object IDs when the builder/executor should resolve current versions; use explicit object references for intentional offline or pinned-version workflows. Do not calculate the next version locally. Supply shared-object identity and mutability according to the actual Move signature.

7. Build the complete transaction before assessing command count, byte size and gas headroom; input intents may expand during building. Check current network protocol limits instead of embedding historical maxima. Simulate with appropriate checks, then preserve the approved bytes; simulation is not an execution or freshness guarantee.

<!-- mustflow-section: postconditions -->
## Postconditions

Exercise multi-result composition, unused non-drop returns, double consumption, boundary amounts, shared mutability and an execution-time invariant that changes after simulation.

Distinguish inspected code, mocked behavior, simulation and live-chain evidence. Do not report a stronger result than the observed evidence supports.

<!-- mustflow-section: verification -->
## Verification

Use the target repository's configured `test_related` and `build` intents when they cover the changed boundary. For mustflow-native skill/template changes, use configured `mustflow_check`. Run only eligible one-shot intents; these names are references, not permission to execute an unconfigured command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If the Move ABI or final resource destination is unknown, stop the affected builder path with the unresolved input. If submission may already have occurred, switch to digest recovery instead of rebuilding.

<!-- mustflow-section: output-format -->
## Output Format

Report atomicity scope, resource flow, integer/type checks, input-reference policy, finalized build/simulation evidence and execution-time invariants.
