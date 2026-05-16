---
title: mf classify
description: Read-only command that classifies changed paths, public surfaces, and validation reasons.
---

`mf classify --changed` reads `git status --short --untracked-files=all`, classifies the changed paths, and reports which public surfaces and validation reasons are affected.
Paths that do not match a known classification rule are still reported with `surface.kind: "unclassified_path"` and `unknown_change` so verification planning can surface a conservative check or an explicit gap instead of producing an empty plan.

Use explicit paths when you want to inspect a planned change before editing files:

```sh
npx mf classify README.md schemas/classify-report.schema.json --json
```

## Output

- `mustflow root`: Current mustflow root.
- `Source`: Whether paths came from Git changes or explicit arguments.
- `Files`: Number of classified files.
- `Public surfaces`: Number of paths that affect public or installed surfaces.
- `Validation reasons`: `required_after` reason strings that future verification planning can use.
- `Update policies`: Merged surface update policies, including `update_or_mark_stale` for translated documentation or localized templates.
- `Drift checks`: Merged public-surface checks for docs, template inventory, translations, examples, schemas, and command examples.
- `Classifications`: Per-path change kind, public surface kind, update policy, and drift checks.

Translated documentation and localized templates use `update_or_mark_stale` when the source cannot be confidently updated in the same change.

## JSON Fields

```sh
npx mf classify --changed --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `classify`.
- `mustflow_root` (`string`): Current mustflow root.
- `source` (`string`): `changed` or `paths`.
- `files` (`string[]`): Classified repository-relative paths.
- `classifications` (`object[]`): Per-path change kinds and public surface contract.
- `summary` (`object`): Counts and merged validation reasons, change kinds, update policies, drift checks, and affected contracts.

## Exit Codes

- `0`: The classification was printed.
- `1`: Input was invalid.
