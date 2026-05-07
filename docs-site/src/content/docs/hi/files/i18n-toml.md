---
title: i18n.toml
description: canonical documents और translations को track करने वाला template metadata।
---

`i18n.toml` mustflow template documents की canonical language और translation status को track करता है।

यह फ़ाइल `mf init` द्वारा user repositories में copy नहीं की जाती। यह template document revisions और translation status track करने वाला package-side metadata है।

## यह क्यों मौजूद है

जब documents issues और pull requests के माध्यम से अक्सर बदलते हैं, तब file modification time यह जानने के लिए पर्याप्त नहीं होता कि कौन सी language current है।

mustflow canonical document `revision` की तुलना हर translation के `source_revision` से करता है।

## रूप

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

- `version`: इस metadata format का version।
- `source_locale`: current template documents की canonical language।
- `status_values`: allowed translation status values।
- `documents.<id>`: tracked document के लिए stable identifier।
- `source`: canonical document का template-internal path।
- `source_locale`: उस document की canonical language।
- `revision`: canonical document revision।
- `translations`: translated documents को source revisions और status से map करने की जगह।

## Status values

- `current`: translation मौजूदा canonical revision से मेल खाती है।
- `stale`: canonical document बदल गया है और translation update नहीं हुई।
- `needs_review`: translation मौजूद है लेकिन review चाहिए।
- `missing`: translation मौजूद नहीं है।

Freshness `revision` और हर translation के `source_revision` की तुलना से तय होती है, file modification time से नहीं।

## सत्यापन

Package test suite publishing से पहले इस metadata को validate करता है:

- `source_locale` को `manifest.toml` से मेल खाना चाहिए।
- Source और translation paths वास्तविक template files की ओर जाने चाहिए।
- `current` translations को source document `revision` के समान `source_revision` उपयोग करना चाहिए।
- Markdown frontmatter को tracked document ID और locale से मेल खाना चाहिए।
- Canonical Markdown files को `canonical: true` और translated Markdown files को `canonical: false` उपयोग करना चाहिए।
