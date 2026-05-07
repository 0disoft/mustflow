---
title: preferences.toml
description: Declares repository-level defaults for agent language, style, Git reporting, and documentation.
---

`.mustflow/config/preferences.toml` declares repository-level defaults for agent work.

This file is not the highest authority. Direct user instructions, higher-level instructions, scoped `AGENTS.md` files, existing local style, and the command contract take precedence.

## Where It Is Used

- Defines defaults for response language, documentation language, code comments, logs, and user-facing text.
- Defines defaults for derived memory such as compaction summaries and handoff summaries.
- Separates project `profile`, mustflow document locale, and agent report language.
- Records product localization behavior in `[product_i18n]` only when needed.
- Declares fallback values for new repositories where no existing convention is visible.
- Keeps automatic staging, committing, and pushing disabled by default.
- Separates commit message suggestions from permission to actually commit.
- Gives `mf check` a machine-checkable preference file to validate.
- Gives `mf help preferences` the source file to summarize.

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

`project.profile` is the project type, not a country or language. The default is `minimal`, and built-in profiles are `minimal`, `oss`, `team`, `product`, and `library`.

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

`language.memory.summary` controls the language for derived memory such as compaction summaries, handoff summaries, and long-term memory candidates.

The default is `agent_response`, which follows the agent final report language. Projects may also use `docs`, `preserve_existing`, or an explicit language tag such as `ko`, `en-US`, or `zh-Hans`.

`fallback` is the backup language when `summary` points to another preference or existing convention but no concrete language can be resolved.

`preserve_code`, `preserve_paths`, and `preserve_error_output` keep code, paths, and error output in their original form regardless of the summary language. A Korean summary should not arbitrarily translate function names, file paths, or error codes.

Direct user instructions and the current scoped `AGENTS.md` take precedence over this preference.

## Mode and Fallback

`preserve_existing` means the agent should inspect existing files and preserve the local convention.

When no existing convention is visible, such as in a new repository, the agent uses each field's `fallback` value. The user's chat language must not automatically decide code comment, log, error message, or commit message language.

The default template uses English fallbacks for code comments, logs, and commit messages. This favors public collaboration, search, operations tooling, and external contributors.

## Git and Commit Messages

`git.auto_stage`, `git.auto_commit`, and `git.auto_push` are all `false` by default.

Commit message suggestion is part of the final report, not permission to run Git. If files changed and `reporting.commit_suggestion.enabled = true`, the agent may suggest a commit message. It must not imply that a commit was created, and it must not commit without an explicit user request.

When several logical changes are mixed, the agent may suggest split commits up to `max_suggestions` instead of forcing everything into one message.

## Validation Rules

When this file exists, `mf check` verifies that:

- Main preference values are strings.
- `mode`, `fallback`, and `rule` values are strings.
- `[language.memory]` `summary` and `fallback` are strings, while `preserve_code`, `preserve_paths`, and `preserve_error_output` are booleans.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors`, and `include_sensitive_data` are booleans.
- `git.commit_message.max_suggestions` is a positive integer.
- `reporting.commit_suggestion.enabled` is a boolean.
- `docs.update_when` is a string array.
- `project.profile` is one of the built-in profile values.
- When `[product_i18n]` exists, locale fields, translation policy, and do-not-translate lists use valid basic shapes.
