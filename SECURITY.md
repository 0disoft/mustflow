# Security Policy

This file applies to the mustflow repository itself. It is not installed into
user projects by `mf init`.

## Supported Versions

Security fixes target the current npm package version and the `main` branch.
Older versions may receive guidance when the impact is clear, but maintainers
do not promise backports until a release policy is published.

## Reporting A Vulnerability

Do not include exploit details, secrets, tokens, private repository content, or
customer data in a public issue.

Use GitHub private vulnerability reporting when it is available for this
repository:

<https://github.com/0disoft/mustflow/security/advisories/new>

If private reporting is unavailable, open a minimal public issue that says a
security report exists and describes only the affected area at a high level.
Ask for a private maintainer contact path before sharing reproduction details.

## Useful Report Details

Include the following when they can be shared safely:

- Affected mustflow version or commit.
- Affected command, template file, schema, generated output, or workflow file.
- Expected safe behavior.
- Actual behavior.
- Minimal reproduction steps that do not expose secrets or third-party systems.
- Whether the issue affects only this repository or also projects initialized
  with `mf init`.

## Scope

Security reports are most useful when they involve one of these boundaries:

- Command execution outside `.mustflow/config/commands.toml`.
- Incorrect handling of configured command status, lifecycle, timeout, or
  working directory rules.
- Template updates that overwrite customized user files unexpectedly.
- Leaking secrets through generated maps, run receipts, cache files, reports,
  or documentation.
- Installed workflow files that authorize unsafe agent behavior.
- Published schemas or reports that encourage unsafe automation decisions.

General feature requests, documentation gaps, and non-security bugs should use
regular GitHub issues.

## Automated Security Checks

Repository CodeQL analysis is configured in `.github/workflows/codeql.yml` for
JavaScript/TypeScript source and GitHub Actions workflows. It runs on pull
requests, pushes to `main`, a weekly schedule, and manual workflow dispatch.

Repository GitHub Actions hygiene checks are configured in
`.github/workflows/actions-hygiene.yml`. `actionlint` checks workflow syntax and
inline workflow mistakes, while `zizmor` audits workflow and action definitions
for GitHub Actions security risks.

Repository OpenSSF Scorecard checks are configured in
`.github/workflows/scorecard.yml` for supply-chain security posture scoring on
`main` pushes and a weekly schedule. The workflow publishes SARIF to code
scanning and public project results to the Scorecard API.

Repository OSV-Scanner checks are configured in
`.github/workflows/osv-scanner.yml` for dependency vulnerability scanning.
Pull request scans run when dependency files change, while full scans run on
dependency file pushes to `main`, a weekly schedule, and manual workflow
dispatch. The workflow publishes SARIF to code scanning when GitHub code
scanning is available.

Automated findings are triage input for maintainers. They do not replace
private vulnerability reports for issues that include exploit details, secrets,
private repository content, or customer data.

## Safe Research Guidelines

- Test only on repositories and systems you own or have permission to inspect.
- Do not run destructive commands against third-party projects.
- Do not include live credentials, private data, or raw logs with sensitive
  content in reports.
- Prefer small reproductions that demonstrate the unsafe decision boundary
  without weaponized payloads.

## Disclosure

Maintainers aim to acknowledge reports, validate impact, prepare a fix, and
publish release notes with an appropriate level of detail. Exact timelines
depend on severity, reproduction quality, and maintainer availability.
