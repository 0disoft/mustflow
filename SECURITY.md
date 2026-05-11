# Security Policy

This file applies to the mustflow repository itself. It is not installed into user projects by `mf init`.

## Supported Versions

Security fixes target the current npm package version and the `main` branch. Older versions may receive guidance when the impact is clear, but maintainers do not guarantee backports until a release policy is published.

## Reporting A Vulnerability

Do not include exploit details, secrets, tokens, private repository content, or customer data in a public issue.

Use GitHub private vulnerability reporting if available for this repository:

<https://github.com/0disoft/mustflow/security/advisories/new>

If private reporting is unavailable, open a minimal public issue stating that a security report exists and describing only the affected area at a high level. Request a private maintainer contact before sharing reproduction details.

## Useful Report Details

Include the following when it is safe to share:

- Affected mustflow version or commit.
- Affected command, template file, schema, generated output, or workflow file.
- Expected safe behavior.
- Actual behavior.
- Minimal reproduction steps that do not expose secrets or third-party systems.
- Whether the issue affects only this repository or also projects initialized with `mf init`.

## Scope

Security reports are most useful when they involve one of these areas:

- Command execution outside `.mustflow/config/commands.toml`.
- Incorrect handling of configured command status, lifecycle, timeout, or working directory rules.
- Template updates that overwrite customized user files unexpectedly.
- Leaking secrets through generated maps, run receipts, cache files, reports, or documentation.
- Installed workflow files that authorize unsafe agent behavior.
- Published schemas or reports that encourage unsafe automation decisions.

General feature requests, documentation gaps, and non-security bugs should use regular GitHub issues.

## Automated Security Checks

CodeQL analysis runs on JavaScript/TypeScript source and GitHub Actions workflows, configured in `.github/workflows/codeql.yml`. It triggers on pull requests, pushes to `main`, a weekly schedule, and manual workflow dispatch.

GitHub Actions hygiene checks run via `.github/workflows/actions-hygiene.yml`. `actionlint` verifies workflow syntax and inline mistakes, while `zizmor` audits workflows and action definitions for GitHub Actions security risks.

OpenSSF Scorecard checks run on `main` pushes and weekly schedules, configured in `.github/workflows/scorecard.yml`. The workflow publishes SARIF to code scanning and public project results to the Scorecard API.

OSV-Scanner dependency vulnerability scans run on pull requests when dependency files change, and full scans run on dependency file pushes to `main`, weekly schedules, and manual workflow dispatch. This is configured in `.github/workflows/osv-scanner.yml`. The workflow publishes SARIF to code scanning when GitHub code scanning is available.

Automated findings help maintainers triage issues but do not replace private vulnerability reports for issues involving exploit details, secrets, private repository content, or customer data.

## Safe Research Guidelines

- Test only on repositories and systems you own or have permission to inspect.
- Avoid running destructive commands against third-party projects.
- Do not include live credentials, private data, or raw logs containing sensitive content in reports.
- Use small reproductions that demonstrate the unsafe decision boundary without weaponized payloads.

## Disclosure

Maintainers strive to acknowledge reports, validate impact, prepare fixes, and publish release notes with appropriate detail. Timelines depend on severity, reproduction quality, and maintainer availability.
