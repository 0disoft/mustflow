---
title: i18n.toml
description: Template metadata for tracking canonical documents and translations.
---

`i18n.toml` defines the canonical language and tracks the translation status for mustflow template documents.

This file is not installed into user repositories via `mf init`. It serves as internal package metadata for managing template document revisions and their respective translations.

## Why It Exists

As documents frequently change via issues and pull requests, file modification timestamps are insufficient for determining whether a translation is up to date.

Mustflow determines freshness by comparing the canonical document `revision` against the `source_revision` recorded for each translation.

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

- `version`: The version of this metadata schema.
- `source_locale`: The primary language for the current template documents.
- `status_values`: The set of valid translation status values.
- `documents.<id>`: A stable, unique identifier for a tracked document.
- `source`: The internal template path to the canonical document.
- `source_locale`: The primary language for a specific document.
- `revision`: The revision number of the canonical document.
- `translations`: Maps translated documents to their respective source revisions and statuses.

## Status Values

- `current`: The translation is aligned with the current canonical revision.
- `stale`: The canonical document has been updated, but the translation has not.
- `needs_review`: The translation exists but requires verification.
- `missing`: Translation does not exist.

Freshness is determined by comparing `revision` and each translation's `source_revision`, not by file modification time.

## Validation

The package test suite validates this metadata prior to publication:

- `source_locale` must be consistent with `manifest.toml`.
- Source and translation paths must resolve to existing template files.
- `current` translations must specify a `source_revision` that matches the canonical document `revision`.
- Markdown frontmatter must align with the tracked document ID and locale.
- Canonical Markdown files must specify `canonical: true`, while translated files must specify `canonical: false`.
