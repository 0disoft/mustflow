---
title: mf impact
description: Read-only command that reports version impact from changed paths.
---

`mf impact --changed` reads changed paths, classifies their public surfaces, detects version sources, and reports whether the change needs a package or template version decision.

Use explicit paths when you want to inspect a planned change before editing files:

```sh
npx mf impact package.json schemas/impact-report.schema.json --json
```

The command does not edit version files, create tags, commit, or push. It only reports whether version-impact preferences and changed surfaces suggest a version decision.

## Output

- `mustflow root`: Current mustflow root.
- `Source`: Whether paths came from Git changes or explicit arguments.
- `Files`: Number of inspected files.
- `Versioning preferences`: Whether release versioning preferences are active.
- `Requires version decision`: Whether the changed paths affect release-sensitive surfaces.
- `Suggested bump`: Currently `patch` when a version decision is required, otherwise `none`.
- `Reasons`: Stable reason identifiers such as `version_source_changed` or `public_contract_changed`.
- `Version sources`: Detected package and template version sources.
- `Affected version sources`: Version source files touched by the change.
- `Affected surfaces`: Public surface kinds affected by the change.

## JSON Fields

```sh
npx mf impact --changed --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `impact`.
- `mustflow_root` (`string`): Current mustflow root.
- `source` (`string`): `changed` or `paths`.
- `files` (`string[]`): Inspected repository-relative paths.
- `versioning_enabled` (`boolean`): Whether version-impact preferences are enabled.
- `version_sources` (`object[]`): Detected package and template version sources.
- `classification_summary` (`object`): Merged change classification summary.
- `version_impact` (`object`): Version decision flag, suggested bump, reasons, affected version sources, and affected surfaces.

## Exit Codes

- `0`: The impact report was printed.
- `1`: Input was invalid.
