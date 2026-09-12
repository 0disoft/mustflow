---
mustflow_doc: skill.sui-gas-concurrency-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-gas-concurrency-review
description: Review Sui gas coin selection, address balances, coin splitting and smashing, object reservations, and executor concurrency.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-gas-concurrency-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Gas and Object Concurrency Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui gas coin selection, address balances, coin splitting and smashing, object reservations, and executor concurrency.

<!-- mustflow-section: use-when -->
## Use When

Sui payments or workers select and reuse gas/funding assets, handle stale object versions, or change SerialTransactionExecutor or ParallelTransactionExecutor ownership.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

Use sui-data-access-review for displaying balances without selecting spendable inputs. Use sui-execution-recovery-review for unknown submitted transactions. Do not impose wallet-wide serialization when immutable or disjoint inputs are proven independent.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Chain capabilities, gas mode, coin and address balances, worker/sourceCoins ownership, input references, reservation store, gas budgets, executor lifecycle, and effects from successful and failed executions.

Refresh version-sensitive details against the installed SDK and target network before using API examples or capability claims. Starting references: [Coins and balances](https://sdk.mystenlabs.com/sui/transactions/coins-and-balances), [Gas smashing](https://docs.sui.io/develop/transaction-payment/gas-smashing), [Executors](https://sdk.mystenlabs.com/sui/executors).

<!-- mustflow-section: preconditions -->
## Preconditions

The target is a Sui integration and the requested scope matches this procedure. Read the target repository's command contract. Use synthetic/redacted fixtures for review; this skill does not authorize live signing, asset movement, key access or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change only the relevant application adapters, policy, builder or consumer logic, focused fixtures/tests, and documentation requested by the task. Preserve existing authority and secret boundaries; supporting skills do not grant command permissions.

<!-- mustflow-section: procedure -->
## Procedure

1. Distinguish Coin<T> inventory, address balance, total balance and funds reserved by other operations. Consider supported tx.coin/tx.balance resolution before full-wallet scans. Gate address-balance and gasless features by the installed SDK and target network; total SUI is not proof that the chosen gas source is funded.

2. In coin gas mode, keep explicit gas payment objects disjoint from ordinary object inputs. Refer to the chosen gas coin through tx.gas when appropriate. For sponsor-funded gas, separate customer payment assets and hand authority checks to sui-wallet-signing-review.

3. Reserve spending plus the required upfront gas budget using exact integers. Do not count an expected storage rebate as initial funding or force an estimate below an allowed cap merely to submit it. Paginate manual coin selection and bound its inputs; move wallet-wide consolidation out of the payment path.

4. Process gas and object effects after both chain success and chain failure. Gas smashing can merge/delete gas objects even when PTB business commands fail, so reusing the old gas list is unsafe. Distinguish gas processing from a normal mergeCoins command inside the atomic PTB.

5. Schedule by mutable input dependencies and asset ownership, not merely by wallet address or Promise concurrency. A serial executor is a useful starting point for one dedicated writer; parallel execution requires independent asset sets or coordinated reservations. An executor instance is not a multi-process lock.

6. Give sourceCoins and gas pools explicit owners, including manual wallet operations and pool refill transactions. Reserve before signing and fence stale workers. A lease timeout cannot invalidate a signed transaction; quarantine unresolved reservations until outcome or safe expiry is established.

7. Refresh references from trustworthy effects or the appropriate client; never infer object version increments. Address-balance gas may remove gas-coin conflicts but not shared mutable business-state contention. Split hot state only where business invariants allow independent writes.

<!-- mustflow-section: postconditions -->
## Postconditions

Exercise overlapping sourceCoins, worker takeover with an outstanding signature, failed-PTB gas smashing, insufficient upfront budget, address-balance-only funds and disjoint-input parallel work.

Distinguish inspected code, mocked behavior, simulation and live-chain evidence. Do not report a stronger result than the observed evidence supports.

<!-- mustflow-section: verification -->
## Verification

Use the target repository's configured `test_related` and `build` intents when they cover the changed boundary. For mustflow-native skill/template changes, use configured `mustflow_check`. Run only eligible one-shot intents; these names are references, not permission to execute an unconfigured command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If ownership or a reservation's prior signed outcome is uncertain, quarantine the affected assets and reconcile through sui-execution-recovery-review. Do not assign them to a new writer on TTL alone.

<!-- mustflow-section: output-format -->
## Output Format

Report gas mode and capability evidence, spend/reservation accounting, input conflicts, executor ownership, failed-effects handling and remaining contention.
