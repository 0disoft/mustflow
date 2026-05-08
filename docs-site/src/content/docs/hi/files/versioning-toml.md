---
title: versioning.toml
description: Optional config file for declaring repository-specific version sources.
---

`.mustflow/config/versioning.toml` is optional. Use it only when automatic discovery cannot identify the repository's real version source clearly enough.

`mf init` does not install this file by default.

## Basic Shape

```toml
schema_version = "1"

[[sources]]
path = "package.json"
kind = "package_manifest"
authority = "source"
description = "Published package version."
```

## Fields

- `schema_version`: File format version. Use `"1"`.
- `sources`: One or more declared version source entries.
- `sources.path`: Relative path to the version file inside the mustflow root.
- `sources.kind`: `package_manifest`, `template_manifest`, or `template_lock`.
- `sources.authority`: `source` when this file owns the version, or `derived` when it follows another source.
- `sources.description`: Optional short note for humans.

## Behavior

`mf version-sources` includes declared entries and marks them with `declared = true` in JSON output.

`mf check` validates the file shape when it exists. `mf check --strict` also reports declared source paths that do not exist.

This file does not grant release, commit, tag, push, or version-bump authority. Those actions still depend on direct user instructions, host rules, and the configured command contract.
