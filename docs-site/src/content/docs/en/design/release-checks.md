---
title: Release Checks
description: Verification flow to run before publishing the mustflow npm package.
---

mustflow publishes a CLI and templates together via npm.

Before publishing, do not rely solely on checks from the local source tree. Pack the npm artifact,
install it into a temporary project, and verify the public commands with `npx mf`.

## Commands

```sh
bun run release:check
```

For routine agent verification in this repository, prefer the configured
mustflow command intents.

```sh
mf run build
mf run test_fast
mf run test_related
mf run test
mf run test_release
mf run docs_validate_fast
mf run docs_validate
mf run mustflow_check
```

`bun run release:check` remains the publishing gate. `test_fast` runs the fast
CLI regression baseline, `test_related` selects tests from changed files and
falls back to that baseline, and `test_release` isolates package metadata and
packaging checks. `lint`, coverage, and test-audit intents remain unset or
manual-only until this repository has narrower gates for those workflows.
`docs_validate_fast` checks navigation and localized content links without a full
static site build. `docs_validate` remains the full documentation build,
search-index, and sitemap gate for release-sensitive changes.

## Purpose

- `bun run release:check`: Runs CLI checks, documentation checks, and verifies the actual npm package installation.
- `bun run check:pack`: Uses `npm pack --dry-run --json` to inspect package contents. This also runs `prepack` first.
- `bun run check:install`: Builds a real `.tgz`, installs it into a temporary project, and runs the public `npx mf` workflow.
- `bun run docs:check:fast`: Verifies navigation and localized content links without a full static build.
- `bun run docs:check`: Builds the documentation site and verifies navigation, search index, and sitemap output.

## Documentation Site Deployment

The documentation site source is located in `docs-site/` on the `main` branch.

In GitHub Pages settings, use `GitHub Actions` as the publishing source instead of `Deploy from a branch`.

`.github/workflows/docs-site.yml` runs when `docs-site/**` or the workflow file changes. Inside
`docs-site/`, it executes:

```sh
bun install --frozen-lockfile
bun run check
```

After execution, it uploads `docs-site/dist` as a GitHub Pages artifact and deploys it to the Pages
environment.

Note that `docs-site/dist` is generated output and should not be committed to the repository.

## check:install Flow

`check:install` verifies the following public package workflow:

```sh
npm pack
npm install -D ./mustflow-*.tgz
npx mf --version
npx mf init --dry-run
npx mf init --yes
npx mf check --strict --json
npx mf doctor --strict --json
npx mf context --json
npx mf run mustflow_check --json
npx mf status --json
npx mf index --json
npx mf search mustflow_check --json
npx mf update --dry-run --json
npx mf map --write
```

This ensures that the packaged `dist/` output, `templates/`, command contract, and local index
workflow function correctly together after installation.

## Troubleshooting Failures

- `npm pack` failure: Check package metadata and included files.
- `npm install` failure: Check dependencies, package structure, and npm compatibility.
- `npx mf init` failure: The published CLI may be unable to locate bundled templates.
- `check/doctor/status/update/map` failure: The generated files, command contract, local index, or
  manifest-lock workflow may be broken after installation.
