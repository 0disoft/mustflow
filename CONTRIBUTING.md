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
