# Active Run Lock Scopes v1

This specification defines how Mustflow coordinates command effects when several processes, agent sessions, or Git worktrees operate concurrently.

## Goals

The lock model must preserve existing checkout-local behavior while allowing a command contract to state that a resource is shared by every worktree of one Git repository or by unrelated repositories on the same host account. A command that needs several scopes must either acquire every required lease or acquire none.

This specification governs Mustflow-managed active run locks. It does not authorize direct shell commands, replace operating-system permissions, or make external databases and cloud services transactional.

## Scope Values

Every normalized command effect has one of these scopes.

`worktree` coordinates processes that use the same Mustflow root. It is the default and preserves the behavior of contracts that predate this specification.

`repository` coordinates linked Git worktrees through their shared Git common directory. It is appropriate for refs, repository-wide caches, shared package stores located under the Git administration boundary, and other resources that are shared by worktrees of one repository.

`host` coordinates unrelated Mustflow roots running as the same operating-system account. It is appropriate for explicitly named ports, local services, GPU allocations, device access, or other host-local resources whose identity is not meaningful as a repository-relative path.

## Command Contract Syntax

A scope may be declared directly on an effect.

```toml
[intents.build]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Build the repository."
argv = ["bun", "run", "build"]
cwd = "."
timeout_seconds = 600
stdin = "closed"
success_exit_codes = [0]
writes = ["dist/**"]
network = false
destructive = false
effects = [
  { type = "write", mode = "delete_recreate", path = "dist/**", scope = "worktree", concurrency = "exclusive" },
  { type = "write", mode = "replace", lock = "shared_build_cache", scope = "repository", concurrency = "exclusive" },
]
```

A named resource may provide the scope for every effect that references it.

```toml
[resources.dev_port_4321]
type = "port"
scope = "host"
concurrency = "exclusive"
description = "Local development port 4321."

[intents.preview_probe]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Probe a short-lived preview process."
argv = ["node", "scripts/preview-probe.mjs"]
cwd = "."
timeout_seconds = 30
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
effects = [
  { type = "write", mode = "write", lock = "dev_port_4321", concurrency = "exclusive" },
]
```

An effect-level scope and its referenced resource scope must match. A mismatch is invalid and fails before command execution. Missing scope values default to `worktree`.

The legacy `writes` field always produces conservative `worktree` effects. Contracts that need a broader scope must use explicit `effects`.

A `host` effect must use an explicit named lock. Repository-relative paths from unrelated roots are not a stable host resource identity, so Mustflow does not infer host conflicts from path overlap.

## Canonical Lock Identity

Mustflow qualifies non-worktree lock names internally so equal text in different scopes cannot collide.

```text
worktree:   build_output
repository: mustflow-scope:repository:build_output
host:       mustflow-scope:host:build_output
```

Contract authors must not declare lock names beginning with `mustflow-scope:`. The prefix is reserved for normalized lock identity.

Within `worktree` and `repository` scopes, overlapping normalized path expressions still conflict even when their named locks differ. Within `host`, the explicit named lock is authoritative.

## Storage Roots

Worktree leases remain under the existing root.

```text
<worktree>/.mustflow/state/locks
```

Repository leases are stored below the Git common directory shared by linked worktrees.

```text
<git-common-dir>/mustflow/active-run-locks
```

A repository-scoped effect requires a valid Git repository. Mustflow must fail closed when the Git marker, gitdir pointer, or commondir pointer is missing, malformed, too large, not a directory, or cannot be resolved safely.

Host leases use a versioned, account-specific directory below the operating-system temporary directory.

```text
<tmp>/mustflow/active-run-locks/v1/<owner-hash>
```

The owner hash separates operating-system accounts without exposing the raw username or home directory in the lock path. Host scope coordinates processes for the same account, not every user on a multi-user machine.

## Acquisition and Release

A command may declare effects in several scopes. Mustflow resolves every required storage root before writing any lease and acquires scope mutexes in this fixed order.

```text
host → repository → worktree
```

The fixed order prevents two mixed-scope commands from deadlocking by acquiring the same roots in opposite orders.

While all required mutexes are held, Mustflow removes stale records, checks conflicts in each scope, and writes one scope-specific record with a shared run ID and owner token. If any scope conflicts or any record write fails, Mustflow must not leave a partial lease in another scope.

Release validates both run ID and owner token before deleting each scope-specific record. A stale or replaced file must never be deleted by an old handle.

## Process Identity and Stale Recovery

Scope does not weaken stale-owner detection. Each current record binds its process ID to a process-start token. A record may be reclaimed only when the process is not live or the observed process-start token proves that the PID has been reused.

Each scope root has its own mutex and recovery directory. A live mutex owner must not be displaced merely because the mutex is old.

## Compatibility

Active lock record schema version 3 adds the required effect `scope` field. Readers continue to accept record schema versions 1 and 2 and interpret every legacy effect as `worktree`.

The `mf api locks --json` report aggregates visible worktree, repository, and host records. Its existing top-level `lock_root` field remains `.mustflow/state/locks` for schema compatibility; the `scope` field on each effect is the authoritative storage and conflict boundary.

The existing run-state update mutex remains worktree-local. Receipt, profile, and performance-history serialization are separate state concerns and are not broadened by this specification.

## Required Verification

An implementation of this specification must cover at least these cases.

1. Equal worktree lock names in unrelated roots do not conflict.
2. Equal repository lock names in linked worktrees do conflict.
3. Equal host lock names in unrelated roots for the same account do conflict.
4. A mixed-scope conflict leaves no narrower-scope record behind.
5. Resource scope inheritance works and mismatches fail closed.
6. Repository scope outside Git fails closed.
7. Public lock reports include effect scope and satisfy the published JSON schema.
8. Legacy version 1 and version 2 records remain readable as worktree records.
