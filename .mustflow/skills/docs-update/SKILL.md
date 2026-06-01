---
mustflow_doc: skill.docs-update
locale: en
canonical: true
revision: 5
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
    - docs_validate_fast
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
- Localization or template metadata that owns the document when the edited page is installed or translated

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
2. Decide section relevance before writing:
   - update the page that owns the contract before summary or index pages;
   - update README only when the first-screen claim changes;
   - update localized or template metadata only when the source document is installed or translated;
   - avoid duplicating long procedures across multiple docs.
3. Update only the most relevant sections.
4. Ensure command names, paths, field names, option names, and frontmatter are exact.
5. If localization exists and translation confidence is low, update source metadata and mark follow-up instead of guessing translated wording.
6. Avoid adding marketing language or tutorial filler.
7. Do not manually modify generated files.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Use `docs_validate_fast` for routine documentation edits when it is configured and available for agent use.
Use the full `docs_validate` when documentation site configuration, navigation generation, static output,
Astro content validation, search indexing, sitemap output, or release readiness is affected. Always run `mustflow_check` for mustflow
workflow or configuration documents when it is configured and available. Otherwise, report the reason for
skipping these checks.

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
