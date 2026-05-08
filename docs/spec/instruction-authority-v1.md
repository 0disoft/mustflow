# Instruction Authority v1

This specification defines how mustflow resolves effective workflow rules when
multiple instruction sources are present.

## Scope

This document applies to repository-local mustflow behavior. It does not define
global model safety, host approval policy, or a user task goal.

## Authority Lanes

Rules are resolved by lane. A lower lane does not override a higher or stricter
lane.

1. Current user instructions define the task goal unless unsafe.
2. Host safety, sandbox, approval, and execution gates remain binding.
3. Repository workflow rules come from the nearest [AGENTS.md](../../AGENTS.md)
   and `.mustflow/config/*.toml`.
4. Command execution rules come from
   [.mustflow/config/commands.toml](../../.mustflow/config/commands.toml).
5. Verification evidence comes from current files and `mf run` receipts.
6. Context, preferences, generated maps, caches, and summaries are lower
   authority inputs.

## Merge Rules

When multiple sources contribute compatible rules:

- Allowed action sets are intersected.
- Denied actions are unioned.
- Approval requirements are unioned.
- Privacy and secret-handling rules are unioned.
- Time, output, and retention limits use the stricter value.
- Generated state never overrides current source files.
- Host-specific instruction files may add guidance, but they do not replace the
  repository command contract.

## Conflict Handling

An agent or implementation must stop and report the conflict when:

- two required rules cannot both be followed;
- it is unclear which mustflow root is nearest;
- a command would need to be inferred outside `commands.toml`;
- generated state disagrees with current source files; or
- a host policy appears to require behavior that the repository contract forbids.

The report should identify the conflicting sources and the action that was not
taken.

## Testable Outcomes

- A direct user request can select the task goal, but it cannot make an
  unconfigured project command count as mustflow verification.
- `AGENTS.md` can require use of `mf run`, but it cannot weaken host approval or
  sandbox rules.
- `.mustflow/context/*` can guide task selection, but it cannot override
  `commands.toml`.
- `.mustflow/state/**` can record evidence, but it cannot become source truth.

