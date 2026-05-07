---
title: mf init
description: Initializes mustflow documents in a user repository.
---

`mf init` copies a mustflow template into the user repository root.

It creates `AGENTS.md` at the root and stores mustflow-managed documents and settings under `.mustflow/`.

## Created Structure

```text
AGENTS.md
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
└─ skills/
   ├─ INDEX.md
   ├─ code-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   └─ test-maintenance/SKILL.md
```

`REPO_MAP.md` is not copied from the static template. It is generated from the repository structure when the user asks for it.
`manifest.lock.toml` is also generated after a successful `mf init`; it records what was actually installed.
`DESIGN.md` is not created by mustflow. If a project already has it, `mf map` can treat it as an optional visual-design anchor.

## Template Source Layout

The installed target paths stay stable, but the package-side template is split by purpose:

```text
templates/default/
├─ common/
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   └─ ko/
      ├─ AGENTS.md
      └─ .mustflow/
```

`common/` contains language-neutral TOML configuration. `locales/<locale>/` contains Markdown
documents and skill files selected by `--locale`.

## Rules

- Copied files are limited to workflow files read directly by LLM agents.
- Installing the package alone does not modify user files.
- Existing-file conflicts abort before writing by default.
- If `AGENTS.md` already exists, `--merge` can insert only the mustflow managed block.
- `--force` backs up conflicting files under `.mustflow/backups/` before overwriting them.
- `REPO_MAP.md` is generated from the repository structure instead of copied from a static template.
- `manifest.lock.toml` records installed-file hashes, the template identifier, and the action taken for each file.
- `.mustflow/context/` contains agent-facing project context, not a general documentation archive.
- `README.md`, `.github/`, and existing `config/`, `docs/`, and `skills/` directories are not touched.
- Source code, package-manager configuration, and CI configuration are not created.
- `--dry-run` prints the install plan without writing files.
- `manifest.lock.toml` is not written when the install aborts on conflicts or runs with `--dry-run`.

## Examples

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

`--yes` makes safe defaults explicit. It does not automatically overwrite conflicting files.

## Profiles and Languages

`profile` describes the project type, not a country or language.

Supported built-in profiles are:

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale` is the language of the installed mustflow documents. The current default template provides `en` and `ko`, and defaults to `en`.

`--agent-lang` is the default language for agent final reports. It may differ from the mustflow document locale.

User-facing product text localization is recorded separately with `--product-source-locale` and `--product-locale`. These values are written to `[product_i18n]` in `.mustflow/config/preferences.toml`; they are not the mustflow document language or CLI output language.

For example, a project can request Korean agent reports, install Korean mustflow documents, keep English product source strings, and support Korean users:

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## Structured Output

`mf init` does not currently provide a JSON output format.

Automation should not parse human output text. After installation, use `mf status --json` or `mf check --json` to verify the result.

## Help and Exit Codes

```sh
npx mf init --help
```

Help output is ordered as `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: Install completed, no-op completed, or `--dry-run` plan was printed.
- Exit code `1`: Unknown options, file conflicts, or incompatible options stopped the write.

Unknown options print the error reason together with guidance to run `mf init --help`.
