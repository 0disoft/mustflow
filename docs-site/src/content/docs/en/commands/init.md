---
title: mf init
description: Initializes mustflow documents in a user repository.
---

It creates `AGENTS.md` at the root and stores mustflow-managed documents and settings under `.mustflow/`.

## Created Structure

```text
AGENTS.md
.gitignore
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
   ├─ diff-risk-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   ├─ project-context-authoring/SKILL.md
   ├─ skill-authoring/SKILL.md
   ├─ security-regression-tests/SKILL.md
   ├─ test-maintenance/SKILL.md
   └─ web-asset-optimization/SKILL.md
```

`REPO_MAP.md` is not copied from a static template; it is generated based on the repository structure upon request.
`manifest.lock.toml` is also generated after a successful `mf init` to record the actual installation state.
`DESIGN.md` is not created by mustflow. If a project already includes one, `mf map` can treat it as an optional visual-design anchor.

## Template Source Layout

The installation target paths remain consistent, but the package-side template is split by purpose:

```text
templates/default/
├─ common/
│  ├─ gitignore.mustflow
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

`common/` contains language-neutral TOML configuration and the managed `.gitignore`
fragment. `locales/<locale>/` contains Markdown documents and skill files
selected by `--locale`. Each supported locale folder is installable and can be
updated independently as translations evolve.

## Rules

- Copied files are limited to workflow documents read directly by LLM agents.
- Installing the package alone does not modify user files.
- By default, existing file conflicts will cause the process to abort before any files are written.
- If `AGENTS.md` already exists, `--merge` can be used to insert only the mustflow-managed block.
- `mf init` creates `.gitignore` when it is missing. If it already exists, mustflow updates only its managed block and preserves user rules.
- The managed `.gitignore` block ignores only mustflow-generated local artifacts: `.mustflow/cache/`, `.mustflow/state/`, and `.mustflow/backups/`. Project-level outputs such as `repos/`, `node_modules/`, `dist/`, or `.env` remain the user’s responsibility.
- `--force` backs up conflicting files under `.mustflow/backups/` before overwriting them.
- `REPO_MAP.md` is generated from the repository structure rather than being copied from a static template.
- `manifest.lock.toml` records installed workflow-file hashes, the template identifier, and the action taken for each tracked file. The `.gitignore` support block is not tracked by the lock file.
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
npx mf init --interactive
npx mf init --set git.auto_commit=true
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

In an interactive terminal, `mf init` asks for the document language, project
profile, and agent report language. `--interactive` forces that prompt flow.
When advanced preferences are enabled, the prompt can also set automatic
staging, automatic commits, commit message language, and commit suggestion
defaults. `--yes` installs the default English settings without prompts.

`--set` can set a small allowlist of preferences during installation:

- `git.auto_stage`
- `git.auto_commit`
- `git.auto_push=false`
- `git.commit_message.style`
- `git.commit_message.language`
- `git.commit_message.max_suggestions`
- `git.commit_message.include_body`
- `git.commit_message.split_when_multiple_concerns`
- `reporting.commit_suggestion.enabled`
- `release.versioning.impact_check`
- `release.versioning.suggest_bump`
- `release.versioning.auto_bump`
- `release.versioning.require_user_confirmation`
- `release.versioning.sync_template_version`
- `release.versioning.sync_docs_examples`
- `release.versioning.sync_tests`
- `verification.selection.strategy`
- `verification.selection.prefer_related_tests`
- `verification.selection.skip_docs_only_full_test`
- `verification.selection.skip_low_risk_code_full_test`
- `verification.selection.skip_translation_only_full_test`
- `verification.selection.skip_copy_only_full_test`
- `verification.selection.report_skipped`
- `testing.authoring.new_test_policy`
- `testing.authoring.prefer_existing_tests`
- `testing.authoring.require_new_test_rationale`
- `language.memory.summary`

`git.commit_message.style` accepts `conventional`, `descriptive`, or `gitmoji`. The `gitmoji` style suggests messages such as `✨ feat: add dashboard setting`, but it still remains a message suggestion rather than permission to commit.

`git.commit_message.language` accepts `preserve_existing`, `agent_response`, `docs`, or a locale tag such as `ja`, `de`, or `pt-BR`.

`verification.selection.strategy` accepts `risk_based`, `targeted`, or `full`.

`testing.authoring.new_test_policy` accepts `evidence_required`, `manual_approval`, or `broad`.

`mf init` allows only `git.auto_push=false`, which can reset a repository to the safe default. It cannot enable `git.auto_push=true`; if a repository truly needs that behavior, edit the file manually after installation.

## Configuration Boundaries

`mf init` does not initialize a buildable application. It installs only the workflow rules LLM coding agents need to read repository instructions, avoid command guessing, and verify their work.

| Timing | Configuration |
| --- | --- |
| Interactive prompts | Document language, project profile, agent final report language, and optional advanced Git/reporting preferences. |
| CLI-only during init | Product source locale, product target locales, and allowlisted `--set` preference overrides. |
| Edit after install | Test, lint, build, and long-running command contracts; approval and isolation policy; project context; custom skills; CI; README; and application settings. |

## Profiles and Languages

`profile` describes the project type rather than a country or language.

Supported built-in profiles are:

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale` specifies the language of the installed mustflow documents. The current default template provides `en`, `ko`, `zh`, `es`, `fr`, and `hi`, defaulting to `en`.

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
