---
mustflow_doc: skill.docs-update
locale: en
canonical: true
revision: 1
name: docs-update
description: Use when updating mustflow or project documentation.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - docs_validate
    - mustflow_check
---

# Docs Update

## Purpose

Update documentation so it matches the actual workflow, commands, and user-visible behavior.

## Use When

- Agent workflow files change.
- Command contracts or configuration fields change.
- User-visible behavior changes and docs need to reflect it.

## Do Not Use When

- The task only changes private implementation details.
- The user explicitly asks not to edit documentation.

## Required Inputs

- Changed behavior or config field
- Relevant source or template file
- Current documentation page or Markdown file
- `.mustflow/config/commands.toml`

## Procedure

1. Identify the document that owns the explanation.
2. Update the smallest relevant section.
3. Keep command names and paths exact.
4. Do not add marketing or tutorial filler.
5. Keep generated files generated.

## Verification

Run `docs_validate` and `mustflow_check` only when they are configured and agent-runnable.
Otherwise report why they were skipped.

## Failure Handling

- If docs validation fails, fix the first relevant broken link or syntax issue.
- If a command contract changed, verify both docs and `.mustflow/config/commands.toml`.
- If translation status is unclear, mark it for review rather than guessing freshness.

## Output Format

- Documents changed
- Behavior or fields documented
- Command intents run
- Skipped checks and reasons
- Translation follow-up if needed
