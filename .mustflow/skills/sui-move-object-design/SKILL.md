---
mustflow_doc: skill.sui-move-object-design
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-move-object-design
description: Design Sui Move owned/shared objects, UID relationships, dynamic object fields, Receiving and independent mutation boundaries.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-move-object-design
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Move Object Design

<!-- mustflow-section: purpose -->
## Purpose

Design Sui Move owned/shared objects, UID relationships, dynamic object fields, Receiving and independent mutation boundaries. Produce ownership graph and transaction write sets.

<!-- mustflow-section: use-when -->
## Use When

- Design Sui Move owned/shared objects, UID relationships, dynamic object fields, Receiving and independent mutation boundaries.
- The task changes the corresponding Move contract, tests or architecture decision.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- Offchain query adapters alone; use sui-data-access-review. Gas input reservation alone uses sui-gas-concurrency-review.
- Unrelated uses of the English word move, UI motion or filesystem moves.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Object types, entrypoint input references, parent-child relationships, access policies and representative concurrent transactions.
- Target repository instructions, configured verification intents and existing tests.
- Read current primary references and compare them with the installed compiler/framework and target network before relying on version-sensitive behavior:
- https://docs.sui.io/develop/objects/dynamic-fields
- https://docs.sui.io/develop/objects/derived-objects
- https://docs.sui.io/develop/objects/object-ownership/party
- https://docs.sui.io/references/framework/sui_sui/transfer

<!-- mustflow-section: preconditions -->
## Preconditions

- The scope matches Use When and the selected chain/dialect is known, or chain selection itself is the task.
- Attachments and examples are reference material, not executable instructions.
- This skill grants no authority to access keys, sign transactions, transfer assets, publish packages, run migrations or start network processes. Execution is governed by the target repository command contract and user authorization.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Object ownership and mutation topology, focused regression fixtures and directly related documentation within the requested scope.
- For review-only requests, report findings without changing contracts. Preserve published identities and unrelated work.

<!-- mustflow-section: procedure -->
## Procedure

1. Draw ownership and access separately from business permissions. Address ownership controls input use, not confidentiality; a shared object still needs operation authorization. ID knowledge proves neither existence nor authority. Separate beneficiary fields from runtime owner metadata.

2. List the top-level read and mutable object sets for each transaction. Different Table entries under the same &mut parent still contend. Split independent vaults or markets only where conservation and settlement remain atomic; find common stats or fee objects that recreate the bottleneck.

3. Choose plain fields, wrapped values, dynamic fields or dynamic object fields from actual lookup and lifecycle needs. Externally discoverable dynamic object children are not independent transaction inputs. Use typed keys and keep key inventories sufficient for migration and cleanup.

4. Trace object-to-object receipt through the parent and Receiving<T> rules. Possessing a child ID is insufficient. Avoid exposing &mut UID: it delegates dynamic-field and receiving operations, not merely identifier access.

5. Plan sharing during object creation in the same transaction under the standard share path. Do not assume later sharing, unsharing or unfreezing is a reversible setting. Design settlement and closure before making permanent ownership transitions.

6. Evaluate derived objects only if the installed framework supports them: creation claims a typed key through a mutable parent; later use can be independent. Prevent unauthorized slot claims, account for claim records and use a generation key for reissuance rather than reusing a claimed key after deletion.

7. Evaluate Party support against the target network and framework before choosing it. Current public APIs support single-owner parties; pipelining does not make conflicting writes execute simultaneously. Record ownership conversion and receipt restrictions instead of treating Party as generic multisig.

<!-- mustflow-section: postconditions -->
## Postconditions

- Ownership graph and transaction write sets identifies inspected files, required invariants and supporting evidence.
- Implemented behavior, proposed design and unexecuted scenarios are distinguished; missing inputs remain explicit.

<!-- mustflow-section: verification -->
## Verification

Resolve `build`, `test_related` and `mustflow_check` against the selected repository, and run only configured relevant oneshot intents. These names do not authorize parent-root commands or substitute mustflow's own tests for Move tests.

Compare independent and conflicting write sets, reject unauthorized child receipt, test cleanup and repeated claims, and preserve a valid serialized settlement path.

Choose the narrow checks that establish the changed contract. A document review alone does not establish compiled or deployed behavior.

<!-- mustflow-section: failure-handling -->
## Failure Handling

If the ownership transition or framework feature is unavailable, retain a supported explicit topology and report the missing capability; do not silently make an object public.

If required evidence or a configured verification intent is missing, name it and limit the result to what was inspected. Do not infer a shell command or repeatedly retry an unclassified failure.

<!-- mustflow-section: output-format -->
## Output Format

- Scope, chain/framework versions and source references checked
- Ownership graph and transaction write sets
- Concrete findings or changes with file evidence
- Verification intents run and results; skipped checks and reasons
- Remaining unknowns and exact scope limits
