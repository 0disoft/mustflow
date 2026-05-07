---
title: i18n.toml
description: Template metadata for tracking canonical documents and translations.
---

`i18n.toml` tracks the canonical language and translation status for mustflow template documents.

This file is not copied into user repositories by `mf init`. It is package-side metadata for tracking template document revisions and translation status.

## Why It Exists

When documents change often through issues and pull requests, file modification time is not enough to know which language is current.

mustflow compares a canonical document `revision` with each translation's `source_revision`.

## Shape

```toml
version = 1
source_locale = "en"

[documents."agents.root"]
source = "locales/en/AGENTS.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/AGENTS.md", source_revision = 1, status = "current" }

[documents."docs.agent-workflow"]
source = "locales/en/.mustflow/docs/agent-workflow.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/docs/agent-workflow.md", source_revision = 1, status = "current" }

[documents."skill.code-review"]
source = "locales/en/.mustflow/skills/code-review/SKILL.md"
source_locale = "en"
revision = 1
translations.ko = { path = "locales/ko/.mustflow/skills/code-review/SKILL.md", source_revision = 1, status = "current" }
```

## Fields

- `version`: Version of this metadata format.
- `source_locale`: Canonical language for the current template documents.
- `status_values`: Allowed translation status values.
- `documents.<id>`: Stable identifier for a tracked document.
- `source`: Template-internal path of the canonical document.
- `source_locale`: Canonical language for that document.
- `revision`: Canonical document revision.
- `translations`: Place to map translated documents to source revisions and status.

## Status Values

- `current`: Translation matches the current canonical revision.
- `stale`: The canonical document changed and the translation has not been updated.
- `needs_review`: Translation exists but needs review.
- `missing`: Translation does not exist.

Freshness is determined by comparing `revision` and each translation's `source_revision`, not by file modification time.

## Validation

The package test suite validates this metadata before publishing:

- `source_locale` must match `manifest.toml`.
- Source and translation paths must point to real template files.
- `current` translations must use the same `source_revision` as the source document `revision`.
- Markdown frontmatter must match the tracked document ID and locale.
- Canonical Markdown files must use `canonical: true`; translated Markdown files must use `canonical: false`.
