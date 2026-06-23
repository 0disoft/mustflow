---
title: mf script-pack
description: Lists and runs bundled mustflow utility scripts under one command namespace.
---

`mf script-pack` exposes bundled utility scripts without turning every small checker into a new
top-level command.

The bundled scripts include `code/outline`, which scans TypeScript and JavaScript files for
symbol headers, line ranges, and source-anchor metadata, `code/symbol-read`, which reads a focused source snippet by
source anchor, symbol line, or explicit line range, `core/text-budget`, which checks exact text length budgets for
plain text files or JSON string fields, and `repo/generated-boundary`, which checks whether
candidate paths cross generated, ignored, protected, vendor, or cache boundaries.

## List Scripts

```sh
npx mf script-pack list
npx mf script-pack list --json
```

The list output reports script pack ids, script refs, supported actions, usage strings, routing
phases, read-only and side-effect flags, input and output contracts, related skill names, cost,
risk level, and the report schema file for scripts that publish machine-readable reports.

Agents may use `mf run script_pack_list` when the local command contract exposes that intent. This
read-only intent is for script discovery only; running a script still depends on the selected
script's side-effect metadata and the repository command contract.

## Suggest Scripts

```sh
npx mf script-pack suggest --path src/cli/index.ts --phase before_change
npx mf script-pack suggest --changed --phase after_change --json
```

`script-pack suggest` classifies candidate paths into surfaces such as source, docs, schema,
template, skill, config, package, test, and generated output, then scores bundled scripts against
the requested phase, related skill names, and path surfaces. It recommends optional helpers only;
it does not run the scripts.

Use repeated `--path`, repeated `--skill`, and repeated `--phase` options to describe the current
work. `--changed` adds current Git working-tree paths to the suggestion input. If changed-file
discovery is unavailable, the command reports that limitation in `issues` instead of treating the
recommendation as execution proof.

## Check Text Budgets

```sh
npx mf script-pack run core/text-budget check README.md --max 5000
```

The command exits successfully only when every checked target stays within the declared budget.

Use `--min`, `--max`, or `--exact` to declare the budget. `--exact` cannot be combined with
`--min` or `--max`.

## Outline Source Files

```sh
npx mf script-pack run code/outline scan src --json
npx mf script-pack run code/outline scan src/cli/commands/script-pack.ts --max-files 20
```

`code/outline` is read-only. It scans supported TypeScript and JavaScript files for declaration
headers and `mf:anchor` comments, then reports each symbol's path, language, kind, name, start
line, end line, signature, export flag, async flag, static return metadata, and content hash.
Anchor metadata is reported separately from symbols and includes id, path, metadata line range,
purpose, search terms, invariant, risk tags, navigation-only authority flags, and a conservative
target symbol when the anchor sits directly above a declaration. Return metadata includes
explicit return annotations when present, return statement lines, a short return-expression preview,
and conservative behavior labels such as `value`, `void`, `mixed`, `implicit_undefined`,
`throws_only`, or `unknown`. Use it before reading large source files line window by line. The
outline is an orientation aid, not an AST refactoring engine or runtime value tracer.

Supported extensions are `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, and `.cjs`.
Directory scans skip common generated, cache, vendor, and build directories such as `.git`,
`.mustflow/cache`, `node_modules`, `dist`, `build`, `coverage`, `.next`, and `.turbo`.

## Read Source Symbols

```sh
npx mf script-pack run code/symbol-read read src/core/code-outline.ts --start-line 320 --json
npx mf script-pack run code/symbol-read read --anchor auth.session.resolve --json
npx mf script-pack run code/symbol-read read src/core/code-outline.ts --start-line 1 --end-line 40 --context-lines 2 --json
```

`code/symbol-read` is read-only. `--anchor <id>` resolves a structured source anchor to its
conservative target symbol and returns only that symbol range. If the anchor is missing,
duplicated, or not directly attached to a readable symbol, the command fails instead of guessing a
nearby range. When `--end-line` is omitted in path mode, it resolves `--start-line` to the outline
symbol that starts at or contains that line and returns only that symbol range. When `--end-line` is
present, it returns the explicit bounded range. Use `--context-lines` to include a small amount of
surrounding context without paging through the entire file.

## Check Generated Boundaries

```sh
npx mf script-pack run repo/generated-boundary check src/cli/index.ts --json
npx mf script-pack run repo/generated-boundary check dist/cli/index.js .mustflow/config/manifest.lock.toml --json
```

`repo/generated-boundary` is read-only. It checks the explicit paths you pass against
`.mustflow/config/mustflow.toml` generated, ignored, and protected path policies plus built-in
vendor and cache patterns. Use it before editing candidate paths or after reviewing a changed-file
set when generated or protected-file drift would make completion evidence misleading.

## Counting Units

```sh
npx mf script-pack run core/text-budget check docs/intro.md --min 20 --max 120 --unit word
```

Supported units are:

- `grapheme`: user-visible character clusters, used by default
- `code-point`: Unicode code points
- `utf16`: JavaScript string length
- `utf8-byte`: UTF-8 byte length
- `word`: word-like segments when available, with a whitespace fallback
- `line`: line segments after splitting on line breaks

For `line`, a trailing line break contributes an empty final line.

## JSON String Fields

```sh
npx mf script-pack run core/text-budget check package.json --json-pointer /description --max 80 --json
```

`--json-pointer <pointer>` parses each target as JSON, resolves the pointer, and counts the
resolved string value. Pointer parse failures, missing fields, and non-string values are reported
as stable finding codes in JSON mode.

## JSON Fields

```sh
npx mf script-pack list --json
npx mf script-pack suggest --path AGENTS.md --phase before_change --json
npx mf script-pack run code/outline scan src --json
npx mf script-pack run code/symbol-read read src/core/code-outline.ts --start-line 320 --json
npx mf script-pack run code/symbol-read read --anchor auth.session.resolve --json
npx mf script-pack run core/text-budget check package.json --json-pointer /description --max 80 --json
npx mf script-pack run repo/generated-boundary check AGENTS.md .mustflow/config/manifest.lock.toml --json
```

`mf script-pack list --json` is validated by `schemas/script-pack-catalog.schema.json`.
`mf script-pack suggest --json` is validated by
`schemas/script-pack-suggestion-report.schema.json`.
`code/outline` JSON reports are validated by `schemas/code-outline-report.schema.json`.
`code/symbol-read` JSON reports are validated by
`schemas/code-symbol-read-report.schema.json`.
`core/text-budget` JSON reports are validated by `schemas/text-budget-report.schema.json`.
`repo/generated-boundary` JSON reports are validated by
`schemas/generated-boundary-report.schema.json`.

The script-pack catalog includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `action`: Always `list`.
- `ok`: Whether the catalog was produced successfully.
- `mustflow_root`: Current mustflow root.
- `packs`: Bundled script packs and their scripts.
- `scripts[].use_when`: Human-readable selection hints.
- `scripts[].phases`: Suggested workflow phases such as `before_change`, `after_change`, or `review`.
- `scripts[].read_only`, `scripts[].mutates`, and `scripts[].network`: Side-effect flags.
- `scripts[].inputs` and `scripts[].outputs`: Stable input and output capability labels.
- `scripts[].related_skills`: Skill procedures that commonly benefit from the script.
- `scripts[].risk_level` and `scripts[].cost`: Lightweight selection hints.
- `scripts[].report_schema_file`: Report schema file when the script has a JSON report contract.

The script-pack suggestion report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `action`: Always `suggest`.
- `status`: `suggested`, `empty`, or `partial`.
- `ok`: Whether the suggestion report was produced.
- `mustflow_root`: Current mustflow root.
- `input`: Requested phases, skills, paths, and whether `--changed` was used.
- `analyzed_paths`: Path surface classifications used for scoring.
- `suggestions`: Ranked script refs with score, confidence, matched evidence, side-effect flags,
  report schema, and run hint.
- `issues`: Human-readable limitations such as unavailable changed-file discovery.

The code-outline report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `scan`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: File size, file count, extension, and ignored-directory limits used for scanning.
- `input_hash`: Hash of the scanned input state.
- `files`: Per-file language, content hash, size, line count, and symbol count.
- `anchors`: Per-anchor id, path, metadata line range, purpose, search terms, invariant, risk
  tags, navigation-only authority flags, and conservative target symbol metadata.
- `symbols`: Per-symbol path, line range, kind, name, signature, export flag, async flag, static
  return type, return behavior, return count, return lines, return preview, parent, and content
  hash.
- `findings`: Stable finding codes for outside-root paths, unreadable paths, unsupported files,
  file-size limits, and file-count limits.
- `issues`: Human-readable issue summaries.

The code-symbol-read report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `read`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: Requested source anchor or line range, context, file-size limit, and snippet-size limit.
- `input_hash`: Hash of the read input state.
- `target`: File hash, requested anchor id, requested lines, resolved lines, context lines, optional
  anchor metadata, and optional matched symbol.
- `snippet`: The bounded source text and its start/end lines, or `null` when no snippet was produced.
- `findings`: Stable finding codes for outside-root paths, unreadable files, invalid ranges,
  missing symbols, and too-large snippets.
- `issues`: Human-readable issue summaries.

The text-budget report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `check`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: Declared budget, unit, JSON pointer, and maximum file size.
- `input_hash`: Hash of the checked input state.
- `metrics`: Per-target measured lengths and content hashes.
- `findings`: Stable finding codes for budget violations or input errors.
- `artifacts`: Input artifacts and hashes.
- `issues`: Human-readable issue summaries.

The generated-boundary report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `check`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: Config and built-in path patterns used for classification.
- `input_hash`: Hash of the checked path inputs and policy.
- `targets`: Per-path existence, kind, matched boundary categories, and matched patterns.
- `findings`: Stable finding codes for generated, ignored, protected, vendor, cache, outside-root,
  or unreadable paths.
- `issues`: Human-readable issue summaries.

## Exit Codes

- `0`: The script-pack command completed successfully, or every checked text-budget target passed.
- `1`: Input was invalid, an unknown script was requested, a budget failed, a boundary matched, or
  a read/JSON error was found.
