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
- Tracks version-impact checks without granting release or version-bump authority.
- Controls whether low-risk changes should avoid the full verification suite.
- Guides how readily agents should author new tests without weakening required verification.
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

[release.versioning]
impact_check = true
suggest_bump = true
auto_bump = false
require_user_confirmation = true
sync_template_version = true
sync_docs_examples = true
sync_tests = true

[verification.selection]
strategy = "risk_based"
prefer_related_tests = true
skip_docs_only_full_test = true
skip_low_risk_code_full_test = true
skip_translation_only_full_test = true
skip_copy_only_full_test = true
report_skipped = true

[testing.authoring]
new_test_policy = "evidence_required"
prefer_existing_tests = true
require_new_test_rationale = true
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

These values are repository preferences, not permissions. They do not override direct user instructions, command contracts in `commands.toml`, or approval policy in `mustflow.toml`. `git.auto_commit = true` does not grant push permission, and `mf init --set` can only set `git.auto_push=false`; it cannot enable `git.auto_push=true`.

Commit message suggestions are intended for the final report and do not constitute permission to execute Git operations. If files are modified and `reporting.commit_suggestion.enabled` is `true`, the agent may suggest a commit message. It must not imply that a commit has been created, nor should it perform a commit without an explicit user request.

`git.commit_message.style` accepts `conventional`, `descriptive`, or `gitmoji`. The `gitmoji` style adds an emoji prefix while keeping the message readable as a conventional-style suggestion, such as `✨ feat: add dashboard setting`.

`git.commit_message.language` accepts `preserve_existing`, `agent_response`, `docs`, or a locale tag such as `ja`, `de`, or `pt-BR`.

When multiple logical changes are bundled, the agent may suggest split commits—up to the value of `max_suggestions`—rather than forcing all changes into a single message.

## Release Versioning

`[release.versioning]` controls whether agents should check and report version impact when code, templates, schemas, command behavior, package metadata, documentation examples, or installation output changes.

These values are preferences that guide version-impact reporting and version-file edits. `impact_check = true` asks the agent to report whether the diff appears to need a package or template version change. `suggest_bump = true` allows a patch, minor, or major suggestion when the evidence is clear.

`auto_bump = true` lets the agent apply the appropriate package or template version bump after locating the version source, unless a direct user instruction, host safety rule, or approval policy blocks it. `auto_bump = false` keeps package and template version files untouched unless the user requests a version bump or release-preparation task. `require_user_confirmation = true` means agents must ask before editing versions; `false` removes that extra confirmation step when automatic bumping is enabled.

When a version changes, `sync_template_version`, `sync_docs_examples`, and `sync_tests` tell the agent to keep package metadata, template manifests, documentation examples, and tests aligned in the same change.

These preferences do not say where a repository stores its version. Agents still have to discover the language- or framework-specific version source before proposing or editing a version.

When version-impact preferences are enabled, `mf check --strict` also verifies that a version source can be found. It currently accepts sources declared in `.mustflow/config/versioning.toml`, the installed mustflow template lock version, and root package or template sources such as `package.json`, `pyproject.toml`, `Cargo.toml`, `pom.xml`, `composer.json`, `pubspec.yaml`, `Chart.yaml`, Gradle files, .NET project files, and gemspecs when they contain an actual version value. If none is present, strict mode reports an issue so agents do not assume `package.json` by default.

## Verification Selection

`[verification.selection]` guides how agents choose configured checks. It does not grant permission to run commands; command execution still depends on `.mustflow/config/commands.toml`.

`strategy = "risk_based"` asks the agent to match verification scope to the risk of the change. `prefer_related_tests = true` means directly related tests should be preferred when the repository provides a related-test command intent.

`skip_docs_only_full_test`, `skip_translation_only_full_test`, and `skip_copy_only_full_test` cover non-code changes. `skip_low_risk_code_full_test` covers code changes only when they do not affect public behavior, configuration, schemas, security, migrations, or other high-risk surfaces. These settings skip the full suite only; they do not mean all verification should be skipped.

When `report_skipped = true`, the final report should say which broader checks were skipped and why.

## Test Authoring

`[testing.authoring]` guides whether an agent should create new tests or first work with existing coverage. It is separate from `[verification.selection]`: verification selection decides which configured checks to consider, while test authoring controls how readily new test files or cases should be added.

`new_test_policy = "evidence_required"` is the default. It means new tests should be backed by behavior-contract evidence, such as changed public behavior, a regression risk, configuration or schema impact, or security/data-path risk.

`new_test_policy = "manual_approval"` asks agents to confirm before adding new tests unless the user directly requested tests. `new_test_policy = "broad"` allows more proactive test authoring when the tests clarify important behavior.

`prefer_existing_tests = true` asks agents to update nearby existing tests before creating new files or cases. `require_new_test_rationale = true` asks the final report to explain why each new test was needed.

These preferences do not justify skipping required verification, deleting valid tests, or loosening assertions.

## Validation Rules

If this file is present, `mf check` verifies the following:

- Main preference values are strings.
- `mode`, `fallback`, and `rule` values are strings.
- `[language.memory]` `summary` and `fallback` are strings, while `preserve_code`, `preserve_paths`, and `preserve_error_output` are booleans.
- `auto_stage`, `auto_commit`, `auto_push`, `avoid_drive_by_refactors`, and `include_sensitive_data` are booleans.
- `git.commit_message.style` is one of `conventional`, `descriptive`, or `gitmoji`.
- `git.commit_message.max_suggestions` is a positive integer.
- `reporting.commit_suggestion.enabled` is a boolean.
- `[release.versioning]` fields are booleans.
- When version-impact preferences are enabled, `mf check --strict` verifies that a declared version source or detectable package/template version source exists.
- `[verification.selection]` uses an allowed strategy and boolean skip/report flags.
- `[testing.authoring]` uses an allowed new-test policy and boolean authoring flags.
- `docs.update_when` is a string array.
- `project.profile` is one of the built-in profile values.
- When the `[product_i18n]` section is present, the locale fields, translation policy, and exclusion lists must use valid structures.
