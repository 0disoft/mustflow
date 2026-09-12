---
mustflow_doc: skill.sui-move-upgrade-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-move-upgrade-review
description: Review Sui Move package upgrade compatibility, type origins, old-version access and resumable asset migration.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-move-upgrade-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Move Package Upgrade Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui Move package upgrade compatibility, type origins, old-version access and resumable asset migration. Produce compatibility matrix and bounded migration plan.

<!-- mustflow-section: use-when -->
## Use When

- Review Sui Move package upgrade compatibility, type origins, old-version access and resumable asset migration.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- TypeScript SDK upgrades alone; use sui-sdk-migration-review. Aptos-only upgrades require its own runtime rules.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Published V1 artifacts, candidate source/compiler/dependency resolution, type origins, real callers, UpgradeCap policy and lived-in object states.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://docs.sui.io/develop/publish-upgrade-packages/upgrade
- https://docs.sui.io/develop/publish-upgrade-packages/versioning
- https://move-book.com/guides/upgradeability-practices

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Upgrade compatibility and state migration contracts, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Separate compiler compatibility, economic semantics and caller behavior. Inventory used entry functions even when not public, amounts/units, rounding, errors and events. Preserve existing meanings or introduce an explicit versioned API.

2. Compare against the published package with the selected compiler and policy. Sui existing public signatures and struct layouts/abilities are constrained; non-public entry signatures can change yet break real callers. Do not import Aptos compatibility rules.

3. Record call package IDs separately from type origins, object versions and application schema versions. Do not rewrite all type strings to the latest package ID. Capture exact source, compiler, resolved dependencies and artifact digest; stable dependency updates require deliberate tested adoption into published code.

4. Identify every old-code route into sensitive state. Old packages remain callable and init does not rerun on upgrade. Version gates only constrain paths whose old implementation already checks that state; V2-only checks do not repair V1. If absent, evaluate existing pause/revocation or an explicit asset transition without claiming universal closure.

5. Preserve a stable root and migrate extension values where supported. Do not assume adding a version field permits arbitrary deployed layout edits or that an old UID can be repacked into a fresh root. Account for owned objects that migration authority cannot access.

6. Specify migration states, permitted mixed-version operations, bounded batches, durable progress and repeat behavior. Preserve beneficiary, balances, locks, refunds and consumed entitlements. Make restart and repeated migration safe; completion requires rights conservation, not just copied fields.

7. Review UpgradeCap separately from treasury and routine authority. Confirm irreversible policy tightening and the remaining repair path. Rehearse V1 with outstanding orders through migration, direct V1 calls and V2 usage; distinguish client rollback from reversing onchain migration.

<!-- mustflow-section: postconditions -->
## Postconditions

- Compatibility matrix and bounded migration plan identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Check published compatibility and old/new caller semantics; exercise interrupted/repeated migration and old-state objects with balances, used benefits and pending refunds.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

When old code cannot be gated, state the exact exposed population and transition limits. Produce a reviewable plan; do not publish, sign, migrate or make policies immutable without separate task authorization.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Compatibility matrix and bounded migration plan
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
