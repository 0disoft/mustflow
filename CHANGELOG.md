# Changelog

This changelog starts with the current mustflow development line. Earlier
repository history is available in Git.

This file applies to the mustflow repository itself. It is not installed into
user projects by `mf init`.

## Unreleased

### Added

- Added repository contribution, security, and changelog documents for mustflow
  maintainers and contributors.
- Added repository CI, issue templates, and a pull request template for
  mustflow maintainer workflows.
- Added explicit authority-boundary guidance to installed project context
  templates.

### Notes

- Keep changelog entries focused on user-visible CLI behavior, installed
  template changes, schemas, command contracts, documentation surfaces,
  packaging, and maintenance policy.
- Do not record internal refactors unless they affect a public contract,
  release process, or contributor workflow.
- When preparing a release, move relevant entries from `Unreleased` into a
  versioned section and keep version sources synchronized according to
  `.mustflow/config/preferences.toml` `[release.versioning]`.
