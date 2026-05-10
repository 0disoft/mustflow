---
title: mf line-endings
description: Checks tracked files for CRLF/LF drift and normalizes them to LF when explicitly requested.
---

`mf line-endings` helps repositories avoid repeated Git CRLF warnings without silently rewriting the working tree.

The command inspects changed files by default. Use `--all` to scan every tracked file. It uses `.gitattributes` as the policy source and applies changes only when an LF policy is present and `--apply` is provided.

## Check

```sh
npx mf line-endings check --json
```

The check reports CRLF or mixed line endings. It does not write files.

Add `--all` when you want a repository-wide audit instead of the default changed-file check.

## Normalize

```sh
npx mf line-endings normalize --dry-run
```

The dry run lists files that would be normalized.

```sh
npx mf line-endings normalize --apply
```

Apply mode rewrites only selected text files whose line endings drift from the repository LF policy.

## JSON Fields

- `policy`: Detected policy. Currently `lf` or `unknown`.
- `policy_path`: Policy file path, or `null`.
- `scope`: Checked scope. `changed` by default, or `tracked` when `--all` is used.
- `git_tracked`: Whether tracked files could be listed.
- `checked_files`: Number of selected files inspected.
- `non_compliant_files`: Files with CRLF or mixed line endings.
- `changed_files`: Files rewritten by apply mode.
- `dry_run`: Whether normalization was preview-only.
- `wrote_files`: Whether files were written.
- `issues`: Policy or environment problems.

## Exit Codes

- `0`: No drift was found, or apply mode completed successfully.
- `1`: Drift was found in check or dry-run mode, policy is missing, Git is unavailable, or input is invalid.
