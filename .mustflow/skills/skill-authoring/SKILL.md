---
mustflow_doc: skill.skill-authoring
locale: en
canonical: true
revision: 1
name: skill-authoring
description: Apply this skill when creating or maintaining `.mustflow/skills/*/SKILL.md` procedures and `.mustflow/skills/INDEX.md` routes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - mustflow_check
    - docs_validate
---

# Skill Authoring

## Purpose

Create narrow, repeatable mustflow skill procedures without turning skills into broad advice, project context, or command-permission sources.

## Use When

- A `.mustflow/skills/<name>/SKILL.md` file is created, renamed, split, removed, or substantially changed.
- `.mustflow/skills/INDEX.md` needs a new or updated route for a skill.
- A skill needs clearer use conditions, exclusion conditions, required inputs, command intent references, verification, or failure handling.
- A broad prompt, checklist, or outside recommendation needs to be adapted into mustflow's skill format.

## Do Not Use When

- The task only applies an existing skill to code, docs, tests, context, or assets.
- The content belongs in `AGENTS.md`, `.mustflow/docs/agent-workflow.md`, `.mustflow/context/PROJECT.md`, or `.mustflow/config/commands.toml`.
- The proposed skill is broad advice such as "write better code" or "be careful" without a repeatable trigger and procedure.
- The skill would duplicate project-domain context, authorize commands, install dependencies, or define raw shell commands.

## Required Inputs

- The user request and the repeated task the skill should cover.
- Existing `.mustflow/skills/INDEX.md` and nearby skill documents.
- `.mustflow/config/commands.toml` command intent names relevant to verification.
- Any repository evidence showing that the task is repeatable and not better handled by an existing skill.
- Localization and template metadata when the skill is part of an installed template.

## Procedure

1. Define the smallest repeatable task the skill should cover. If the task is too broad, split it or leave it as repository guidance instead of creating a skill.
2. Search existing skills before adding a new one. Prefer updating a matching skill over creating overlapping procedures.
3. Use a stable folder name and matching frontmatter `name`. Set `mustflow_doc` to `skill.<name>`, `metadata.mustflow_schema` to `"1"`, and `metadata.mustflow_kind` to `procedure`.
4. Write the standard sections: Purpose, Use When, Do Not Use When, Required Inputs, Procedure, Verification, Failure Handling, and Output Format.
5. Keep the procedure concrete and bounded. Include what to read, what to change, what to avoid, and what evidence to report.
6. Reference command intent names only. Do not include raw shell command blocks or claim that the skill authorizes command execution.
7. Update `.mustflow/skills/INDEX.md` with the narrow scenario, skill path, and related command intents.
8. If the skill is installed by a template, update template manifests, localization metadata, installation docs, package tests, and public docs that list installed files.

## Verification

Use configured oneshot command intents when available:

- `mustflow_check`
- `docs_validate`

If the skill changes tests or behavior-sensitive template output, also use the relevant configured test or build intents.

## Failure Handling

- If `mustflow_check` reports missing sections, metadata drift, unknown command intents, raw shell commands, or command-permission claims, fix the skill contract before changing unrelated files.
- If two skills overlap, tighten their use and non-use conditions or merge the duplicate procedure.
- If a needed command intent is missing, record the missing intent instead of inventing a command inside the skill.
- If translation confidence is low, keep the source skill authoritative and mark translations for review through template metadata.

## Output Format

- Skill files added, updated, renamed, or removed
- Skill index routes changed
- Command intents referenced
- Template or localization metadata updated
- Command intents run
- Skipped command intents and reasons
- Remaining overlap, translation, or validation risks
