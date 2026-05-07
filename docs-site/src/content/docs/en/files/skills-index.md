---
title: .mustflow/skills/INDEX.md
description: An index that tells agents which skill document to read for a task.
---

`.mustflow/skills/INDEX.md` helps agents choose the right skill document before starting repeatable work.

## Where It Is Used

After reading shared rules and the command contract, agents use this index when the current task matches a repeatable procedure.

This file should not copy long skill bodies. It connects situations, skill paths, and relevant command intents.

## Role

- Lists skill names and when to use them.
- Links recurring tasks such as code review, documentation updates, failure triage, and test maintenance.
- Lists the command intent names each skill may need.
- Allows unused repository-specific skills to be removed or marked inactive.

## Authoring rules

Keep the index short and scannable.

Put long procedures in each `SKILL.md`. The index should contain only the name, purpose, trigger condition, and relevant command intents for each skill.

## Table Columns

- `Situation`: Task condition that should trigger the skill.
- `Document`: Path to the `SKILL.md` containing the procedure.
- `Command intents`: Intent names from `commands.toml` that the skill may check.

When adding a skill, link it here and keep command intent names aligned with the skill frontmatter.
