---
mustflow_doc: skill.docs-update
locale: en
canonical: true
revision: 1
name: docs-update
description: Apply this skill when updating mustflow or project documentation.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - docs_validate
    - mustflow_check
---

# Docs Update

## Purpose

Ensure documentation accurately reflects the current workflow, commands, and user-facing behavior.

## Use When

- Agent workflow files are modified.
- Command contracts or configuration fields are updated.
- User-facing behavior has changed and requires documentation updates.

## Do Not Use When

- The task involves only private implementation details.
- The user explicitly requests that documentation not be modified.

## Required Inputs

- Modified behavior or configuration field
- Relevant source or template file
- Current documentation page or Markdown file
- `.mustflow/config/commands.toml`

## Procedure

1. Locate the document responsible for the explanation.
2. Update only the most relevant sections.
3. Ensure command names and paths are exact.
4. Avoid adding marketing language or tutorial filler.
5. Do not manually modify generated files.

## Verification

Execute `docs_validate` and `mustflow_check` provided they are configured and available for agent use.
Otherwise, report the reason for skipping these checks.

## Failure Handling

- If docs validation fails, resolve the first relevant broken link or syntax error.
- If a command contract has changed, verify consistency between the documentation and `.mustflow/config/commands.toml`.
- If translation status is unclear, mark the document for review instead of guessing whether it is up to date.

## Output Format

- Modified documents
- Documented behavior or fields
- Command intents executed
- Skipped checks and reasons
- Required translation follow-ups
