# Nested Repositories

This example demonstrates how mustflow should be interpreted when one repository contains other repositories that also have mustflow installed.

## Layout

```text
workspace-a/
├─ AGENTS.md
├─ .mustflow/
│  └─ config/
│     └─ commands.toml
└─ repos/
   ├─ service-b/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   │     └─ config/
   │        └─ commands.toml
   └─ docs-c/
      ├─ AGENTS.md
      └─ .mustflow/
         └─ config/
            └─ commands.toml
```

`workspace-a` can define broad workspace conventions, but it does not control the command contract for `repos/service-b` or `repos/docs-c`.

## Working Rule

When an agent edits files within a nested repository, it should reload that repository's nearest `AGENTS.md` and `.mustflow/config/*.toml` files before editing or running commands.

The nearest child repository determines local details such as:

- Commit message language and style preferences
- Documentation language
- Available command intents
- Safe verification commands
- Project-specific context and skills

Safety rules are cumulative. A child repository can impose stricter behavior for its own files but cannot weaken safety constraints set by the parent, host, user, or platform.

## Example Difference

The parent workspace might allow English commit messages:

```toml
[git.commit_message]
language = "en"
```

The nested documentation repository might prefer Korean commit messages:

```toml
[git.commit_message]
language = "ko"
```

When editing files under `repos/docs-c/**`, the nested repository's preference applies locally. The agent should not use the parent preference simply because the command was initiated from `workspace-a`.

## Command Contract Boundary

If `workspace-a` includes `test_related` but `repos/service-b` does not, the agent must not borrow the parent's command intent to validate changes in the child. Instead, it should use the child repository's configured intents or report the absence of a child command contract.