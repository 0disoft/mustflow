---
title: mf version-sources
description: Read-only command to inspect detected package and template version sources.
---

`mf version-sources` reports which files in the current mustflow root look like package or template version sources. For Go modules, it reports `go.mod` only when the repository also has a semantic-version release tag such as `v1.2.3`. It also reads optional declarations from `.mustflow/config/versioning.toml`.

The command does not edit versions, create tags, commit, or push. It exists so agents and future dashboard panes can inspect the same version-source discovery used by `mf check --strict`.

## Output

- `mustflow root`: Current mustflow root.
- `Versioning preferences`: Whether `[release.versioning]` preferences are enabled.
- `Sources`: Detected or declared files and their source kind.

## Example

```sh
npx mf version-sources
```

Example output:

```text
mustflow version sources
mustflow root: C:\path\to\repo
Versioning preferences: enabled

Sources
- package.json (package_manifest)
```

## JSON Fields

```sh
npx mf version-sources --json
```

Machine-readable output uses these fields:

- `schema_version` (`string`): Output format version.
- `command` (`string`): Always `version-sources`.
- `mustflow_root` (`string`): Current mustflow root.
- `versioning_enabled` (`boolean`): Whether version-impact preferences are enabled.
- `sources` (`object[]`): Version sources with `path`, `kind`, and optional `declared` and `authority` fields.

## Help and Exit Codes

```sh
npx mf version-sources --help
```

- Exit code `0`: Version sources were inspected and printed.
- Exit code `1`: The command received an unknown option.
