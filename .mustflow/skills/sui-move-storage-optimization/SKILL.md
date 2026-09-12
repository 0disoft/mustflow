---
mustflow_doc: skill.sui-move-storage-optimization
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-move-storage-optimization
description: Measure and optimize Sui Move object storage, dynamic collection cleanup, BCS representation and execution gas costs.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-move-storage-optimization
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Move Storage and Gas Optimization

<!-- mustflow-section: purpose -->
## Purpose

Measure and optimize Sui Move object storage, dynamic collection cleanup, BCS representation and execution gas costs. Produce comparable gas breakdown and lifecycle evidence.

<!-- mustflow-section: use-when -->
## Use When

- Measure and optimize Sui Move object storage, dynamic collection cleanup, BCS representation and execution gas costs.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Gas coin pool allocation or SDK submission scheduling alone; use sui-gas-concurrency-review.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Representative create/update/settle/delete workloads, allowed cardinality bounds, serialized sizes, gas effects and conservation rules.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://docs.sui.io/develop/transaction-payment/gas-in-sui
- https://docs.sui.io/develop/objects/dynamic-fields
- https://move-book.com/programmability/bcs
- https://docs.sui.io/references/framework/sui_sui/balance

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Measured object layout and cleanup paths, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Capture a baseline for normal and supported worst-case inputs under comparable compiler, protocol and gas conditions. Separate computation, storage charge and rebate from gross budget. Bucketed computation can erase micro-optimization savings; lower gasBudget is not a fee discount.

2. Separate frequently used small fields from sparse large data using measured access patterns. Dynamic fields have costs and do not remove parent mutation contention. Keep bounded per-transaction work and an explicit key inventory for cleanup or migration.

3. Use Balance<T> for internal funds when independent Coin<T> identity is unnecessary, converting at actual transfer boundaries. Measure object churn; never replace backed typed assets with unchecked u64 bookkeeping to claim savings.

4. Measure BCS bytes rather than assuming Solidity slots or C alignment. Shorter field names and reordered fields do not shrink serialized values; deployed layout changes have compatibility consequences. Prefer canonical address/hash values over text encodings and check wider arithmetic before narrowing stored integers.

5. Keep state required for the next authorization or settlement onchain. Put searchable history in events and an indexer only when the contract need not read it later. Events do not replace used-nonce state; a content hash does not provide offchain data availability.

6. Remove dynamic entries and settle their assets before destroying the parent. Parent UID deletion does not recursively clean children. Use empty-container checks and bounded multi-transaction closure where needed; define interruption behavior and prevent new writes during final cleanup.

7. Evaluate PTB intermediate values to avoid unnecessary persistent objects, preserving atomicity and acceptable failure scope. Report throughput separately from fee savings, and route shared-write topology or gas funding concurrency to their dedicated skills.

<!-- mustflow-section: postconditions -->
## Postconditions

- Comparable gas breakdown and lifecycle evidence identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Compare like-for-like gas components and serialized sizes; test maximum cardinality, partial cleanup/restart, nonempty destruction rejection and conservation after optimization.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If only unit-test execution gas is available, label it a relative proxy, not an onchain total fee. Reject apparent savings that omit cleanup, reduce supported ranges silently or drop replay protection.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Comparable gas breakdown and lifecycle evidence
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
