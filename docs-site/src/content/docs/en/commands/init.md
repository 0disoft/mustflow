---
title: mf init
description: Initializes mustflow documents in a user repository.
---

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

`REPO_MAP.md` is not copied from a static template; it is generated based on the repository structure upon request.
`manifest.lock.toml` is also generated after a successful `mf init` to record the actual installation state.
`DESIGN.md` is not created by mustflow. If a project already includes one, `mf map` can treat it as an optional visual-design anchor.

## Template Source Layout

The installation target paths remain consistent, but the package-side template is split by purpose:

```text
templates/default/
├─ common/
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ ko/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ zh/
   ├─ es/
   ├─ fr/
   └─ hi/
```

`common/` contains language-neutral TOML configuration. `locales/<locale>/` contains Markdown
documents and skill files selected by `--locale`. The `zh`, `es`, `fr`, and `hi`
folders currently contain English placeholders until translations are provided.

## Rules

- Copied files are limited to workflow documents read directly by LLM agents.
- Installing the package alone does not modify user files.
- By default, existing file conflicts will cause the process to abort before any files are written.
- If `AGENTS.md` already exists, `--merge` can be used to insert only the mustflow-managed block.
- `--force` backs up conflicting files under `.mustflow/backups/` before overwriting them.
- `REPO_MAP.md` is generated from the repository structure rather than being copied from a static template.
- `manifest.lock.toml` records installed-file hashes, the template identifier, and the action taken for each file.
- `.mustflow/context/` contains agent-facing project context, not a general documentation archive.
- `README.md`, `.github/`, and existing `config/`, `docs/`, and `skills/` directories are not modified.
- Source code, package-manager configurations, and CI configurations are not created.
- `--dry-run` prints the installation plan without writing files.
- `manifest.lock.toml` is not written if the installation aborts due to conflicts or is run with `--dry-run`.

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



## Profiles and Languages

`profile` describes the project type rather than a country or language.

Supported built-in profiles are:

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale` specifies the language of the installed mustflow documents. The current default template provides `en`, `ko`, `zh`, `es`, `fr`, and `hi`, defaulting to `en`. The `zh`, `es`, `fr`, and `hi` documents currently contain English placeholders until translations are available.

`--agent-lang` is the default language for agent final reports. It may differ from the mustflow document locale.

User-facing product text localization is recorded separately with `--product-source-locale` and `--product-locale`. These values are written to `[product_i18n]` in `.mustflow/config/preferences.toml`; they are not the mustflow document language or CLI output language.

For example, a project can request Korean agent reports, install Korean mustflow documents, keep English product source strings, and support Korean users:

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## Structured Output

`mf init` does not currently provide a JSON output format.

Automated scripts should not parse human-readable output. After installation, use `mf status --json` or `mf check --json` to verify the result.

## Help and Exit Codes

```sh
npx mf init --help
```

Help output is ordered as `Usage`, `Options`, `Examples`, and `Exit codes`.

- Exit code `0`: Install completed, no-op completed, or `--dry-run` plan was printed.
- Exit code `1`: Unknown options, file conflicts, or incompatible options stopped the write.

Unknown options print the error reason together with guidance to run `mf init --help`.
