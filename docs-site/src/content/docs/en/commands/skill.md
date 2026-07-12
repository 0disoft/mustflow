---
title: mf skill
description: Resolves skill route candidates and imports external SKILL.md files.
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

Each candidate also includes a compact `route_card`. The card names the matched dimensions, the
fallback-only index policy, and the selected skill's `Use When` / `Do Not Use When` excerpt
references. Host integrations can use those excerpt references to break close route ties before
loading full competing `SKILL.md` files or the expanded index.

Pattern tie-break signals come from route metadata under `.mustflow/skills/routes.toml`, such as
`contexts.positive_terms` and `contexts.negative_terms`. This keeps the resolver deterministic while
letting skill authors improve routing precision by editing metadata instead of changing resolver
code.

Route cards also expose `route_dependencies` from route metadata. The resolver applies
`requires_skills`, `suggests_adjuncts`, `conflicts_with`, and matching `unlocks_on` rules when
building `selected.adjuncts` and `read_plan.selected_skill_paths`, so hosts can add bounded adjunct
reads or avoid conflicting route branches without loading the expanded skill index.

Human text output prints selected route dependency reads and conflict hints as separate sections.
This keeps the prompt-assembly reason visible even when the caller is not using `--json`.

JSON output may also include `script_pack_suggestions`, a read-only helper list derived from the
route input and selected skill candidates. These suggestions do not run scripts or grant command
authority; they only name optional helpers the caller may inspect under the repository command
contract.

The command does not replace the mandatory skill-selection gate. Agents must still read the selected
`.mustflow/skills/<name>/SKILL.md` before editing matching files. Command execution authority still
comes only from `.mustflow/config/commands.toml`.

`mf skill import` previews or installs a third-party `SKILL.md` from a GitHub URL into
`.mustflow/external-skills/<name>/`. External skills stay outside `.mustflow/skills/` so strict
mustflow-owned skill validation does not treat them as built-in routes. Installed external skills can
appear in `mf skill route` results as low-priority `external` candidates when their frontmatter
matches the task. They are untrusted task-context files: agents still need to read the selected
`SKILL.md`. By default, external `scripts/` files are imported as inert references. Passing
`--trust-scripts` during install also creates a reviewed command-contract fragment under
`.mustflow/config/commands/` and adds it to `.mustflow/config/commands.toml`, so the scripts can run
only through generated `mf run external_skill_*` intents. Those intents are still gated by
`network_access` and `destructive_command` approvals because mustflow cannot infer what an arbitrary
third-party script will do.

Projects may add `.mustflow/skills/route-fixtures.json` to pin important routing expectations.
When that file exists, `mf check --strict` re-runs those cases and fails if the selected main route,
required candidates, selected adjuncts, or forbidden candidates drift.

## Usage

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change
npx mf skill route --task "review prompt cache token budgets" --path src/cli/lib/agent-context.ts --reason performance_change --json
npx mf skill import https://github.com/example/agent-skills/tree/main/review/security --dry-run --json
npx mf skill import https://github.com/example/agent-skills/blob/main/review/security/SKILL.md --install
npx mf skill import https://github.com/example/agent-skills/tree/main/review/security --install --trust-scripts
npx mf skill outdated --json
npx mf skill update concurrency-review --dry-run --json
npx mf skill update --all --trust-scripts
```

## Maintain Imported Skills

`mf skill outdated` compares installed external skills with the provenance source saved at import
time. `mf skill update <name>` or `mf skill update --all` prepares or applies a refresh from that
source. Use `--dry-run` to inspect the incoming change first.

An external skill remains untrusted task context after an update. `--trust-scripts` can create or
refresh command-contract fragments for supported imported scripts, but it does not execute those
scripts. The generated intents retain explicit network and destructive approvals, so the current
repository and host policy still decide whether an execution is allowed.

## Options

### `mf skill route`

- `--task <text>`: Task text used for route scoring.
- `--path <path>`: Changed or expected path. May be repeated.
- `--reason <reason>`: Classification or verification reason. May be repeated.
- `--max-candidates <count>`: Candidate limit from `1` to `10`. Default is `5`.
- `--json`: Outputs the route report as machine-readable JSON.

### `mf skill import`

- `<github-url>`: A `github.com` repository, `tree`, `blob`, or `raw.githubusercontent.com` URL that
  resolves to a folder containing `SKILL.md` or to a `SKILL.md` file.
- `--dry-run`: Preview the import without writing files. This is the default when neither mode flag
  is present.
- `--install`: Write the external skill under `.mustflow/external-skills/<name>/`.
- `--name <slug>`: Override the installed directory name.
- `--ref <ref>`: Override the GitHub ref.
- `--trust-scripts`: For installs that include `scripts/`, create a command-contract fragment and
  include entry for generated `external_skill_*` intents. The generated intents use `argv` mode,
  run with a minimal environment, and declare both `network = true` and `destructive = true` so
  `mf run` requires explicit approvals before execution.
- `--json`: Outputs the import report as machine-readable JSON.

The importer copies `SKILL.md` and inert files from `assets/`, `references/`, and `scripts/` when
present. With `--trust-scripts`, only `.js`, `.mjs`, `.cjs`, `.ts`, `.mts`, `.cts`, `.ps1`, and
`.sh` script files can receive generated command intents. It rejects unsupported hosts, path
traversal, missing `SKILL.md`, oversized imports, unsupported top-level files, command intent name
collisions, existing command fragments, and unsupported trusted script types.

## Route JSON Fields

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
- `selected.adjuncts` (`object[]`): Up to two compatible adjunct reads, including route dependency
  reads selected from `requires_skills`, `suggests_adjuncts`, or matching `unlocks_on` rules.
- `candidates` (`object[]`): Ranked candidate routes, each with score breakdown and selection reasons.
- `candidates[].matched_dimensions` (`string[]`): Deterministic dimensions that contributed to the
  match, such as `reason`, `path_skill_hint`, `pattern_signal`, or `negative_signal`.
- `candidates[].route_card` (`object`): Compact route metadata for prompt assembly, including
  fallback-only index policy, route dependencies, and `Use When` / `Do Not Use When` excerpt
  references for tie-breaking.
- `read_plan` (`object`): Stable kernel files, selected and candidate skill paths, fallback route
  metadata, expanded-index fallback rules, avoid-by-default files, and selection limits for
  cache-friendly prompt assembly.
- `source_files` (`string[]`): Route metadata and skill frontmatter sources used by the resolver.
- `gap_notes` (`string[]`): Boundaries the caller must preserve.
- `script_pack_suggestions` (`object`, optional): Read-only script-pack helper recommendations
  derived from route paths and selected skill candidates. These suggestions do not run scripts or
  grant command authority.

The published JSON Schema is `schemas/skill-route-report.schema.json`.

## Import JSON Fields

```sh
npx mf skill import https://github.com/example/agent-skills/blob/main/review/security/SKILL.md --dry-run --json
```

Machine-readable import output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `skill`.
- `action` (`string`): Always `import`.
- `kind` (`string`): Always `skill_import_report`.
- `ok` (`boolean`): Whether the import source was accepted.
- `mode` (`string`): `dry_run` or `install`.
- `status` (`string`): `preview`, `installed`, or `rejected`.
- `source` (`object | null`): GitHub owner, repository, ref, skill path, and normalized source URL.
- `target` (`object | null`): Project-local external skill directory and provenance path.
- `files` (`object[]`): Imported file paths, kinds, byte counts, and SHA-256 hashes.
- `script_trust` (`object`, optional): Whether script trust was requested, whether command
  authority was added through `.mustflow/config/commands.toml`, the generated include entry,
  command fragment path, and generated `external_skill_*` intents. Dry runs report trusted script
  command plans as `planned`; only installs report command authority as `trusted`.
- `warnings` (`string[]`): Safety notes, including inert external script handling.
- `issues` (`string[]`): Rejection reasons.
- `wrote_files` (`boolean`): Whether files were written.

The published JSON Schema is `schemas/skill-import-report.schema.json`.

## Exit Codes

- `0`: Route candidates were resolved or an import preview/install succeeded.
- `1`: Input was invalid.
