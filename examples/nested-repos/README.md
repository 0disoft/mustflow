# Nested Repositories

This example shows how mustflow should be interpreted when one repository
contains other repositories that also have mustflow installed.

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

`workspace-a` can describe broad workspace conventions, but it does not own the
command contract for `repos/service-b` or `repos/docs-c`.

## Working Rule

When an agent edits files inside a nested repository, it should reread that
repository's nearest `AGENTS.md` and `.mustflow/config/*.toml` files before
editing or running commands.

The nearest child repository decides local details such as:

- commit-message language and style preferences
- documentation language
- available command intents
- safe verification commands
- project-specific context and skills

Safety rules are cumulative. A child repository can narrow behavior for its own
files, but it cannot weaken parent, host, user, or platform safety constraints.

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

When editing `repos/docs-c/**`, the nested repository's preference is the local
one. The agent should not use the parent preference just because the command was
started from `workspace-a`.

## Command Contract Boundary

If `workspace-a` has `test_related` but `repos/service-b` does not, the agent
must not borrow the parent's command intent to validate child changes. It should
use the child repository's configured intents or report the missing child command
contract.

