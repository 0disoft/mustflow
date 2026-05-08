---
title: .mustflow/skills/INDEX.md
description: An index that directs agents to the appropriate skill document for a given task.
---

`.mustflow/skills/INDEX.md` assists agents in selecting the correct skill document before initiating repeatable tasks.

## Usage

After consulting the shared rules and command contract, agents refer to this index when a task matches a predefined procedure.

This file should not contain full procedure details. It maps compact route fields to skill paths: trigger, required input, edit scope, risk, verification intents, and expected output.
`mf check --strict` compares these routes with the referenced `SKILL.md` files so missing skill documents, unlisted skills, unknown command intents, command-intent drift, and route-table shape drift are visible.

## Selection Behavior

Agents use this index at task start and before the first edit. They compare the user request and
expected changed files with the listed triggers, then read each matching `SKILL.md` before editing
that scope.

If a new condition appears during the task, such as a command failure, test contract change, or
documentation change, agents should pause and read the newly matching skill before continuing.

If no trigger applies, agents should not invent a skill. They continue with `AGENTS.md`,
`.mustflow/docs/agent-workflow.md`, and `.mustflow/config/commands.toml`.

## Role and Responsibilities

- **Routing**: Lists available skills and defines precise triggers for applying them.
- **Scope Control**: States the required input, edit scope, risk, and expected output for each route.
- **Intent Association**: Specifies the command intents referenced by each skill.
- **Maintenance**: Keeps skill routes compact so procedure details remain in each `SKILL.md`.

## Authoring Guidelines

The index must remain concise and scannable.

Procedure details must reside within individual `SKILL.md` files. The index should only include route fields that help an agent decide whether to read a skill and what evidence to report.

## Table Structure

- **Trigger**: The task condition that warrants reading the skill.
- **Skill Document**: The file path to the corresponding `SKILL.md`.
- **Required Input**: The evidence or request data needed before applying the skill.
- **Edit Scope**: The files or surface the skill is allowed to guide.
- **Risk**: The main failure mode the route is meant to control.
- **Verification Intents**: Intent names from `commands.toml` that may be relevant during the skill application.
- **Expected Output**: The report shape the agent should leave after using the skill.

When introducing a new skill, add its route here and ensure that verification intent names stay synchronized with the skill frontmatter.