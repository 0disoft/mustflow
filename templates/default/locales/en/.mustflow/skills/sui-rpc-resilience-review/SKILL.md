---
mustflow_doc: skill.sui-rpc-resilience-review
locale: en
canonical: true
revision: 1
lifecycle: mustflow-owned
authority: procedure
name: sui-rpc-resilience-review
description: Review Sui RPC provider failover, gRPC deadlines and cancellation, request budgets, and durable subscription gap recovery.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.sui-rpc-resilience-review
  command_intents:
    - build
    - test_related
    - mustflow_check
---

# Sui RPC Resilience Review

<!-- mustflow-section: purpose -->
## Purpose

Review Sui RPC provider failover, gRPC deadlines and cancellation, request budgets, and durable subscription gap recovery.

<!-- mustflow-section: use-when -->
## Use When

A Sui service changes provider failover, rate limiting, request cancellation, historical replay or reconnecting transaction/event/checkpoint consumers.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

Use sui-execution-recovery-review for whether an uncertain submitted operation may be retransmitted or rebuilt. Use sui-data-access-review for static query semantics. A generic HTTP service without Sui chain/provider state is outside this skill.

<!-- mustflow-section: required-inputs -->
## Required Inputs

Provider chain/capability/retention contracts, actual transport, retry owner, quota scope, operation deadline, SDK cancellation support, durable cursors and replay/consumer transaction boundaries.

Refresh version-sensitive details against the installed SDK and target network before using API examples or capability claims. Starting references: [gRPC client and streams](https://sdk.mystenlabs.com/sui/clients/grpc), [gRPC status codes](https://grpc.io/docs/guides/status-codes/), [gRPC deadlines](https://grpc.io/docs/guides/deadlines/).

<!-- mustflow-section: preconditions -->
## Preconditions

The target is a Sui integration and the requested scope matches this procedure. Read the target repository's command contract. Use synthetic/redacted fixtures for review; this skill does not authorize live signing, asset movement, key access or deployment.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

Change only the relevant application adapters, policy, builder or consumer logic, focused fixtures/tests, and documentation requested by the task. Preserve existing authority and secret boundaries; supporting skills do not grant command permissions.

<!-- mustflow-section: procedure -->
## Procedure

1. Health-check chain identity, supported methods, checkpoint progress, latency and archive retention, not HTTP success alone. Choose independent providers where needed and keep credentials out of diagnostics. Failover must not silently change chain or reinterpret historical not-found as transaction failure.

2. Bound request rate, active calls, queued work and queue age separately, across the provider's real account/API-key quota. Reserve capacity for submitted-transaction reconciliation. Put retries in one layer so SDK, transport and job retries do not multiply.

3. Propagate one end-to-end deadline through queueing and network stages. Use Core API signal or raw gRPC call abort only where the installed signature supports it; do not invent build cancellation options. Promise.race without abort leaves the underlying request running.

4. Classify gRPC status separately from HTTP and Move/business failure. Use bounded jittered backoff and provider retry hints for eligible transient failures; distinguish quota exhaustion from brief throttling. Authorization and invalid arguments need correction, and deadline exceeded after submission needs digest reconciliation.

5. On subscription reconnect, obtain the new stream's starting watermark, durably buffer live frames within a size limit, and replay from the last committed position to that boundary. Progress-only frames matter. In supported raw APIs, SCAN_LIMIT is not completion and an indexed LEDGER_TIP below the target is not CURSOR_BOUND.

6. Handle checkpoint sequence positions separately from opaque transaction/event cursors. Deduplicate by a chain-scoped event identity and commit business effects with consumer progress. Advance only the contiguous processed position, not the highest cursor seen by parallel workers.

7. If replay exceeds retention, the live buffer fills, or a continuation cursor is invalid, stop claiming a complete stream. Recover from an archival/snapshot strategy with an explicit gap record. Do not drop the gap merely to reconnect successfully.

<!-- mustflow-section: postconditions -->
## Postconditions

Inject 429/quota responses, UNAVAILABLE, queue deadline expiry, real transport abort, chain mismatch, index lag during replay, duplicate frames, progress-only frames and buffer exhaustion.

Distinguish inspected code, mocked behavior, simulation and live-chain evidence. Do not report a stronger result than the observed evidence supports.

<!-- mustflow-section: verification -->
## Verification

Use the target repository's configured `test_related` and `build` intents when they cover the changed boundary. For mustflow-native skill/template changes, use configured `mustflow_check`. Run only eligible one-shot intents; these names are references, not permission to execute an unconfigured command.

<!-- mustflow-section: failure-handling -->
## Failure Handling

Surface degraded completeness and preserve durable replay boundaries. Transport cancellation does not undo an onchain submission; send that uncertainty to sui-execution-recovery-review.

<!-- mustflow-section: output-format -->
## Output Format

Report provider health evidence, shared request budget, retry/deadline ownership, actual cancellation, durable replay range and any unclosed gap.
