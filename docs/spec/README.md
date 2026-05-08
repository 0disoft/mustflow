# mustflow Contract Specifications

These documents define the stable, testable rules behind mustflow's repository
workflow. They are not tutorials and they are not a replacement for the
installed files in a project.

The current specification set is versioned with `-v1` filenames:

- [Instruction Authority v1](instruction-authority-v1.md)
- [Command Contract v1](command-contract-v1.md)
- [Verification Receipt v1](verification-receipt-v1.md)
- [State Retention v1](state-retention-v1.md)

## Source Files

The specifications describe behavior implemented or installed through these
repository files:

- [AGENTS.md](../../AGENTS.md)
- [.mustflow/docs/agent-workflow.md](../../.mustflow/docs/agent-workflow.md)
- [.mustflow/config/mustflow.toml](../../.mustflow/config/mustflow.toml)
- [.mustflow/config/commands.toml](../../.mustflow/config/commands.toml)
- [src/cli/commands/run.ts](../../src/cli/commands/run.ts)
- [src/cli/lib/run-receipt.ts](../../src/cli/lib/run-receipt.ts)

If this directory and current source behavior conflict, treat the conflict as a
bug in the documentation or implementation. Do not use these specifications to
override current user instructions, host safety gates, or the nearest installed
mustflow root.

## Versioning

Versioned files use this rule:

- Patch-level clarifications may update a `v1` document in place when they do
  not change behavior.
- Behavior changes that break existing assumptions should add a new versioned
  document.
- Automation-facing JSON stability belongs in the root `schemas/` directory.

## Contract Language

The words "must", "must not", "should", and "may" are used as ordinary
normative terms:

- "must" means an implementation or agent workflow is invalid when the rule is
  not followed.
- "must not" means the behavior is forbidden.
- "should" means the behavior is expected unless a stricter source gives a
  specific reason to do otherwise.
- "may" means the behavior is permitted but not required.
