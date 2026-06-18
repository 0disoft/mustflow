---
title: AGENTS.md
description: The short root work-rule entrypoint that agents read first.
---

`AGENTS.md` is the primary entry point that LLM agents consult when first entering a repository.

## Usage

`mf init` installs this file at the target repository root to ensure immediate discovery by agents.

It serves as the gateway to the mustflow document flow. Detailed policies reside in `.mustflow/docs/agent-workflow.md`, executable commands are defined in `.mustflow/config/commands.toml`, repository-level preferences are managed in `.mustflow/config/preferences.toml`, task-specific project context lives in `.mustflow/context/`, and repeatable procedures are documented in `.mustflow/skills/`.

## Role and Responsibilities

- **Initiates the sequence**: Acts as the starting point for the mustflow document flow.
- **Establishes the read sequence**: Defines the mandatory order in which agents must process instructions.
- **Enforces core rules**: Maintains absolute constraints, such as prohibiting command guessing, preserving user modifications, and ensuring sensitive data protection.
- **Delegates detail**: Defers complex workflow policies to `.mustflow/docs/agent-workflow.md`.
- **Governs execution**: Restricts command execution to valid intents defined in `.mustflow/config/commands.toml`.
- **Activates skills**: Requires agents to check the stable `.mustflow/skills/router.toml` kernel,
  read `.mustflow/skills/routes.toml` only when detailed route metadata is needed, read
  `.mustflow/skills/INDEX.md` only when human-readable trigger evidence is needed, and read
  matching `SKILL.md` files before editing the affected scope.
- **Diagnostic orientation**: Specifies `mf doctor` as the recommended read-only diagnostic tool before initiating edits.
- **Contextual indexing**: Defines `mf context --json` as a machine-readable index rather than a replacement for full document review.
- **Safety boundaries**: Directs long-running or sensitive tasks to the `[budget]`, `[approval]`, and `[isolation]` policies in `mustflow.toml`.

## Read Sequence

```text
AGENTS.md
.mustflow/docs/agent-workflow.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml  # when present
.mustflow/skills/router.toml
.mustflow/context/INDEX.md  # only when task-specific context is needed
.mustflow/context/<name>.md  # only when selected by the context index
.mustflow/skills/routes.toml  # only when detailed route metadata is needed
.mustflow/skills/INDEX.md  # only when human-readable trigger evidence is needed
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

- `mustflow_doc`: A stable, internal identifier for the document.
- `locale`: The language code of the document.
- `canonical`: Indicates if the document serves as the authoritative source.
- `revision`: The revision number of the authoritative document.

The English `AGENTS.md` template is the authoritative source. Localized versions specify their respective locales and set `canonical: false`.

## Authoring Guidelines

`AGENTS.md` must remain at the repository root to ensure immediate agent visibility.

Do not hard-code specific test or build commands, file trees, recent modifications, or generation timestamps within `AGENTS.md`. Such details compromise input stability and should reside in `commands.toml`, `REPO_MAP.md`, or the relevant source files.

Preferences for language, code comments, commit messages, documentation, and logging should be defined in `.mustflow/config/preferences.toml` rather than being described as prose in `AGENTS.md`.

`AGENTS.md` should require first-pass skill selection through `.mustflow/skills/router.toml`.
Full route metadata belongs in `.mustflow/skills/routes.toml`; expanded human-readable selection
rules belong in `.mustflow/skills/INDEX.md` and `.mustflow/docs/agent-workflow.md`.

Autonomous loops, worker fleets, persona systems, and long-running harnesses must not be initiated from `AGENTS.md`. If a repository requires these capabilities, they should be explicitly defined in the mustflow configuration and supporting documentation.
