---
title: AGENTS.md
description: The short root work-rule entrypoint that agents read first.
---

`AGENTS.md` is the root entry point LLM agents read first when entering a repository.

## Where It Is Used

`mf init` creates this file at the target repository root because agents should find it immediately when entering a repository.

It is the entry point into the mustflow document flow. Detailed policy belongs in `.mustflow/docs/agent-workflow.md`, executable commands belong in `.mustflow/config/commands.toml`, repository-level preferences belong in `.mustflow/config/preferences.toml`, task-specific project context belongs in `.mustflow/context/`, and repeatable procedures belong in `.mustflow/skills/`.

## Role

- Starts the mustflow document flow.
- Defines the first reading order.
- Keeps only absolute rules such as no command guessing, preserving existing changes, and secret handling.
- Points detailed work flow to `.mustflow/docs/agent-workflow.md`.
- Makes executability depend on command intent status in `.mustflow/config/commands.toml`.
- States that `mf doctor` is a read-only diagnostic command to run before edits when needed.
- States that `mf context --json` is a read-only context index, not a replacement for reading the actual documents.
- Points long-running or sensitive tasks to `[budget]`, `[approval]`, and `[isolation]` in `mustflow.toml`.

## Reading Order

```text
AGENTS.md
.mustflow/docs/agent-workflow.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml  # when present
.mustflow/skills/INDEX.md
.mustflow/context/INDEX.md  # only when task-specific context is needed
.mustflow/context/<name>.md  # only when selected by the context index
.mustflow/skills/<name>/SKILL.md
REPO_MAP.md  # only when broad navigation is needed
```

## Frontmatter

```yaml
mustflow_doc: agents.root
locale: en
canonical: true
revision: 4
```

- `mustflow_doc`: Stable document identifier inside mustflow.
- `locale`: Document language.
- `canonical`: Whether this document is the canonical source.
- `revision`: Canonical document revision.

The English template `AGENTS.md` is the canonical source. Localized template files use their own locale and set `canonical: false`.

## Authoring Rules

`AGENTS.md` stays at the repository root so agents can discover it quickly.

Do not hard-code actual test or build commands, repository trees, recent changes, or generated timestamps in `AGENTS.md`. Those details reduce input stability and belong in `commands.toml`, `REPO_MAP.md`, or relevant source files.

Defaults for language, comments, commit messages, documentation, logs, and formatting belong in `.mustflow/config/preferences.toml`, not as long prose in `AGENTS.md`.

Autonomous loops, worker fleets, persona systems, and long-running harnesses should not be started
from `AGENTS.md`. If a repository wants those surfaces, it should declare them explicitly in mustflow
configuration and supporting documents.
