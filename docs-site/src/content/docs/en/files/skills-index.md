---
title: .mustflow/skills/INDEX.md
description: An index that directs agents to the appropriate skill document for a given task.
---

`.mustflow/skills/INDEX.md` assists agents in selecting the correct skill document before initiating repeatable tasks.

## Usage

After consulting the shared rules and command contract, agents refer to this index when a task corresponds to a predefined procedure.

This file should not contain full procedure details; instead, it maps specific scenarios to skill paths and their associated command intents.
`mf check --strict` compares these routes with the referenced `SKILL.md` files so missing skill documents, unlisted skills, unknown command intents, and command-intent drift are visible.

## Selection Behavior

Agents use this index at task start and before the first edit. They compare the user request and
expected changed files with the listed scenarios, then read each matching `SKILL.md` before editing
that scope.

If a new condition appears during the task, such as a command failure, test contract change, or
documentation change, agents should pause and read the newly matching skill before continuing.

If no scenario applies, agents should not invent a skill. They continue with `AGENTS.md`,
`.mustflow/docs/agent-workflow.md`, and `.mustflow/config/commands.toml`.

## Role and Responsibilities

- **Categorization**: Lists available skills and defines their application scenarios.
- **Task Mapping**: Provides access to procedures for recurring tasks such as code review, documentation updates, failure triage, and test maintenance.
- **Intent Association**: Specifies the command intents required by each skill.
- **Maintenance**: Facilitates the removal or deactivation of unused, repository-specific skills.

## Authoring Guidelines

The index must remain concise and scannable.

Procedure details must reside within individual `SKILL.md` files. The index should only include the name, purpose, application scenario, and relevant command intents for each skill.

## Table Structure

- **Scenario**: The task condition that warrants the application of the skill.
- **Skill Document**: The file path to the corresponding `SKILL.md`.
- **Command Intents**: Intent names from `commands.toml` that may be executed during the skill application.

When introducing a new skill, add its link here and ensure that the command intent names are synchronized with the skill frontmatter.
