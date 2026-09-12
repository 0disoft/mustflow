---
mustflow_doc: skill.move-chain-selection
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: move-chain-selection
description: Compare Sui and Aptos Move for a concrete asset lifecycle, storage authority, composition and upgrade operating model.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.move-chain-selection
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui and Aptos Move Selection

<!-- mustflow-section: purpose -->
## Purpose

Compare Sui and Aptos Move for a concrete asset lifecycle, storage authority, composition and upgrade operating model. Produce workload-specific comparison and decision evidence.

<!-- mustflow-section: use-when -->
## Use When

- Compare Sui and Aptos Move for a concrete asset lifecycle, storage authority, composition and upgrade operating model.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- A settled chain choice with a local implementation task; use its focused procedure. This is not token investment advice.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Required asset lifecycle, authority model, contention workload, callers, upgrade obligations, team capacity and current candidate toolchains.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://docs.sui.io/concepts/object-model
- https://aptos.dev/build/smart-contracts/objects
- https://aptos.dev/build/smart-contracts/book/modules-and-scripts
- https://aptos.dev/build/smart-contracts/fungible-asset
- https://aptos.dev/build/smart-contracts/move-security-guidelines

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Chain decision records and bounded prototypes, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Fix decision criteria from one create/purchase/cancel/refund/replay/upgrade lifecycle and record disqualifying constraints before choosing a chain. Reuse technology-stack-selection for economics and exit costs; avoid a universal winner based on language preference.

2. Model storage separately: Sui object inputs and ownership versus Aptos account/object-address resources and defining-module storage APIs. Aptos has objects; its Object<T> handle is not proof of ownership. Sui shared access and Aptos signer identity both still require target-specific business authorization.

3. Map actual conflicting state and conservation requirements on each candidate. Compare measured tail latency and successful throughput under that workload, not headline TPS. Do not remove global economic invariants to eliminate contention.

4. Compare supported composition for the installed versions: Sui PTBs and Aptos scripts or current composer APIs. Verify available signatures and callback behavior rather than claiming Aptos permits one call only or that every Move runtime forbids reentrancy.

5. Compare asset identity and standards explicitly: Sui generic Coin<T>/Balance<T> types and Aptos FA metadata identity. Names/symbols are not identity. Verify current framework standards and wallet/indexer support, including address-balance capabilities where relevant.

6. Model upgrade operating costs: Sui versioned package calls and surviving old code versus Aptos updates at an existing module address. Check each chain's compatibility and policy constraints separately. Identify who updates clients, dependencies and lived-in state; bytecode compatibility is not semantic compatibility.

7. Use the smallest authorized prototype to test authorization, replay, recovery and upgrades. Evaluate formal verification against concrete specified invariants and current tooling; an unspecified external behavior is not proven. Record evidence, unknowns, rejection reasons and the condition that would change the decision.

<!-- mustflow-section: postconditions -->
## Postconditions

- Workload-specific comparison and decision evidence identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Review a source-linked candidate matrix and, when configured, the same bounded lifecycle on both candidates; distinguish measurements from untested assumptions.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If requirements or toolchain support are unknown, give a conditional decision with a bounded next experiment. Do not invent performance results, bridge equivalence or automatic asset portability.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Workload-specific comparison and decision evidence
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
