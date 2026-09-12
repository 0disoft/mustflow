---
mustflow_doc: skill.sui-sdk-migration-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-sdk-migration-review
description: Review Sui SDK and dApp Kit upgrades, JSON-RPC replacement, response semantics, persisted signed transactions, and single-writer rollout.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-sdk-migration-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui SDK Migration Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui SDK and dApp Kit upgrades, JSON-RPC replacement, response semantics, persisted signed transactions, and single-writer rollout.

<!-- mustflow-section: use-when -->
## Use When

A repository upgrades @mysten/sui or dApp Kit, removes deprecated Sui clients/APIs, or moves stored operations and cursors across SDK generations.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

Use dependency-upgrade-review for unrelated packages. Use sui-data-access-review for a new read adapter without migration. Do not use an old protocol's shutdown date from a prior note as current provider evidence.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Manifest and lockfile, minimum supported SDK/runtime, imports and adapters, official migration/release notes, provider support, saved operation/cursor schema, contract fixtures and rollout ownership.

Refresh version-sensitive details against the installed SDK and target network before using API examples or capability claims. Starting references: [SDK v2 migration](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/sui), [JSON-RPC migration](https://sdk.mystenlabs.com/sui/migrations/sui-2.0/json-rpc-migration), [dApp Kit](https://sdk.mystenlabs.com/dapp-kit).

<!-- mustflow-section: preconditions -->
## Preconditions

The target is a Sui integration and the requested scope matches this procedure. Read the target repository's command contract. Use synthetic/redacted fixtures for review; this skill does not authorize live signing, asset movement, key access or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change only the relevant application adapters, policy, builder or consumer logic, focused fixtures/tests, and documentation requested by the task. Preserve existing authority and secret boundaries; supporting skills do not grant command permissions.

<!-- mustflow-section: procedure -->
## Procedure

1. Record the currently installed and target versions, Node/ESM/toolchain needs, provider protocol availability and features actually used. Consult current official migration notes. A major range alone is not reproducibility or proof that every release in the range provides a later API.

2. Keep stable updates eligible through reviewed lockfile changes and promote the tested artifact. Follow repository dependency policy; do not permanently freeze an obsolete version or fetch fresh dependencies at service startup. Treat experimental API compatibility separately.

3. Inventory imports, constructors, execution arguments, include/read-mask settings, pagination and dApp Kit integration. Migrate through narrow application-owned submission/read/result adapters instead of a blanket rename or an SDK-sized wrapper.

4. Test meaning, not just field existence: returned FailedTransaction, success status, string/bigint amounts, partial object errors, absent optional fields, nullable gasObject in supported gas modes, total versus component balances and cursor continuation. Keep raw BCS variants separate from Core API response types.

5. Version persisted business requests, builder provenance, chain binding and provider/query cursors. Unsigned requests may use a new builder; preserve already signed bytes and signatures exactly. Do not deserialize and reserialize them as a migration, and do not move opaque cursors across incompatible providers without a replay boundary.

6. Compare old and new reads at the same object version/checkpoint where possible. Keep one writer per rollout scope and disjoint reserved assets; never shadow a payout by having both versions build/sign/submit it. Reconcile outstanding old submissions before ownership transfer.

7. Make rollback govern future construction and readers, not pretend to reverse chain effects. Keep recovery of original submissions alive and ensure fallback endpoints still support the needed protocol. Track business success, unknown-outcome age, object conflicts and replay lag during rollout.

<!-- mustflow-section: postconditions -->
## Postconditions

Use saved responses and fake transports for response loss after acceptance, changed operation payload, FailedTransaction, null gas object, large integer amounts and empty-page continuation. Run live testnet checks only if separately in scope and configured.

Distinguish inspected code, mocked behavior, simulation and live-chain evidence. Do not report a stronger result than the observed evidence supports.

<!-- mustflow-section: verification -->
## Verification

Use the target repository's configured `test_related` and `build` intents when they cover the changed boundary. For mustflow-native skill/template changes, use configured `mustflow_check`. Run only eligible one-shot intents; these names are references, not permission to execute an unconfigured command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If response meaning, saved signatures or cursor compatibility cannot be preserved, block the affected rollout slice and report the missing contract. Do not 'repair' outstanding signed bytes or fall back to a retired protocol.

<!-- mustflow-section: output-format -->
## Output Format

Report installed/target versions, semantic migration map, persisted-data compatibility, tests, single-writer ownership, recovery continuity and rollback limits.
