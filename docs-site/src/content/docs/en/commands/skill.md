---
title: mf skill
description: Resolves compact skill route candidates for a task.
---

`mf skill route` is a read-only routing prepass for agents and host integrations.

It accepts task text, expected or changed paths, and classification or verification reasons, then
returns a small ranked set of skill route candidates. This keeps agents from loading the full
`.mustflow/skills/INDEX.md` table into the prompt when a compact resolver result is enough to decide
which skill documents to read next.

The command does not replace the mandatory skill-selection gate. Agents must still read the selected
`.mustflow/skills/<name>/SKILL.md` before editing matching files. Command execution authority still
comes only from `.mustflow/config/commands.toml`.

## Usage

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change
npx mf skill route --task "review prompt cache token budgets" --path src/cli/lib/agent-context.ts --reason performance_change --json
```

## Options

- `--task <text>`: Task text used for route scoring.
- `--path <path>`: Changed or expected path. May be repeated.
- `--reason <reason>`: Classification or verification reason. May be repeated.
- `--max-candidates <count>`: Candidate limit from `1` to `10`. Default is `5`.
- `--json`: Outputs the route report as machine-readable JSON.

## JSON Fields

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `skill`.
- `action` (`string`): Always `route`.
- `kind` (`string`): Always `skill_route_resolution`.
- `input` (`object`): Normalized task, paths, reasons, and candidate limit.
- `signals` (`object`): Tokenized task/path terms, reasons, and the route shards read by the resolver.
- `selected.main` (`object | null`): Highest ranked primary or authoring route.
- `selected.adjuncts` (`object[]`): Up to two compatible adjunct routes from the same category.
- `candidates` (`object[]`): Ranked candidate routes, each with score breakdown and selection reasons.
- `source_files` (`string[]`): Route source files used by the resolver.
- `gap_notes` (`string[]`): Boundaries the caller must preserve.

The published JSON Schema is `schemas/skill-route-report.schema.json`.

## Exit Codes

- `0`: Route candidates were resolved.
- `1`: Input was invalid.
