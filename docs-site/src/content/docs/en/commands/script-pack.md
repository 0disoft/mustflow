---
title: mf script-pack
description: Lists and runs bundled mustflow utility scripts under one command namespace.
---

`mf script-pack` exposes bundled utility scripts without turning every small checker into a new
top-level command.

The bundled scripts include `code/outline`, which scans TypeScript and JavaScript files for
symbol headers, line ranges, and source-anchor metadata, `code/dependency-graph`, which traces bounded
relative import graph edges, `code/change-impact`, which analyzes git-diff impact and verification
hints, `code/symbol-read`, which reads a focused source snippet by
source anchor, symbol line, or explicit line range, `code/route-outline`, which scans Hono,
Elysia, and Axum route metadata, `code/export-diff`, which compares exported TypeScript and JavaScript
signatures against a git base, `docs/reference-drift`, which checks documented references against
current local surfaces, `core/text-budget`, which checks exact text length budgets for plain text
files or JSON string fields, `repo/config-chain`, which inspects nearby static config inheritance,
and `repo/generated-boundary`, which checks whether candidate paths cross generated, ignored,
protected, vendor, or cache boundaries. `repo/related-files` maps direct imports, importers,
same-basename siblings, and nearby config or package boundaries for source-oriented navigation.

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

When enough path evidence is available, each suggestion's `run_hint` is a concrete read-only
command for the current path, such as `code/outline`, `core/text-budget`, or
`repo/generated-boundary` with `--json`. `docs/reference-drift` is recommended for docs, schema,
CLI, and script-pack surface changes where stale examples or path references are likely.
`code/dependency-graph` and `repo/related-files` are recommended for source and test paths when dependency
or adjacent-file discovery is
useful. Helpers that need data from another helper keep that dependency explicit; for example,
`code/symbol-read` is presented as a follow-up after `code/outline` identifies a symbol line or
source anchor.

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

## Trace Dependency Graphs

```sh
npx mf script-pack run code/dependency-graph scan src/cli/index.ts --json
npx mf script-pack run code/dependency-graph scan src/core --max-depth 3 --max-nodes 120 --json
```

`code/dependency-graph` is read-only. It traces relative TypeScript and JavaScript `import`,
`export ... from`, `require`, and dynamic `import()` edges from target files or directories. The
report includes graph nodes, edges, target flags, bounded depth, import and importer counts, cycle
hints, policy limits, findings, and issues.

Use it before source edits when import impact matters. It intentionally does not resolve package
imports, tsconfig aliases, bundler aliases, or runtime side effects.

## Analyze Change Impact

```sh
npx mf script-pack run code/change-impact analyze --base HEAD --json
npx mf script-pack run code/change-impact analyze src --base main --head HEAD --json
```

`code/change-impact` is read-only. It reads `git diff --name-status`, classifies changed source,
test, documentation, schema, package, template, workflow, and i18n surfaces, and returns bounded
impact candidates, optional script-pack hints, and verification intent hints. For changed source
files, it also uses the relative dependency graph to identify files that import the changed file.

Use it after edits when you need a compact checklist for what to inspect or verify next. It is a
hinting helper, not proof that a test, command, or downstream behavior is safe.

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

## Outline Routes

```sh
npx mf script-pack run code/route-outline scan src/cli/index.ts --json
```

`code/route-outline` is read-only. It scans Hono, Elysia, Axum, and NestJS route files for
route methods, paths, handlers, lifecycle chains, line ranges, framework evidence, and content hashes. Use it
before reading large route modules when the useful first question is "which handlers and lifecycle
hooks are here?"

## Compare Exported Signatures

```sh
npx mf script-pack run code/export-diff compare src/core/public-json-contracts.ts --base HEAD --json
```

`code/export-diff` is read-only. It compares exported TypeScript and JavaScript declarations,
signatures, return metadata, and package surface hints against a git base. Use it after public-ish
source edits to review export additions, removals, signature changes, return-type changes, and
unresolved re-export findings without paging through every changed file.

## Check Reference Drift

```sh
npx mf script-pack run docs/reference-drift check README.md schemas/README.md --json
npx mf script-pack run docs/reference-drift check docs-site/src/content/docs --max-files 80 --json
```

`docs/reference-drift` is read-only. It scans Markdown and MDX files for documented `mf` commands,
`mf script-pack run <pack>/<script>` refs, `*.schema.json` names, and conservative backticked
repository paths. It checks those references against the current command registry, script-pack
registry, public schema manifest, and local filesystem.

Use it after CLI, script-pack, schema, README, or docs-site changes before claiming docs are
synchronized. Historical changelogs are not scanned by default because older examples may be
intentionally historical.

## Check Generated Boundaries

```sh
npx mf script-pack run repo/generated-boundary check src/cli/index.ts --json
npx mf script-pack run repo/generated-boundary check dist/cli/index.js .mustflow/config/manifest.lock.toml --json
```

`repo/generated-boundary` is read-only. It checks the explicit paths you pass against
`.mustflow/config/mustflow.toml` generated, ignored, and protected path policies plus built-in
vendor and cache patterns. Use it before editing candidate paths or after reviewing a changed-file
set when generated or protected-file drift would make completion evidence misleading.

## Inspect Config Chains

```sh
npx mf script-pack run repo/config-chain inspect src/cli/index.ts --json
npx mf script-pack run repo/config-chain inspect tsconfig.json package.json --json
```

`repo/config-chain` is read-only. It inspects nearby package, TypeScript, ESLint, Prettier, Vite,
Vitest, Tailwind, Jest, Playwright, and mustflow config files, then reports static inheritance,
reference, workspace, dynamic-config, path, and content-hash metadata without executing dynamic
config code.

## Map Related Files

```sh
npx mf script-pack run repo/related-files map src/cli/index.ts --json
npx mf script-pack run repo/related-files map src/core/code-outline.ts --max-candidates 50 --json
```

`repo/related-files` is read-only. It conservatively maps direct relative imports, files that import
the target, same-basename test, docs, style, and type siblings, and parent config files such as
`package.json`, `tsconfig*.json`, ESLint, Vite, Vitest, and Tailwind configs. It reports candidate
paths with relationship, confidence, source path, target path, and line metadata when available.

Use it to decide which nearby files are worth inspecting before widening context reads. Do not treat
its output as a verification scope, dependency graph, or proof that no other files matter.

## Counting Units

```sh
npx mf script-pack run core/text-budget check README.md --min 20 --max 5000 --unit word
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
npx mf script-pack run code/dependency-graph scan src/cli/index.ts --json
npx mf script-pack run code/change-impact analyze --base HEAD --json
npx mf script-pack run code/symbol-read read src/core/code-outline.ts --start-line 320 --json
npx mf script-pack run code/symbol-read read --anchor auth.session.resolve --json
npx mf script-pack run code/route-outline scan src/cli/index.ts --json
npx mf script-pack run code/export-diff compare src/core/public-json-contracts.ts --base HEAD --json
npx mf script-pack run docs/reference-drift check README.md schemas/README.md --json
npx mf script-pack run core/text-budget check package.json --json-pointer /description --max 80 --json
npx mf script-pack run repo/config-chain inspect src/cli/index.ts --json
npx mf script-pack run repo/generated-boundary check AGENTS.md .mustflow/config/manifest.lock.toml --json
npx mf script-pack run repo/related-files map src/cli/index.ts --json
```

`mf script-pack list --json` is validated by `schemas/script-pack-catalog.schema.json`.
`mf script-pack suggest --json` is validated by
`schemas/script-pack-suggestion-report.schema.json`.
`code/outline` JSON reports are validated by `schemas/code-outline-report.schema.json`.
`code/dependency-graph` JSON reports are validated by
`schemas/dependency-graph-report.schema.json`.
`code/change-impact` JSON reports are validated by `schemas/change-impact-report.schema.json`.
`code/symbol-read` JSON reports are validated by
`schemas/code-symbol-read-report.schema.json`.
`code/route-outline` JSON reports are validated by `schemas/route-outline-report.schema.json`.
`code/export-diff` JSON reports are validated by `schemas/export-diff-report.schema.json`.
`docs/reference-drift` JSON reports are validated by `schemas/reference-drift-report.schema.json`.
`core/text-budget` JSON reports are validated by `schemas/text-budget-report.schema.json`.
`repo/config-chain` JSON reports are validated by `schemas/config-chain-report.schema.json`.
`repo/generated-boundary` JSON reports are validated by
`schemas/generated-boundary-report.schema.json`.
`repo/related-files` JSON reports are validated by `schemas/related-files-report.schema.json`.

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
  report schema, and `run_hint`. `run_hint` is a concrete command when path evidence is sufficient,
  or a follow-up instruction when another script must first identify a line or anchor.
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

The route-outline report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `scan`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: File size, file count, extension, and ignored-directory limits used for scanning.
- `input_hash`: Hash of the scanned input state.
- `files`: Per-file language, content hash, framework evidence, size, line count, and route count.
- `routes`: Route method, route path, framework, line range, optional handler name, lifecycle chain, and
  content hash metadata.
- `findings`: Stable finding codes for outside-root paths, unreadable paths, unsupported files,
  file-size limits, and file-count limits.
- `issues`: Human-readable issue summaries.

The export-diff report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `compare`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: Base ref, optional head ref, worktree mode, path filters, and scan limits.
- `input_hash`: Hash of the compared input state.
- `package_surface`: Package `type`, export, bin, and types hints when available.
- `files`: Per-file exported declaration counts before and after the comparison.
- `exports`: Added, removed, changed, or unchanged export entries with signature, return, and
  compatibility metadata.
- `findings`: Stable finding codes for git input failures, scan limits, and unresolved re-exports.
- `issues`: Human-readable issue summaries.

The reference-drift report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `check`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: Default paths, file size and file count limits, path filters, and checked reference
  kinds.
- `input_hash`: Hash of the checked document state and reference statuses.
- `files`: Per-document content hash, size, line count, and reference count.
- `references`: Checked reference kind, path, line, value, target, status, and message.
- `summary`: Counts for files, checked references, resolved references, missing paths, unknown
  references, and skipped references.
- `findings`: Stable finding codes for stale commands, script-pack refs, schema names, repo paths,
  and input limits.
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

The config-chain report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `inspect`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: File size, config count, config name, and ignored-directory limits.
- `input_hash`: Hash of inspected config metadata, edges, and findings.
- `targets`: Per-input existence and file or directory kind.
- `configs`: Static metadata for package, TypeScript, tooling, and mustflow config files.
- `edges`: Parent config, `extends`, reference, and workspace edges.
- `findings`: Stable finding codes for parse errors, dynamic configs, missing references, external
  references, path errors, and scan limits.
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

The related-files report includes:

- `schema_version`: Output format version.
- `command`: Always `script-pack`.
- `pack_id`, `script_id`, and `script_ref`: The script identity.
- `action`: Always `map`.
- `status`: `passed`, `failed`, or `error`.
- `ok`: Whether the status is `passed`.
- `mustflow_root`: Current mustflow root.
- `policy`: File size, scan count, candidate count, extension, and ignored-directory limits.
- `input_hash`: Hash of the target paths, candidates, findings, policy, and bounded issues.
- `targets`: Per-input path, existence, kind, and language metadata.
- `candidates`: Related paths with relationship, confidence, reason, source path, target path, and
  optional source line.
- `truncated`: Whether scan or candidate limits were reached.
- `findings`: Stable finding codes for outside-root paths, unreadable paths, file scan limits, and
  candidate limits.
- `issues`: Human-readable issue summaries.

## Exit Codes

- `0`: The script-pack command completed successfully, or every checked text-budget target passed.
- `1`: Input was invalid, an unknown script was requested, a budget failed, a boundary matched, or
  a read/JSON error was found.
