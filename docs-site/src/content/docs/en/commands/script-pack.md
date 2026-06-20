---
title: mf script-pack
description: Lists and runs bundled mustflow utility scripts under one command namespace.
---

`mf script-pack` exposes bundled utility scripts without turning every small checker into a new
top-level command.

The initial bundled script is `core/text-budget`, which checks exact text length budgets for plain
text files or JSON string fields. It counts grapheme clusters by default so multilingual copy,
emoji, and combined characters are measured closer to what users see.

## List Scripts

```sh
npx mf script-pack list
npx mf script-pack list --json
```

The list output reports script pack ids, script refs, supported actions, usage strings, and the
report schema file for scripts that publish machine-readable reports.

## Check Text Budgets

```sh
npx mf script-pack run core/text-budget check README.md --max 5000
```

The command exits successfully only when every checked target stays within the declared budget.

Use `--min`, `--max`, or `--exact` to declare the budget. `--exact` cannot be combined with
`--min` or `--max`.

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
npx mf script-pack run core/text-budget check package.json --json-pointer /description --max 80 --json
```

`mf script-pack list --json` is validated by `schemas/script-pack-catalog.schema.json`.
`core/text-budget` JSON reports are validated by `schemas/text-budget-report.schema.json`.

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

## Exit Codes

- `0`: The script-pack command completed successfully, or every checked text-budget target passed.
- `1`: Input was invalid, an unknown script was requested, a budget failed, or a read/JSON error was found.
