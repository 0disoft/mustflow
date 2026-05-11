# mustflow Contract Specifications

These documents define the stable, testable rules governing mustflow's repository workflow. They are not tutorials and do not replace the installed files within a project.

The current specification set is versioned with `-v1` filenames:

- [Instruction Authority v1](instruction-authority-v1.md)
- [Command Contract v1](command-contract-v1.md)
- [Verification Receipt v1](verification-receipt-v1.md)
- [State Retention v1](state-retention-v1.md)

## Source Files

The specifications describe behavior implemented or installed through these repository files:

- [AGENTS.md](../../AGENTS.md)
- [.mustflow/docs/agent-workflow.md](../../.mustflow/docs/agent-workflow.md)
- [.mustflow/config/mustflow.toml](../../.mustflow/config/mustflow.toml)
- [.mustflow/config/commands.toml](../../.mustflow/config/commands.toml)
- [src/cli/commands/run.ts](../../src/cli/commands/run.ts)
- [src/cli/lib/run-receipt.ts](../../src/cli/lib/run-receipt.ts)

If this directory and the current source behavior conflict, treat the discrepancy as a bug in either the documentation or implementation. Do not use these specifications to override current user instructions, host safety gates, or the nearest installed mustflow root.

## Versioning

Versioned files follow these rules:

- Patch-level clarifications may update a `v1` document in place when they do not change behavior.
- Behavior changes that break existing assumptions must introduce a new versioned document.
- Automation-facing JSON stability is maintained in the root `schemas/` directory.

## Contract Language

The terms "must," "must not," "should," and "may" are used as standard normative terms:

- "must" indicates that an implementation or agent workflow is invalid if the rule is not followed.
- "must not" indicates forbidden behavior.
- "should" indicates expected behavior unless a stricter source provides a specific reason otherwise.
- "may" indicates permitted but optional behavior.