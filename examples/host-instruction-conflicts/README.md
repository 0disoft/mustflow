# Host Instruction Conflicts

This example shows how mustflow should be interpreted when a coding host also
reads its own instruction files.

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

`AGENTS.md` and `.mustflow/config/commands.toml` remain the repository-local
mustflow contract. Host-specific files may add editor or assistant guidance, but
they do not grant command authority by themselves.

## Conflict Example

The host file might say:

```md
Run npm test before every final answer.
```

If `.mustflow/config/commands.toml` does not declare an agent-allowed `test`
intent, the agent should not infer `npm test` from that host file. It should
report the missing command contract instead.

If the host file says:

```md
Prefer short final answers.
```

that can coexist with mustflow because it does not broaden file scope, weaken
safety rules, or authorize a command.

## Resolution Rule

Use the stricter safe interpretation:

- Direct user instructions define the task goal unless unsafe.
- Host safety and approval gates still apply.
- mustflow command execution comes from `.mustflow/config/commands.toml`.
- The nearest `AGENTS.md` and `.mustflow/config/*.toml` define repository work rules.
- Generated state or cached summaries cannot override current files.

When the effective rule is unclear, stop and report the conflict instead of
guessing.
