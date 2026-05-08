---
title: .mustflow/config/manifest.lock.toml
description: mf init द्वारा लिखी जाने वाली install-state फ़ाइल।
---

`.mustflow/config/manifest.lock.toml` सफल `mf init` के बाद generate या update होती है।

यह template से copy नहीं होती। यह दर्ज करती है कि target repository में कौन सी files created, merged, unchanged छोड़ी गईं, या overwritten हुईं।

## यह कब लिखी जाती है

- सफल `mf init` के बाद लिखी जाती है।
- जब `--merge` मौजूदा `AGENTS.md` में managed block जोड़ता है।
- जब `--force` conflicting files का backup लेकर उन्हें overwrite करता है।
- conflicts के कारण installation abort होने पर नहीं लिखी जाती।
- जब `--dry-run` केवल install plan print करता है, तब नहीं लिखी जाती।

## भूमिका

- installation के लिए उपयोग हुए template identifier और version को दर्ज करती है।
- हर installed file का baseline hash दर्ज करती है।
- हर file पर की गई action दर्ज करती है।
- `mf check`, `mf status`, और `mf update --dry-run` जैसी commands को stable install-state baseline देती है।

## रूप

```toml
schema_version = "1"
generated_by = "mustflow"

[template]
id = "default"
version = "1.0.1"
profile = "minimal"
locale = "ko"

[files."AGENTS.md"]
source = "template_locale"
last_action = "created"
content_hash = "sha256:..."
```

## Fields

- `schema_version`: lock-file schema version।
- `generated_by`: वह tool जिसने file बनाई।
- `template.id`: installation के दौरान उपयोग हुआ template identifier।
- `template.version`: installation के दौरान उपयोग हुआ template version।
- `template.profile`: installation के दौरान चुना गया project profile।
- `template.locale`: installation के दौरान चुना गया mustflow document locale।
- `template.agent_lang`: चुने जाने पर agent report language।
- `product_i18n`: product text locales चुने जाने पर लिखी जाने वाली optional section।
- `files."<path>"`: per-file install record।
- `source`: file content कहां से आया। `template_locale`, `template_common`, या `managed_block` उपयोग करता है।
- `last_action`: अंतिम install के दौरान लागू action। `created`, `unchanged`, `merged`, `overwritten`, या `customized` में से एक।
- `content_hash`: उस file content का SHA-256 baseline hash जिसे mustflow ने अंतिम बार सुरक्षित install या update के रूप में दर्ज किया।

`last_action = "customized"` का अर्थ है कि दर्ज hash repository-specific baseline के रूप में accepted है। `mf update` उस file को तब तक preserve करता है जब तक current hash `content_hash` से match करता है।

## Hash baseline

फिलहाल `content_hash` install-time baseline है।
यह current file का live hash नहीं है।

`mf check`, `mf status`, और `mf update --dry-run` runtime पर current file hash निकालते हैं और इसकी तुलना इस baseline से करते हैं। Template hashes भी lock file में store नहीं होते; वे installed mustflow package के साथ bundled template से compute होते हैं।

इससे lock file live current-state snapshot के बजाय install baseline बनी रहती है।

यदि mustflow आगे चलकर किसी file के भीतर केवल managed block update करता है, तो lock schema को पहले block-level baseline जोड़ना होगा। v1 का file-level `content_hash` यह सिद्ध करने के लिए पर्याप्त नहीं है कि managed block स्वयं unchanged है।

## संपादन नियम

यह file हाथ से लिखी जाने वाली source document नहीं है।

जब install state refresh करनी हो, तो इसे `mf init` या भविष्य की dedicated update command से regenerate करें। Manual edits recorded hashes को actual file contents से असंगत बना सकती हैं।

`mf update --dry-run` `content_hash` को install-time baseline के रूप में उपयोग करता है। यदि current file hash उस baseline से अलग है, तो file को local change माना जाता है और automatic update block हो जाता है।

कारण समझने के लिए [manifest.lock.toml संरचना निर्णय](../../design/manifest-lock-decision/) देखें।
