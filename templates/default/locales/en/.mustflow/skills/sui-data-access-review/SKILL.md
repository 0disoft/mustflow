---
mustflow_doc: skill.sui-data-access-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-data-access-review
description: Review Sui Core API, gRPC and GraphQL object queries, BCS type identity, coin balances, dynamic fields, pagination and reader freshness.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-data-access-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui Data Access Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui Core API, gRPC and GraphQL object queries, BCS type identity, coin balances, dynamic fields, pagination and reader freshness.

<!-- mustflow-section: use-when -->
## Use When

A Sui integration queries objects, balances, dynamic fields, transaction history or relationship data, or chooses a client and cache policy for those reads.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

Use sui-gas-concurrency-review for spendable input reservations. Use sui-rpc-resilience-review for transport failures and subscription gap recovery. Generic GraphQL without Sui data is outside this skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Installed client types, endpoint and chain identity, query shapes, full Move types, requested includes/read masks, cursors, BCS schemas, provider retention and freshness requirements.

Refresh version-sensitive details against the installed SDK and target network before using API examples or capability claims. Starting references: [Core API](https://sdk.mystenlabs.com/sui/clients/core), [Querying data](https://sdk.mystenlabs.com/sui/clients/querying), [GraphQL client](https://sdk.mystenlabs.com/sui/clients/graphql).

<!-- mustflow-section: preconditions -->
## Preconditions

The target is a Sui integration and the requested scope matches this procedure. Read the target repository's command contract. Use synthetic/redacted fixtures for review; this skill does not authorize live signing, asset movement, key access or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change only the relevant application adapters, policy, builder or consumer logic, focused fixtures/tests, and documentation requested by the task. Preserve existing authority and secret boundaries; supporting skills do not grant command permissions.

<!-- mustflow-section: procedure -->
## Procedure

1. Choose by supported capabilities and query shape, not a rule that gRPC only executes and GraphQL only reads. Inject ClientWithCoreApi and use client.core for portable library features; require a concrete client only for its specific APIs. Confirm actual transport and provider history retention.

2. Read known IDs directly, batch and deduplicate known sets, and filter owned objects by full Move type. Request only needed include fields or raw gRPC readMask paths. Respect batch-mask semantics and avoid re-fetching content already returned by a list query.

3. Preserve input/result correspondence for getObjects item errors and inspect GraphQL data together with errors. Distinguish omitted fields, absent values and failed reads; never turn an unknown balance into zero or silently drop an asset from a total.

4. Continue using the endpoint's next-page flag even when a filtered page is empty. Separate collection cursor pagination from history after/before cursors; preserve chain, owner, type and query scope. Reject missing or repeated continuation cursors, and bound pages, bytes and in-flight work.

5. Identify assets by chain and full coin type, not symbol. Keep exact integer amounts and distinguish coinBalance, addressBalance and total balance using the installed response contract. Missing metadata must not invent decimals or imply zero holdings.

6. Separate Move content BCS from full objectBcs. Check complete Move type including phantom arguments before parsing; matching binary layout is not asset identity. For a known dynamic-field name, use its Move type plus BCS key directly, and distinguish field wrapper ID from dynamic child object ID.

7. Cache versioned bodies separately from current owner/field lists, with chain, object version and projection in the key. Verify visibility on the next read endpoint after execution. For consistent paginated snapshots, respect checkpoint retention and restart an expired scan rather than combine two snapshots.

<!-- mustflow-section: postconditions -->
## Postconditions

Cover an empty page with continuation, repeated cursor, one failed batch item, partial GraphQL errors, same BCS layout with a different coin type, address-balance-only funds and snapshot expiry.

Distinguish inspected code, mocked behavior, simulation and live-chain evidence. Do not report a stronger result than the observed evidence supports.

<!-- mustflow-section: verification -->
## Verification

Use the target repository's configured `test_related` and `build` intents when they cover the changed boundary. For mustflow-native skill/template changes, use configured `mustflow_check`. Run only eligible one-shot intents; these names are references, not permission to execute an unconfigured command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

Return explicit incomplete or unavailable data when proof is missing. Retry only eligible reads through the bounded transport policy; do not use incomplete asset data for authorization, settlement or a new payment.

<!-- mustflow-section: output-format -->
## Output Format

Report client capability choice, field/query budget, typed asset identity, per-item errors, pagination completeness, cache scope and observed reader freshness.
