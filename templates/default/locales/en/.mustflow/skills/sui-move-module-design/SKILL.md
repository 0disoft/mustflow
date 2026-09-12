---
mustflow_doc: skill.sui-move-module-design
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-move-module-design
description: Design Sui Move module invariants, package boundaries, public composable APIs and typed extension interfaces.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-move-module-design
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Move Module and Package Design

<!-- mustflow-section: purpose -->
## Purpose

Design Sui Move module invariants, package boundaries, public composable APIs and typed extension interfaces. Produce invariant ownership and public api map.

<!-- mustflow-section: use-when -->
## Use When

- Design Sui Move module invariants, package boundaries, public composable APIs and typed extension interfaces.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- A deployed package upgrade without structural redesign; use sui-move-upgrade-review.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Module graph, published type origins, public callers, invariant definitions, extension APIs and package upgrade authorities.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://docs.sui.io/develop/write-move/move-best-practices
- https://move-book.com/move-basics/module
- https://move-book.com/programmability/hot-potato-pattern/

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Invariant-owning modules and package APIs, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Assign each invariant to its defining module, then enumerate all constructors, destructors and mutation methods that can affect it. public(package) does not grant direct access to another module's private fields.

2. Expose business transitions such as reserve, settle and cancel instead of independent balance/status setters. Prove each exposed operation preserves the invariant under caller-selected ordering.

3. Keep packages aligned with deployment authority, dependency adoption and upgrade cadence. Prefer modules within a package until a concrete authority or compatibility boundary justifies another package.

4. Separate durable asset type identity from the package ID used for function calls. Record the originating package for types introduced in different versions; a fresh independent publication is not an upgrade of the existing asset.

5. Return assets and change when composition is intended; put mandatory fees, eligibility and obligations inside the Move boundary. Do not rely on a frontend's final transfer or call order to enforce settlement. Link to sui-move-resource-review for no-ability receipts.

6. Expose narrow typed extension operations instead of generic mutable UID or Balance access. A store ability does not certify a trusted plugin; bind extension authority to explicit targets and policies.

7. Document which public and entry callers are real compatibility commitments, including error and event consumers. Keep stable roots and versioned extension values only where change is expected; route deployed layout changes through sui-move-upgrade-review.

<!-- mustflow-section: postconditions -->
## Postconditions

- Invariant ownership and public API map identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Exercise adversarial composition across module APIs, unauthorized extension keys, and normal purchase/cancel flows; inspect dependency direction and published caller compatibility.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If a split requires changing deployed identity or publishing a new package, deliver a concrete transition proposal within scope rather than treating it as a file move.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Invariant ownership and public API map
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
