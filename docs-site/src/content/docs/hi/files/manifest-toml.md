---
title: templates/default/manifest.toml
description: वह template metadata जो mf init को बताता है कि कौन सी files copy करनी हैं और conflicts कैसे संभालने हैं।
---

`templates/default/manifest.toml` वह metadata है जिसे `mf init` template install करते समय उपयोग करता है।

यह file user repositories में copy नहीं होती। mustflow template कैसे install करता है, इसके लिए यह package-side source of truth है।

## भूमिका

- template identifier और description घोषित करता है।
- बताता है कि install scope LLM-only files तक सीमित है या नहीं।
- template द्वारा बनाई जाने वाली files सूचीबद्ध करता है।
- परिभाषित करता है कि existing-file conflicts abort होंगे, managed block merge करेंगे, या backup लेकर overwrite करेंगे।
- installation के बाद मनुष्य द्वारा की जाने वाली follow-up checks सूचीबद्ध करता है।

## Fields

- `id`: stable template identifier।
- `name`: human-readable template name।
- `version`: template version।
- `description`: template purpose।
- `common_root`: copy की जाने वाली language-neutral files वाला base folder।
- `locales_root`: `--locale` से चुनी जाने वाली locale-specific files वाला base folder।
- `profiles.default`: कोई profile न चुने जाने पर `mf init` द्वारा उपयोग किया जाने वाला project type।
- `profiles.available`: default template द्वारा allowed project types।
- `locales.default`: कोई locale न चुने जाने पर `mf init` द्वारा उपयोग किया जाने वाला mustflow document locale।
- `locales.available`: template द्वारा वास्तव में दी गई document locales।
- `locales.source`: localized template documents के लिए canonical source locale।
- `install_policy.scope`: install scope। default template `llm_only` उपयोग करता है।
- `install_policy.copied_targets`: सीधे copy होने वाले targets।
- `install_policy.generated_targets`: installation के बाद generate हो सकने वाले targets।
- `install_policy.forbidden_targets`: default template में allowed न होने वाले targets।
- `creates`: template द्वारा बनाई जा सकने वाली files।
- `after_install`: user के लिए follow-up checks।
- `i18n.metadata`: translation tracking के लिए metadata file।
- `i18n.source_locale`: `i18n.toml` द्वारा अपेक्षित source locale।
- `conflict_policy`: default existing-file conflict behavior। default लिखने से पहले abort करना है।
- `conflict_policy.files`: per-file conflict behavior।
- `conflict_policy.generated`: generated files के लिए conflict behavior।

## Install scope

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

- `scope`: इसका अर्थ है कि यह template केवल LLM-agent workflow files install करता है।
- `copied_targets`: template से सीधे copy किए गए paths।
- `generated_targets`: repository structure पढ़ने के बाद generate किए गए paths।
- `forbidden_targets`: वे paths जिन्हें default template में नहीं जोड़ा जाना चाहिए।

default template `README.md`, `.github/`, root `docs/`, root `skills/`, source code, या package-manager configuration नहीं बनाता।
यह `.mustflow/context/**` बना सकता है, क्योंकि वे files LLM-agent workflow context हैं, सामान्य project documentation नहीं।
`REPO_MAP.md`, `.mustflow/config/manifest.lock.toml`, और `.mustflow/state/**` generated हैं, copied नहीं।
`.mustflow/state/**` उपयोग के दौरान बनी local state रखता है, जैसे `mf run` receipts।

## Profiles और languages

Profiles project type बताते हैं, country या language नहीं।

```toml
[profiles]
default = "minimal"
available = ["minimal", "oss", "team", "product", "library"]

[locales]
default = "en"
available = ["en", "ko", "zh", "es", "fr", "hi"]
source = "en"
```

`common_root` हर locale द्वारा shared TOML configuration देता है। `locales_root` localized Markdown documents और skill files देता है। `locales.available` में केवल वे document languages शामिल होती हैं जिन्हें वास्तव में install किया जा सकता है। `locales.source` translation tracking में उपयोग होने वाला canonical source locale है।

## लिखने के नियम

`manifest.toml` target project में install होने वाला document नहीं है। यह mustflow template को ही manage करता है।

जब template में नई file जोड़ी जाए, तो इसी file में `creates`, `install_policy`, और conflict policy को साथ update करें।
यह भी जांचें कि नई file का primary reader कोई LLM agent है।
generated file जोड़ते समय `generated_targets` और `conflict_policy.generated` को साथ update करें।

`AGENTS.md` को `--merge` के माध्यम से mustflow managed block मिल सकता है, लेकिन configuration-file conflicts अपने आप merge नहीं होते।
`manifest.lock.toml` सफल install के बाद reproducible है, इसलिए इसकी generated-file policy `regenerate` है।
`.mustflow/state/**` उपयोग के दौरान बनी local execution state है, इसलिए update और removal flows को इसे डिफ़ॉल्ट रूप से सुरक्षित रखना चाहिए।
