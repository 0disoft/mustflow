---
title: templates/default/manifest.toml
description: Template metadata that tells mf init which files to copy and how to handle conflicts.
---

`templates/default/manifest.toml` is metadata used by `mf init` when installing a template.

This file is not copied into user repositories. It is the package-side source of truth for how mustflow installs a template.

## Role

- Declares the template identifier and description.
- Declares whether the install scope is limited to LLM-only files.
- Lists the files the template creates.
- Defines whether existing-file conflicts abort, merge a managed block, or back up and overwrite.
- Lists the follow-up checks a human should make after installation.

## Fields

- `id`: Stable template identifier.
- `name`: Human-readable template name.
- `version`: Template version.
- `description`: Template purpose.
- `common_root`: Base folder containing language-neutral files to copy.
- `locales_root`: Base folder containing locale-specific files selected by `--locale`.
- `profiles.default`: Project type used by `mf init` when none is selected.
- `profiles.available`: Project types allowed by the default template.
- `locales.default`: mustflow document locale used by `mf init` when none is selected.
- `locales.available`: Document locales actually provided by the template.
- `locales.source`: Canonical source locale for localized template documents.
- `install_policy.scope`: Install scope. The default template uses `llm_only`.
- `install_policy.copied_targets`: Targets copied directly.
- `install_policy.generated_targets`: Targets that can be generated after installation.
- `install_policy.forbidden_targets`: Targets not allowed in the default template.
- `creates`: Files the template may create.
- `after_install`: Follow-up checks for the user.
- `i18n.metadata`: Metadata file for translation tracking.
- `i18n.source_locale`: Source locale expected by `i18n.toml`.
- `conflict_policy`: Default existing-file conflict behavior. The default is to abort before writing.
- `conflict_policy.files`: Per-file conflict behavior.
- `conflict_policy.generated`: Conflict behavior for generated files.

## Install Scope

```toml
[install_policy]
scope = "llm_only"
copied_targets = [
  "AGENTS.md",
  ".mustflow/**",
]
generated_targets = [
  "REPO_MAP.md",
  ".mustflow/config/manifest.lock.toml",
  ".mustflow/state/**",
]
```

- `scope`: Means this template installs only LLM-agent workflow files.
- `copied_targets`: Paths copied directly from the template.
- `generated_targets`: Paths generated after reading the repository structure.
- `forbidden_targets`: Paths that must not be added to the default template.

The default template does not create `README.md`, `.github/`, root `docs/`, root `skills/`, source code, or package-manager configuration.
It may create `.mustflow/context/**` because those files are LLM-agent workflow context, not general project documentation.
`REPO_MAP.md`, `.mustflow/config/manifest.lock.toml`, and `.mustflow/state/**` are generated, not copied.
`.mustflow/state/**` contains local state created during use, such as `mf run` receipts.

## Profiles and Languages

Profiles describe project type, not country or language.

```toml
[profiles]
default = "minimal"
available = ["minimal", "oss", "team", "product", "library"]

[locales]
default = "en"
available = ["en", "ko", "zh", "es", "fr", "hi"]
source = "en"
```

`common_root` provides TOML configuration shared by every locale. `locales_root` provides localized
Markdown documents and skill files. `locales.available` includes only document languages that can
actually be installed. `zh`, `es`, `fr`, and `hi` currently use English text until translated.
`locales.source` is the canonical source locale used for translation tracking.

## Authoring rules

`manifest.toml` is not a document installed into the target project. It manages the mustflow template itself.

When a new file is added to a template, update `creates`, `install_policy`, and the conflict policy in this file at the same time.
Also check that the new file's primary reader is an LLM agent.
When adding a generated file, update `generated_targets` and `conflict_policy.generated` together.

`AGENTS.md` can receive a mustflow managed block through `--merge`, but configuration-file conflicts are not merged automatically.
`manifest.lock.toml` is reproducible after a successful install, so its generated-file policy is `regenerate`.
`.mustflow/state/**` is local execution state created during use, so update and removal flows should preserve it by default.
