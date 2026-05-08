---
title: mf map
description: Generates REPO_MAP.md, an anchor-based map for the current mustflow root.
---

`mf map` reads the current mustflow root and generates an anchor-based navigation map for agents.

It is not intended to be a full file listing. `git ls-files` or an editor is better for that. `mf map` only includes anchors that help navigation, such as `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, context files, and important configuration files.

## Options

- `--stdout`: Print the generated map to the terminal.
- `--write`: Write the generated map to `REPO_MAP.md`.
- `--depth <number>`: Set the search depth for non-priority anchor files. The default is `3`.
- `--include-nested`: Include nested repositories from configured workspace roots in the `Nested Repositories` section.
- `--root-only`: Generate a map for the current root only, even when nested repository discovery is enabled in configuration.

## Included Anchors

These files can be included when discovered.

```text
AGENTS.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml
.mustflow/context/INDEX.md
.mustflow/context/PROJECT.md
.mustflow/skills/INDEX.md
README.md
DESIGN.md
package.json
pyproject.toml
go.mod
Cargo.toml
deno.json
SKILL.md
justfile
Taskfile.yml
Makefile
Dockerfile
compose.yaml
tsconfig.json
ruff.toml
.golangci.yml
```

## Excluded Paths

These paths are excluded by default.

```text
.git
.mustflow/backups
node_modules
dist
build
coverage
cache
.cache
.astro
```

## Examples

```sh
npx mf map --stdout
npx mf map --write
npx mf map --stdout --depth 3
npx mf map --write --include-nested
npx mf map --write --root-only
```

With `--write`, the command creates or updates `REPO_MAP.md` at the repository root.

The generated map starts with stable generated metadata, including `anchor_count` and `source_fingerprint`.
It does not include volatile values such as generation time, branch names, remote URLs, or change logs.
`mf check --strict` reports a stale source fingerprint when the map should be regenerated.

## Nested Repositories

When `.mustflow/config/mustflow.toml` sets both `map.include_nested = true` and `workspace.enabled = true`, `mf map` discovers independent repositories under configured `workspace.roots` and lists them in a `Nested Repositories` section.

`--include-nested` enables that section for the current run even when `map.include_nested` is `false`. It still only scans paths declared in `workspace.roots`.

`--root-only` forces the current run to ignore nested repositories even when configuration enables them. The two options are mutually exclusive.

This section does not list internal files from nested repositories. It only shows entrypoints such as `AGENTS.md`, `REPO_MAP.md`, `.mustflow/config/commands.toml`, `.mustflow/context/INDEX.md`, `DESIGN.md`, and major manifest files.

## Structured Output

`mf map` does not currently provide a JSON output format.

Agents should not treat the generated Markdown as a complete file index. Use it as a navigation map by reading entrypoint paths from the `Root Anchors` and `Nested Repositories` sections first.

## Help and Exit Codes

```sh
npx mf map --help
```

The help output is organized into `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: The map was generated and optionally written.
- Exit code `1`: The command received an unknown option, an invalid `--depth` value, or incompatible nested-repository options.

When both `--stdout` and `--write` are omitted, the command prints the map to the terminal by default.
