---
title: .mustflow/skills/*/SKILL.md
description: A procedural document defining repeatable tasks for agents.
---

`.mustflow/skills/*/SKILL.md` defines specific procedures to help agents execute repeatable tasks without inference or guesswork.

## Usage

Agents identify the appropriate skill category from `.mustflow/skills/router.toml`, read `.mustflow/skills/routes.toml` when detailed route metadata is needed, read `.mustflow/skills/INDEX.md` only when human-readable route evidence is needed, and consult the selected `SKILL.md` before performing repeatable tasks.

Skill documents encompass procedures such as code review, test maintenance, failure triage, and documentation updates. They reference the global policies defined in `.mustflow/docs/agent-workflow.md` rather than duplicating them.

Activating a skill means reading and following the skill procedure. It does not grant permission to
run commands outside `.mustflow/config/commands.toml` or to ignore higher-priority instructions.

## Frontmatter

```yaml
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 1
name: code-review
description: Apply this skill when reviewing code changes, scope, risks, or verification gaps.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - lint
```

- `mustflow_doc`: A unique, stable identifier for the skill within mustflow.
- `locale`: The language code of the document.
- `canonical`: Indicates if the document serves as the authoritative source.
- `revision`: The revision number of the authoritative document.
- `name`: The skill name. It must match the containing `.mustflow/skills/<name>/` directory.
- `description`: A brief summary of when the agent should apply this skill.
- `metadata.mustflow_schema`: The version of the skill metadata schema. The current supported value is `"1"`.
- `metadata.mustflow_kind`: The category of the document. Default skills must use `procedure`.
- `metadata.pack_id`: The package or pack namespace that owns the skill, such as `mustflow.core`.
- `metadata.skill_id`: The globally scoped skill identifier. It must combine the pack identifier and folder name, such as `mustflow.core.code-review`.
- `metadata.command_intents`: A list of command intent names referenced by this skill. Each name must exist in `.mustflow/config/commands.toml`.

The English version of the skill template serves as the authoritative source. Localized versions specify their own locales and set `canonical: false`.

## Document Structure

Each skill document should include the following sections:

- `Purpose`: Defines the specific task or objective this skill addresses.
- `Use When`: Describes scenarios that should trigger the application of this skill.
- `Do Not Use When`: Specifies exclusions to prevent unnecessary application.
- `Required Inputs`: Context and information the agent must collect before execution.
- `Preconditions`: Conditions that must hold before following the procedure.
- `Allowed Edits`: The files or surfaces the skill may guide, without granting command permission.
- `Procedure`: The step-by-step sequence of operations.
- `Postconditions`: Evidence, outputs, and unresolved risks that must be reportable after the procedure.
- `Verification`: Relevant command intents and verification steps.
- `Failure Handling`: Protocols for managing command failures or missing information.
- `Output Format`: Required components to include in the final report.

## Authoring Guidelines

Each skill should be scoped to a single task type.

Avoid including raw shell commands within skill documents. In the Verification section, reference the `.mustflow/docs/agent-workflow.md#command-execution-policy` and list only the relevant command intent names.

Each intent must be resolved via `.mustflow/config/commands.toml`. If an intent is not marked as `status = "configured"`, it must not be executed; instead, report its status and the reason for skipping.

Do not write that a skill itself grants command execution permission. Skills describe procedure; `.mustflow/config/commands.toml` remains the only source for runnable command permissions.

Example:

```md
## Verification

Relevant command intents:

- `test`
- `lint`

Resolve each intent through `.mustflow/config/commands.toml`.
```

## Resource Management

A default skill begins with only a `SKILL.md` file. Do not create empty `references/`, `assets/`, or `scripts/` directories in advance.

If a skill requires extensive supporting material, an optional `resources.toml` file can be added to register references, assets, or scripts. Scripts should never be invoked via inferred paths; they must be mapped to specific command intents in `.mustflow/config/commands.toml`.

Refer to [Skill Resources](../../design/skill-resources/) for detailed policies and guidelines.
