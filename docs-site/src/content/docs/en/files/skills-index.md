---
title: .mustflow/skills/INDEX.md
description: An expanded route table that directs agents to the appropriate skill document when the compact router and full route metadata are not enough.
---

`.mustflow/skills/INDEX.md` is the expanded human-readable route table for selecting the correct skill document when `.mustflow/skills/router.toml` and `.mustflow/skills/routes.toml` are not detailed enough.

## Usage

After consulting the shared rules, command contract, compact route kernel, and full route metadata, agents refer to this index only when detailed trigger evidence is needed or when maintaining skill routing.

This file should not contain full procedure details. It maps compact route fields to skill paths: trigger, required input, edit scope, risk, verification intents, and expected output.
`mf check --strict` compares these routes with the referenced `SKILL.md` files so missing skill documents, unlisted skills, unknown command intents, command-intent drift, and route-table shape drift are visible.

## Selection Behavior

Agents use the compact route kernel at task start and before the first edit. They use this expanded
index when full route metadata is insufficient, compare the user request and expected changed files
with the listed triggers, then read each matching `SKILL.md` before editing that scope.

When a skill is used, or when a plausible skill is intentionally skipped, agents should leave a
short selection note in the next user-facing update or final report. The note belongs in the
conversation report, not in a versioned worklog file.

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

## Example: Performance Measurement Integrity

`performance-measurement-integrity-review` is an adjunct route for counters, timers, histograms,
cache ratios, benchmark gates, CPU PMU evidence, communication IPC outcomes, and cross-process
latency. It checks that a measurement has a named event, compatible denominator and clock domain,
concurrency-safe snapshot semantics, comparable workload, and safe telemetry boundary.

It complements `performance-budget-check`: the budget skill evaluates what to optimize and whether
the result is useful, while the measurement skill checks whether the numbers justify that conclusion.
For performance data, neither route turns a profiler, benchmark, or production query into command
authority.
