# Changelog

This changelog starts with the current mustflow development line. Earlier
repository history is available in Git.

This file applies to the mustflow repository itself. It is not installed into
user projects by `mf init`.

## Unreleased

### Added

- Added a configured `test_audit` command intent backed by a read-only JSON test
  audit script for focused-test and empty-test-file signals.
- Added a configured `test_coverage` command intent backed by a fast CLI
  coverage run with Node's built-in coverage report and no enforced thresholds.
- Added a shared command intent eligibility core decision so verification
  planning and `mf run` use the same configured, oneshot, agent-allowed,
  closed-stdin, timeout, and command-source checks.
- Added a shared command cwd boundary resolver so `mf run` keeps command working
  directories inside the current mustflow root through a reusable core policy.
- Added a conditional version sync policy so strict checks fail template versions
  ahead of the package, require equality when installed template files change,
  and warn when CLI-only releases intentionally leave the template version older.
- Added previous-snapshot source anchor status comparison for `mf index --source`
  so moved, changed, review-needed, and stale anchors are recorded in the local
  SQLite index without turning anchors into verification authority.
- Kept invalid source anchors out of the local SQLite source anchor tables so
  malformed anchors remain strict validation issues instead of cached
  navigation metadata.
- Added the `multi-agent-work-coordination` default skill so agents can keep
  parallel worker roles, write ownership, credentials, and merge responsibility
  explicit before using multiple AI workers.
- Added the `requirement-regression-guard` default skill so agents map
  requirements to regression coverage before or during implementation.
- Added the `behavior-preserving-refactor` default skill so agents can
  refactor with explicit behavior evidence, safe ordering, duplication
  judgment, and verification boundaries.
- Added configurable refactoring hotspot thresholds and candidate limits to
  preferences and `mf dashboard` settings, and documented low-cost candidate
  narrowing in the behavior-preserving refactor skill.
- Added repository contribution, security, and changelog documents for mustflow
  maintainers and contributors.
- Added repository CI, issue templates, and a pull request template for
  mustflow maintainer workflows.
- Added Renovate configuration for dependency update pull requests without
  automatic merging.
- Added a trusted npm publishing workflow for GitHub Releases with provenance
  attestations and no long-lived npm token.
- Added CodeQL analysis for JavaScript/TypeScript source and GitHub Actions
  workflows.
- Added GitHub Actions hygiene checks with actionlint and zizmor.
- Added OpenSSF Scorecard supply-chain security analysis.
- Added OSV-Scanner dependency vulnerability checks.
- Added execution-free verification plan JSON output for
  `mf verify --plan-only --json`.
- Added source anchor fingerprint and status tables to the local SQLite index
  so source navigation hints can carry derived status signals without becoming
  command authority.
- Added derived source anchor symbol fingerprints for functions, classes,
  methods, constants, signatures, and bodies in the local SQLite index.
- Added explicit authority-boundary guidance to installed project context
  templates.
- Added `mf docs review` to track LLM-created or LLM-modified documentation
  that needs prose review, with open-ended reviewer metadata and JSON output.
- Added a document review tab to `mf dashboard` for filtering pending
  documentation and marking entries approved, ignored, or needing additional
  review.
- Added a read-only status tab to `mf dashboard` for installation, manifest
  lock, template, command, latest-run, and documentation-review counts.
- Added a read-only command tab to `mf dashboard` for configured, manual-only,
  and blocked command intent details from `.mustflow/config/commands.toml`.
- Added the `docs-prose-review` skill so human or LLM reviewers can clean up
  queued documentation prose and record the review result.
- Added multiline review comments for documentation review queue entries, with
  CLI support for inline comments, comment files, and automatic cleanup of
  imported comment files.
- Added `mf version --check` to compare the installed CLI package version with
  the latest npm release and print an update command when a newer version is
  available.
- Added installed agent guidance to prefer the narrowest configured verification
  intent that covers the changed risk before running slow full-suite tests.
- Added the `codebase-orientation` default skill and strengthened default skill
  guidance for pre-change risk checks, accessibility, and localization review.
- Added the `visual-review-artifact` default skill with a static HTML review
  template for safe plan, suggestion, review, flow, and decision artifacts.
- Added the `structure-discovery-gate` default skill so agents ask only
  structure-changing questions before introducing new folders, file boundaries,
  routing, data models, or external service integration boundaries.
- Added the `repo-improvement-loop` default skill for evidence-based repository
  improvement cycles with ranked candidates, one scoped change, verification,
  and a next improvement question.

### Fixed

- Fixed strict validation to catch package and default-template manifest version
  drift when template version synchronization is enabled.
- Fixed source anchor validation so authority-like anchor text cannot claim
  permission to skip validation or change command policy.
- Fixed `mf dashboard` language switching so the current status tab content
  updates immediately without requiring a reload or tab switch.
- Clarified `mf dashboard` Git preference labels and command-intent status text
  so `manual_only` commands appear as requiring a user request instead of as
  broken or unavailable commands.

### Notes

- Keep changelog entries focused on user-visible CLI behavior, installed
  template changes, schemas, command contracts, documentation surfaces,
  packaging, and maintenance policy.
- Do not record internal refactors unless they affect a public contract,
  release process, or contributor workflow.
- When preparing a release, move relevant entries from `Unreleased` into a
  versioned section and keep version sources synchronized according to
  `.mustflow/config/preferences.toml` `[release.versioning]`.
