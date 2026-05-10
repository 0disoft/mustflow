# Contributing

Thanks for helping improve mustflow.

This file applies to the mustflow repository itself. It is not installed into
user projects by `mf init`.

## Scope

mustflow is a workflow CLI and repository contract for LLM coding agents.
Contributions should keep that boundary clear:

- Keep `mf init` small: `AGENTS.md`, `.gitignore`, and `.mustflow/**`.
- Do not add application source files, CI files, package-manager files, or
  project-owned root docs to the default installed template unless the roadmap
  explicitly calls for it.
- Keep command execution authority in `.mustflow/config/commands.toml`.
- Keep reusable agent procedure in `.mustflow/skills/**`, not in README prose.
- Keep generated files generated. Refresh them through their configured
  commands instead of editing them by hand.

## Before Opening A Pull Request

Open an issue first when the change affects public behavior, installed
templates, command execution policy, schemas, release behavior, or the
documentation structure.

Small typo fixes and narrow documentation corrections may go straight to a pull
request.

## Development Setup

Use Node.js 20 or newer. This repository uses Bun for development scripts.

```sh
bun install
```

Agents should prefer configured mustflow intents for routine verification:

```sh
mf run build
mf run test
mf run docs_validate
mf run mustflow_check
```

Human maintainers can also use the package scripts documented in `README.md`.

## Dependency Updates

Renovate is configured for hosted GitHub App use through `.github/renovate.json`.
It discovers Bun package files, Bun version declarations, GitHub Actions, and
lock files, then opens pull requests for maintainers to review.

Renovate pull requests are not auto-merged. Major updates require Dependency
Dashboard approval before Renovate creates the update pull request. Merge only
after the repository CI and the relevant configured mustflow intents pass.

Renovate updates external dependencies only. It does not own mustflow package
or template version synchronization. When a dependency update also changes CLI
behavior, installed templates, schemas, package metadata, or user-visible
documentation, follow `.mustflow/config/preferences.toml` `[release.versioning]`
and keep the repository's version sources synchronized.

## Publishing

mustflow npm releases are published from the `Publish npm package` GitHub
Actions workflow. The workflow runs when a GitHub Release is published, verifies
that the release tag matches `package.json` version with an optional leading
`v`, installs dependencies with Bun, and runs `npm publish`. The existing
`prepublishOnly` script runs the full `release:check` gate before npm accepts
the package.

The workflow is designed for npm Trusted Publishing. Maintainers must configure
the `mustflow` package on npmjs.com with this repository, the `publish-npm.yml`
workflow filename, and the `npm` GitHub environment before using it. Do not add
an `NPM_TOKEN` secret for the normal release path.

Trusted Publishing uses short-lived GitHub Actions identity tokens and npm
automatically publishes provenance attestations for public packages published
from public repositories through that path. After the trusted publisher is
confirmed working, maintainers should restrict traditional npm token publishing
in the npm package settings and remove any unused automation tokens.

## Security Automation

CodeQL is configured in `.github/workflows/codeql.yml` for JavaScript/TypeScript
source and GitHub Actions workflows. Treat CodeQL findings as security triage
items: confirm the affected boundary, decide whether the finding affects the
published package or only repository automation, and keep the fix focused on the
reported path.

GitHub Actions workflow hygiene checks are configured in
`.github/workflows/actions-hygiene.yml`. `actionlint` checks workflow syntax,
expressions, job wiring, and inline script issues. `zizmor` audits workflow and
action definitions for GitHub Actions security risks and uploads findings to
code scanning when GitHub code scanning is available.

OpenSSF Scorecard is configured in `.github/workflows/scorecard.yml` for
supply-chain security posture checks on `main` pushes and a weekly schedule.
Scorecard publishes SARIF to code scanning and publishes project results for
the public Scorecard API. Treat score changes as maintenance signals, not as a
standalone release gate.

OSV-Scanner is configured in `.github/workflows/osv-scanner.yml` for dependency
vulnerability checks. Pull request scans run when dependency files change and
block newly introduced vulnerable dependencies. Full scans run on dependency
file pushes to `main`, a weekly schedule, and manual workflow dispatch, then
publish SARIF results to code scanning. Treat findings as vulnerability triage:
update, replace, remove, or explicitly mitigate the affected dependency before
merging or releasing.

## Change Guidelines

- Keep pull requests focused on one logical change.
- Update source, tests, schemas, docs, templates, and version metadata together
  when the public contract changes.
- Do not weaken validation to make a check pass.
- Do not hide skipped checks. Explain which configured intent was unavailable,
  manual-only, or intentionally not applicable.
- Avoid broad refactors unless they directly reduce duplication or clarify a
  current roadmap item.
- Preserve localized documentation structure when updating docs-site content.

## Commit And Pull Request Style

Use conventional commit-style titles when possible:

- `feat: add command contract explanation`
- `fix: preserve customized manifest lock entries`
- `docs: clarify update policy`
- `test: cover dashboard preference saves`
- `refactor: share skill route parsing`

Pull request descriptions should include:

- What changed
- Why the change is needed
- Verification commands or configured intents run
- Checks intentionally skipped and why
- Screenshots only when a user interface changed

Repository CI runs the CLI package check and the documentation site check on
pull requests and pushes to `main`. Keep pull requests small enough that a
failing check points to one likely cause.

## Release Notes

When a change affects CLI behavior, installed templates, package metadata,
schemas, or user-visible documentation, check
`.mustflow/config/preferences.toml` `[release.versioning]` and keep the
repository's version sources synchronized as configured.

Do not create release tags or publish packages from a pull request unless a
maintainer explicitly asks for release preparation.
