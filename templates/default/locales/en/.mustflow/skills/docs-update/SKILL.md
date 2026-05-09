---
mustflow_doc: skill.docs-update
locale: en
canonical: true
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: docs-update
description: Apply this skill when updating mustflow or project documentation.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docs-update
  command_intents:
    - docs_validate
    - mustflow_check
---

# Docs Update

<!-- mustflow-section: purpose -->
## Purpose

Ensure documentation accurately reflects the current workflow, commands, and user-facing behavior.

<!-- mustflow-section: use-when -->
## Use When

- Agent workflow files are modified.
- Command contracts or configuration fields are updated.
- User-facing behavior has changed and requires documentation updates.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task involves only private implementation details.
- The user explicitly requests that documentation not be modified.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- Modified behavior or configuration field
- Relevant source or template file
- Current documentation page or Markdown file
- `.mustflow/config/commands.toml`

<!-- mustflow-section: preconditions -->
## Preconditions

- The task matches the Use When conditions and does not match the Do Not Use When exclusions.
- Required inputs are available, or missing inputs can be reported without guessing.
- Higher-priority instructions and `.mustflow/config/commands.toml` have been checked for the current scope.

<!-- mustflow-section: allowed-edits -->
## Allowed Edits

- Keep edits within the scope described by this skill, the user request, and the matching route in `.mustflow/skills/INDEX.md`.
- Do not broaden command permission, invent project facts, or change unrelated workflow files.

<!-- mustflow-section: procedure -->
## Procedure

1. Locate the document responsible for the explanation.
2. Update only the most relevant sections.
3. Ensure command names and paths are exact.
4. Avoid adding marketing language or tutorial filler.
5. Do not manually modify generated files.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Execute `docs_validate` and `mustflow_check` provided they are configured and available for agent use.
Otherwise, report the reason for skipping these checks.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If docs validation fails, resolve the first relevant broken link or syntax error.
- If a command contract has changed, verify consistency between the documentation and `.mustflow/config/commands.toml`.
- If translation status is unclear, mark the document for review instead of guessing whether it is up to date.

<!-- mustflow-section: output-format -->
## Output Format

- Modified documents
- Documented behavior or fields
- Command intents executed
- Skipped checks and reasons
- Required translation follow-ups
