---
mustflow_doc: skill.sui-move-resource-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-move-resource-review
description: Review Sui Move resource ownership, copy/drop/store/key abilities, phantom types and hot-potato obligations.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-move-resource-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Move Resource and Ability Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui Move resource ownership, copy/drop/store/key abilities, phantom types and hot-potato obligations. Produce ability matrix and resource destinations.

<!-- mustflow-section: use-when -->
## Use When

- Review Sui Move resource ownership, copy/drop/store/key abilities, phantom types and hot-potato obligations.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- SDK transaction construction alone; use sui-ptb-composition-review.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Move.toml, compiler/framework resolution, resource declarations, mint/burn/transfer APIs and required settlement invariants.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://move-book.com/reference/abilities/
- https://move-book.com/reference/generics
- https://docs.sui.io/references/framework/sui_sui/transfer

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Resource declarations and consuming APIs, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Identify the Move dialect and deployed type origins first. For every asset, trace construction, local moves, borrowed access, consumption and final onchain destination; moving a variable does not itself transfer an object.

2. Build an ability matrix from required behavior. copy permits value duplication; drop permits discarding without a settlement hook; store permits nesting and enables Sui public transfer for key objects. key requires store on fields, not automatically on the outer type. Sui objects require a first id: UID field; the UID prevents copy/drop.

3. Inspect defining-module constructors and destructors. A non-copy resource can still be issued without limit by an unguarded constructor; a non-drop value can still be explicitly unpacked and consumed. A borrowed capability may be reused, so non-copy is not one-use authorization.

4. Reduce parameters to the needed T, &T or &mut T access. References can be copied without copying the underlying resource; field privacy still belongs to the defining module. Do not export mutable asset references merely for convenience.

5. Review each generic instantiation and phantom position. Preserve full asset type identity while avoiding unnecessary ability constraints. Phantom distinguishes assets but does not approve arbitrary payment types.

6. For custom transfer rules, trace all public transfer, freeze and sharing paths available through abilities. Treat a freezeable capability accepted through &Cap as a possible authority exposure, then prove the actual usable path.

7. For a same-transaction obligation, use a no-ability receipt whose every consuming function checks original target, asset type, principal and fee. Reject discard helpers or alternate settlement targets. Keep ordinary stored claims distinct from hot potatoes.

<!-- mustflow-section: postconditions -->
## Postconditions

- Ability matrix and resource destinations identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Compile permitted and forbidden ability examples at the correct layer; exercise unguarded issuance, alternate consumers, cross-asset settlement and unused obligations.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

Do not add abilities just to silence the compiler. If the type is deployed, route layout or ability changes through sui-move-upgrade-review before implementation.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Ability matrix and resource destinations
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
