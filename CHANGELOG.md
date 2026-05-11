# Changelog

This changelog begins with the current mustflow development line. Earlier repository history is available in Git.

This file applies to the mustflow repository itself. It is not installed into user projects by `mf init`.

## Unreleased

### Added

- Profile-aware skill installation for `mf init` now lets the default `minimal` profile install only core everyday coding skills. Broader profiles can opt into maintainer, team, product, web, and library skill groups from the same packaged template.
- A configured `test_audit` command intent backed by a read-only JSON test audit script for focused-test and empty-test-file signals.
- A configured `test_coverage` command intent backed by a fast CLI coverage run using Node's built-in coverage report, with no enforced thresholds and `MUSTFLOW_TEST_COVERAGE_CONCURRENCY` for tuning local worker count.
- A shared command intent eligibility core decision so verification planning and `mf run` use the same configured, one-shot, agent-allowed, closed-stdin, timeout, and command-source checks.
- A shared command cwd boundary resolver so `mf run` keeps command working directories inside the current mustflow root through a reusable core policy.
- A conditional version sync policy that fails strict checks if template versions are ahead of the package, requires equality when installed template files change, and warns when CLI-only releases intentionally keep the template version older.
- A thin internal surface decision model so change classification, verification planning, source anchors, document review, and command intents can share target, reason, surface, and authority vocabulary without creating a broad policy API.
- Release-priority triage added to `mf docs review list --json` so pending documentation is classified as P0, P1, or P2 with release-blocking status and a machine-readable triage reason.
- A public JSON schema contract manifest so release tests compare schema files, schema documentation, package contents, and installed-package JSON command output from one declared surface.
- Command `resources` and `effects` contract metadata plus verification scheduling so plan-only verification can explain resource locks and serial ordering without making `mf run` parallel.
- Command-effect rows added to the local SQLite index so `mf search` can find command intents by resource locks, effect paths, and effect modes.
- Skill-route rows added to the local SQLite index so `mf search` can find matching skill procedures by route triggers and risks while showing their verification intents as metadata.
- A local-index storage-boundary test to ensure the SQLite cache keeps only approved lookup tables and does not grow into a memory store or audit log.
- An explicit `Refresh command: mf index` hint for stale local-index search failures.
- Tightened local-search coverage so all-scope source-anchor results remain navigation-only and cannot instruct agents.
- Verification plan order added to `mf dashboard` so the read-only verification tab shows copied commands, command effects, resource locks, and serial batches without running anything.
- Previous-snapshot source anchor status comparison for `mf index --source` so moved, changed, review-needed, and stale anchors are recorded in the local SQLite index without turning anchors into verification authority.
- Invalid source anchors excluded from the local SQLite source anchor tables so malformed anchors remain strict validation issues instead of cached navigation metadata.
- The `multi-agent-work-coordination` default skill so agents can keep parallel worker roles, write ownership, credentials, and merge responsibility explicit before using multiple AI workers.
- The `requirement-regression-guard` default skill so agents map requirements to regression coverage before or during implementation.
- The `behavior-preserving-refactor` default skill so agents can refactor with explicit behavior evidence, safe ordering, duplication judgment, and verification boundaries.
- Configurable refactoring hotspot thresholds and candidate limits added to preferences and `mf dashboard` settings, with documented low-cost candidate narrowing in the behavior-preserving refactor skill.
- Repository contribution, security, and changelog documents for mustflow maintainers and contributors.
- Repository CI, issue templates, and a pull request template for mustflow maintainer workflows.
- Renovate configuration for dependency update pull requests without automatic merging.
- A trusted npm publishing workflow for GitHub Releases with provenance attestations and no long-lived npm token.
- CodeQL analysis for JavaScript/TypeScript source and GitHub Actions workflows.
- GitHub Actions hygiene checks with actionlint and zizmor.
- OpenSSF Scorecard supply-chain security analysis.
- OSV-Scanner dependency vulnerability checks.
- Execution-free verification plan JSON output for `mf verify --plan-only --json`.
- Source anchor fingerprint and status tables added to the local SQLite index so source navigation hints can carry derived status signals without becoming command authority.
- Derived source anchor symbol fingerprints for functions, classes, methods, constants, signatures, and bodies in the local SQLite index.
- Explicit authority-boundary guidance added to installed project context templates.
- `mf docs review` to track LLM-created or LLM-modified documentation needing prose review, with open-ended reviewer metadata and JSON output.
- A document review tab in `mf dashboard` for filtering pending documentation and marking entries approved, ignored, or needing additional review.
- A read-only status tab in `mf dashboard` for installation, manifest lock, template, command, latest-run, and documentation-review counts.
- A read-only command tab in `mf dashboard` for configured, manual-only, and blocked command intent details from `.mustflow/config/commands.toml`.
- The `docs-prose-review` skill so human or LLM reviewers can clean up queued documentation prose and record the review result.
- Multiline review comments for documentation review queue entries, with CLI support for inline comments, comment files, and automatic cleanup of imported comment files.
- `mf version --check` to compare the installed CLI package version with the latest npm release and print an update command when a newer version is available.
- Installed agent guidance to prefer the narrowest configured verification intent that covers the changed risk before running slow full-suite tests.
- The `codebase-orientation` default skill and strengthened default skill guidance for pre-change risk checks, accessibility, and localization review.
- The `visual-review-artifact` default skill with a static HTML review template for safe plan, suggestion, review, flow, and decision artifacts.
- The `structure-discovery-gate` default skill so agents ask only structure-changing questions before introducing new folders, file boundaries, routing, data models, or external service integration boundaries.
- The `repo-improvement-loop` default skill for evidence-based repository improvement cycles with ranked candidates, one scoped change, verification, and a next improvement question.

### Changed

- Reorganized README and documentation-site entry points around the no-guessing workflow contract, showing change classification, execution-free verification planning, command receipts, navigation-only source anchors, and dashboard non-execution boundaries before deeper reference material.

### Fixed

- Strict validation now catches package and default-template manifest version drift when template version synchronization is enabled.
- Source anchor validation prevents authority-like anchor text from claiming permission to skip validation or change command policy.
- `mf dashboard` language switching now updates the current status tab content immediately without requiring a reload or tab switch.
- Clarified `mf dashboard` Git preference labels and command-intent status text so `manual_only` commands appear as requiring a user request instead of as broken or unavailable commands.

### Notes

- Keep changelog entries focused on user-visible CLI behavior, installed template changes, schemas, command contracts, documentation surfaces, packaging, and maintenance policy.
- Do not record internal refactors unless they affect a public contract, release process, or contributor workflow.
- When preparing a release, move relevant entries from `Unreleased` into a versioned section and keep version sources synchronized according to `.mustflow/config/preferences.toml` `[release.versioning]`.
