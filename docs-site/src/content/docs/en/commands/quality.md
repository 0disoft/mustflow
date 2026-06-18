---
title: mf quality
description: Inspects changed files for quality-gaming patterns without writing files.
---

`mf quality check` looks for common agent workarounds that satisfy a visible metric while weakening
the actual engineering goal. It checks changed files by default and never writes project files.

Use this command with a configured `quality_gaming_check` intent when a task involves line-count
limits, complexity budgets, lint or type gates, test gates, or assistant-authored refactors.

## Check Changed Files

```sh
npx mf quality check --json
```

The default scope is changed text files from Git. Findings include long-line stuffing, multiple
statements on one line, new suppressions, type escapes, test bypass markers, placeholder
implementations, and executable-looking logic under generated or vendor paths.

## Audit Tracked Files

```sh
npx mf quality check --all --json
```

Use `--all` for a repository-wide tracked-file audit. The tracked-file mode also reports large
helper, util, manager, common, or misc containers as design-risk candidates.

## JSON Fields

- `scope`: Checked scope. `changed` by default, or `tracked` when `--all` is used.
- `git_tracked`: Whether Git files could be listed.
- `checked_files`: Number of selected text files inspected.
- `risk_count`: Total number of detected quality-gaming risks.
- `risky_files`: Files with at least one risk, including per-risk code, severity, line, detail, and metric.
- `issues`: Git or filesystem problems that prevented a clean inspection.

## Exit Codes

- `0`: The selected files were inspected and no quality-gaming risks were found.
- `1`: Risks were found, Git/filesystem inspection failed, or input was invalid.
