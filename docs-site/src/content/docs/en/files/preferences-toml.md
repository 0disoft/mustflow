---
title: preferences.toml
description: Defines repository-level defaults for agent language, style, Git reporting, and documentation.
---

`.mustflow/config/preferences.toml` defines repository-level defaults for agent tasks.

This file does not represent the highest authority. Direct user instructions, higher-level directives, scoped `AGENTS.md` files, existing local conventions, and the command contract all take precedence.

## Usage

- Defines defaults for response language, documentation language, code comments, logs, and user-facing text.
- Specifies defaults for derived memory, such as context compression and handoff summaries.
- Decouples project `profile`, mustflow document locale, and agent report language.
- Manages product localization behavior via the `[product_i18n]` section.
- Provides fallback values for new repositories where established conventions are not yet visible.
- Ensures that automatic staging, committing, and pushing remain disabled by default.
- Distinguishes commit message suggestions from the authority to execute actual commits.
- Enables `mf check` to validate preference configurations.
- Serves as the source for `mf help preferences` summaries.

## Basic Shape

```toml
schema_version = "1"

[project]
convention_mode = "bootstrap"
profile = "minimal"

[language]
agent_response = "ko"
docs = "ko"

[language.code_comments]
mode = "preserve_existing"
fallback = "en"

[language.logs]
mode = "preserve_existing"
fallback = "en"

[language.memory]
summary = "agent_response"
fallback = "en"
preserve_code = true
preserve_paths = true
preserve_error_output = true

[git]
auto_stage = false
auto_commit = false
auto_push = false

[git.commit_message]
suggest = "when_changes_made"
style = "conventional"
language = "preserve_existing"
language_when_missing = "en"
max_suggestions = 2

[reporting.commit_suggestion]
enabled = true
when = "files_changed"
source = "git.commit_message"
```

## Profile and Locale

The `project.profile` field specifies the project type rather than a country or language. The default is `minimal`; built-in profiles include `minimal`, `oss`, `team`, `product`, and `library`.

`language.agent_response` is the default language for agent final reports.

`language.docs` is the mustflow document locale.

The source language and target locales for user-facing product text belong in `[product_i18n]`.

```toml
[product_i18n]
enabled = true
source_locale = "en"
target_locales = ["en-US", "ko-KR"]
fallback_locale = "en"
locale_tag_format = "bcp47"
user_facing_text_policy = "externalize"
hardcoded_user_facing_strings = "avoid"
translation_policy = "update_source_mark_targets_stale"
do_not_translate = ["identifiers", "log_keys", "error_codes", "metric_names", "api_field_names"]
```

Agents must not infer product text language from the user's chat language. When the source locale changes, target translations should be updated or reported as needing review according to policy.

## Memory Summary Language

The `language.memory.summary` field governs the language used for derived memory, including context compression, handoff summaries, and long-term memory candidates.

The default is `agent_response`, which follows the agent final report language. Projects may also use `docs`, `preserve_existing`, or an explicit language tag such as `ko`, `en-US`, or `zh-Hans`.

`fallback` serves as the backup language when `summary` refers to another preference or convention that cannot be concretely resolved.

`preserve_code`, `preserve_paths`, and `preserve_error_output` ensure that code, file paths, and error output remain in their original form regardless of the summary language. For example, a Korean summary must not arbitrarily translate function names or file paths.

Direct user instructions and the current scoped `AGENTS.md` take precedence over this preference.

## Mode and Fallback

`preserve_existing` instructs the agent to inspect existing files and adhere to the established local conventions.

When no existing convention is detected (e.g., in a new repository), the agent uses the defined `fallback` value for each field. The language of the user's chat must not automatically dictate the language used for code comments, logs, error messages, or commit messages.

The default template uses English fallbacks for code comments, logs, and commit messages. This favors public collaboration, search, operations tooling, and external contributors.

## Git and Commit Messages

The `git.auto_stage`, `git.auto_commit`, and `git.auto_push` settings are all `false` by default.

Commit message suggestions are intended for the final report and do not constitute permission to execute Git operations. If files are modified and `reporting.commit_suggestion.enabled` is `true`, the agent may suggest a commit message. It must not imply that a commit has been created, nor should it perform a commit without an explicit user request.

When multiple logical changes are bundled, the agent may suggest split commits—up to the value of `max_suggestions`—rather than forcing all changes into a single message.

## Validation Rules

If this file is present, `mf check` verifies the following:

- Main preference values are strings.
- `mode`, `fallback`, and `rule` values are strings.
- `[language.memory]` `summary` and `fallback` are strings, while `preserve_code`, `preserve_paths`, and `preserve_error_output` are booleans.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors`, and `include_sensitive_data` are booleans.
- `git.commit_message.max_suggestions` is a positive integer.
- `reporting.commit_suggestion.enabled` is a boolean.
- `docs.update_when` is a string array.
- `project.profile` is one of the built-in profile values.
- When the `[product_i18n]` section is present, the locale fields, translation policy, and exclusion lists must use valid structures.
