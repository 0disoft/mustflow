# Host Instruction Conflicts

This example illustrates how mustflow should be interpreted when a coding host also reads its own instruction files.

## Layout

```text
hosted-project/
├─ AGENTS.md
├─ .github/
│  └─ copilot-instructions.md
└─ .mustflow/
   └─ config/
      └─ commands.toml
```

`AGENTS.md` and `.mustflow/config/commands.toml` remain the repository-local mustflow contract. Host-specific files may add editor or assistant guidance, but they do not grant command authority on their own.

## Conflict Example

The host file might state:

```md
Run npm test before every final answer.
```

If `.mustflow/config/commands.toml` does not declare an agent-allowed `test` intent, the agent should not infer `npm test` from that host file. Instead, it should report the missing command contract.

If the host file says:

```md
Prefer short final answers.
```

this can coexist with mustflow because it neither broadens file scope, weakens safety rules, nor authorizes a command.

## Resolution Rule

Apply the stricter, safer interpretation:

- Direct user instructions define the task goal unless they are unsafe.
- Host safety and approval gates remain in effect.
- mustflow command execution is governed by `.mustflow/config/commands.toml`.
- The nearest `AGENTS.md` and `.mustflow/config/*.toml` files define repository work rules.
- Generated state or cached summaries cannot override current files.

When the effective rule is unclear, stop and report the conflict rather than guessing.