---
title: Release Checks
description: Verification flow to run before publishing the mustflow npm package.
---

mustflow publishes a CLI and templates together through npm.

Before publishing, do not only check that commands work from the local source tree. Pack the npm artifact, install it into a temporary project, and verify the public commands through `npx mf`.

## Commands

```sh
bun run release:check
```

## Purpose

- `bun run release:check`: Runs CLI checks, docs checks, and the real npm package install verification.
- `bun run check:pack`: Uses `npm pack --dry-run --json` to inspect package contents. This also runs `prepack` first.
- `bun run check:install`: Builds a real `.tgz`, installs it into a temporary project, and runs the public `npx mf` workflow.
- `bun run docs:check`: Builds the docs site and verifies navigation.

## Docs Site Deployment

The docs site source lives in `docs-site/` on the `main` branch.

In GitHub Pages settings, use `GitHub Actions` as the publishing source instead of `Deploy from a branch`.

`.github/workflows/docs-site.yml` runs when `docs-site/**` or the workflow file changes. It executes:

```sh
bun install --frozen-lockfile
bun run check
```

Then it uploads `docs-site/dist` as a GitHub Pages artifact and deploys it to the Pages environment.

`docs-site/dist` is generated output and should not be committed.

## check:install Flow

`check:install` verifies this flow:

```sh
npm pack
npm install -D ./mustflow-*.tgz
npx mf init --yes
npx mf check --json
npx mf status --json
npx mf update --dry-run --json
npx mf map --write
```

This proves the packaged `dist/` output and `templates/` work together after installation.

## Failure Meaning

- `npm pack` failure: Check package metadata and included files.
- `npm install` failure: Check dependencies, package shape, and npm compatibility.
- `npx mf init` failure: The published CLI may not be able to locate bundled templates.
- `check/status/update/map` failure: The generated files or manifest-lock workflow may be broken after install.
