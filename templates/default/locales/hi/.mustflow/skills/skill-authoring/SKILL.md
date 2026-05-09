---
mustflow_doc: skill.skill-authoring
locale: hi
canonical: false
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: skill-authoring
description: Apply this skill when creating or maintaining `.mustflow/skills/*/SKILL.md` procedures and `.mustflow/skills/INDEX.md` routes.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.skill-authoring
  command_intents:
    - mustflow_check
    - docs_validate
---

# Skill Authoring

<!-- mustflow-section: purpose -->
## Purpose

Create narrow, repeatable mustflow skill procedures without turning skills into broad advice, project context, or command-permission sources.

<!-- mustflow-section: use-when -->
## Use When

- A `.mustflow/skills/<name>/SKILL.md` file is created, renamed, split, removed, or substantially changed.
- `.mustflow/skills/INDEX.md` needs a new or updated route for a skill.
- A skill needs clearer use conditions, exclusion conditions, required inputs, command intent references, verification, or failure handling.
- A broad prompt, checklist, or outside recommendation needs to be adapted into mustflow's skill format.

<!-- mustflow-section: do-not-use-when -->
## Do Not Use When

- The task only applies an existing skill to code, docs, tests, context, or assets.
- The content belongs in `AGENTS.md`, `.mustflow/docs/agent-workflow.md`, `.mustflow/context/PROJECT.md`, or `.mustflow/config/commands.toml`.
- The proposed skill is broad advice such as "write better code" or "be careful" without a repeatable trigger and procedure.
- The skill would duplicate project-domain context, authorize commands, install dependencies, or define raw shell commands.

<!-- mustflow-section: required-inputs -->
## Required Inputs

- The user request and the repeated task the skill should cover.
- Existing `.mustflow/skills/INDEX.md` and nearby skill documents.
- `.mustflow/config/commands.toml` command intent names relevant to verification.
- Any repository evidence showing that the task is repeatable and not better handled by an existing skill.
- Localization and template metadata when the skill is part of an installed template.

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

1. Define the smallest repeatable task the skill should cover. If the task is too broad, split it or leave it as repository guidance instead of creating a skill.
2. Search existing skills before adding a new one. Prefer updating a matching skill over creating overlapping procedures.
3. Use a stable folder name and matching frontmatter `name`. Set `mustflow_doc` to `skill.<name>`, `metadata.mustflow_schema` to `"1"`, `metadata.mustflow_kind` to `procedure`, `metadata.pack_id` to the package namespace, and `metadata.skill_id` to `<pack_id>.<name>`.
4. Standard sections लिखें: उद्देश्य, कब उपयोग करें, कब उपयोग न करें, आवश्यक इनपुट, पूर्व शर्तें, अनुमत edits, प्रक्रिया, पश्च शर्तें, सत्यापन, विफलता प्रबंधन और आउटपुट प्रारूप।
5. Keep the procedure concrete and bounded. Include what to read, what to change, what to avoid, and what evidence to report.
6. Reference command intent names only. Do not include raw shell command blocks or claim that the skill authorizes command execution.
7. `.mustflow/skills/INDEX.md` को compact route के साथ update करें जिसमें trigger, required input, edit scope, risk, verification intents और expected output शामिल हों.
8. If the skill is installed by a template, update template manifests, localization metadata, installation docs, package tests, and public docs that list installed files.

<!-- mustflow-section: postconditions -->
## Postconditions

- The expected output can be produced with clear evidence, executed command intents, skipped checks, and remaining risks.
- Any missing command intent, unknown input, or authority conflict is reported instead of hidden.

<!-- mustflow-section: verification -->
## Verification

Use configured oneshot command intents when available:

- `mustflow_check`
- `docs_validate`

If the skill changes tests or behavior-sensitive template output, also use the relevant configured test or build intents.

<!-- mustflow-section: failure-handling -->
## Failure Handling

- If `mustflow_check` reports missing sections, metadata drift, unknown command intents, raw shell commands, or command-permission claims, fix the skill contract before changing unrelated files.
- If two skills overlap, tighten their use and non-use conditions or merge the duplicate procedure.
- If a needed command intent is missing, record the missing intent instead of inventing a command inside the skill.
- If translation confidence is low, keep the source skill authoritative and mark translations for review through template metadata.

<!-- mustflow-section: output-format -->
## Output Format

- Skill files added, updated, renamed, or removed
- Skill index routes changed
- Command intents referenced
- Template or localization metadata updated
- Command intents run
- Skipped command intents and reasons
- Remaining overlap, translation, or validation risks
