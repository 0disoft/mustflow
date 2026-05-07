---
title: .mustflow/skills/*/SKILL.md
description: A procedure document for repeatable agent tasks.
---

`.mustflow/skills/*/SKILL.md` helps agents perform repeatable tasks without guessing.

## Where It Is Used

Agents choose a relevant skill from `.mustflow/skills/INDEX.md`, then read that skill before doing repeatable work.

Skill documents cover procedures such as code review, test maintenance, failure triage, and documentation updates. They reference `.mustflow/docs/agent-workflow.md` instead of copying shared policy.

## Frontmatter

```yaml
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 1
name: code-review
description: Use when reviewing code changes, scope, risks, or missing verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - lint
```

- `mustflow_doc`: Stable skill identifier inside mustflow.
- `locale`: Document language.
- `canonical`: Whether this document is the canonical source.
- `revision`: Canonical document revision.
- `name`: Skill name. It should match the folder name.
- `description`: When an agent should read this skill.
- `metadata.mustflow_schema`: Version of the skill metadata shape.
- `metadata.mustflow_kind`: Document kind. Default skills use `procedure`.
- `metadata.command_intents`: Command intent names this skill may reference.

The English skill template is the canonical source. Localized skill templates use their own locale and set `canonical: false`.

## Standard Sections

Each skill document should include:

- `Purpose`: The task this skill addresses.
- `Use when`: Situations that should trigger this skill.
- `Do not use when`: Exclusions that prevent overuse.
- `Required inputs`: Information agents must gather before acting.
- `Procedure`: The work sequence.
- `Validation`: Relevant command intents and checks.
- `Failure handling`: What to do when commands fail or information is missing.
- `Output contract`: Items to include in the final report.

## Authoring rules

Each skill should cover one task type.

Do not write raw shell commands in skill documents. In the validation section, reference `.mustflow/docs/agent-workflow.md#command-execution-policy` and list only the relevant command intent names.

Resolve each intent through `.mustflow/config/commands.toml`. If `status = "configured"` is not present, do not run it; report the status and skipped reason.

Example:

```md
## Validation

Relevant command intents:

- `test`
- `lint`

Resolve each intent through `.mustflow/config/commands.toml`.
```

## Supporting Resources

A default skill starts with only `SKILL.md`. Do not create empty `references/`, `assets/`, or `scripts/` folders in advance.

When a skill becomes long or needs separate supporting material, add an optional `resources.toml` and register references, templates, or scripts there. Scripts should not be invoked through guessed paths; connect them to command intents in `.mustflow/config/commands.toml`.

Follow [Skill Resources](/design/skill-resources/) for the detailed rules.
