---
title: mf skill
description: Resolves compact skill route candidates for a task.
---

`mf skill route` is a read-only routing prepass for agents and host integrations.

It accepts task text, expected or changed paths, and classification or verification reasons, then
returns a small ranked set of skill route candidates. The resolver uses route metadata and
`SKILL.md` frontmatter, not the expanded `.mustflow/skills/INDEX.md` table, for its default route
source. This keeps agents from loading the full index into the prompt when a compact resolver result
is enough to decide which skill documents to read next.

JSON output also includes a `read_plan` so host integrations can assemble cache-friendly prompts:
keep `.mustflow/skills/router.toml` in the stable prefix, load selected `SKILL.md` files in task
context, and treat `.mustflow/skills/INDEX.md` as a fallback-only file unless the report names a
fallback reason.

JSON output may also include `script_pack_suggestions`, a read-only helper list derived from the
route input and selected skill candidates. These suggestions do not run scripts or grant command
authority; they only name optional helpers the caller may inspect under the repository command
contract.

The command does not replace the mandatory skill-selection gate. Agents must still read the selected
`.mustflow/skills/<name>/SKILL.md` before editing matching files. Command execution authority still
comes only from `.mustflow/config/commands.toml`.

Projects may add `.mustflow/skills/route-fixtures.json` to pin important routing expectations.
When that file exists, `mf check --strict` re-runs those cases and fails if the selected main route,
required candidates, selected adjuncts, or forbidden candidates drift.

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
- `signals` (`object`): Tokenized task/path terms, reasons, and the route metadata/frontmatter
  shards read by the resolver.
- `selected.main` (`object | null`): Highest ranked primary or authoring route.
- `selected.adjuncts` (`object[]`): Up to two compatible adjunct routes from the same category.
- `candidates` (`object[]`): Ranked candidate routes, each with score breakdown and selection reasons.
- `read_plan` (`object`): Stable kernel files, selected and candidate skill paths, fallback route
  metadata, expanded-index fallback rules, avoid-by-default files, and selection limits for
  cache-friendly prompt assembly.
- `source_files` (`string[]`): Route metadata and skill frontmatter sources used by the resolver.
- `gap_notes` (`string[]`): Boundaries the caller must preserve.
- `script_pack_suggestions` (`object`, optional): Read-only script-pack helper recommendations
  derived from route paths and selected skill candidates. These suggestions do not run scripts or
  grant command authority.

The published JSON Schema is `schemas/skill-route-report.schema.json`.

## Exit Codes

- `0`: Route candidates were resolved.
- `1`: Input was invalid.
