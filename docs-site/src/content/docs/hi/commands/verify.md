---
title: mf verify
description: required_after metadata से चुने गए configured verification intents चलाता है।
---

`mf verify --reason <event>` `.mustflow/config/commands.toml` पढ़ता है, उस reason को `required_after` में रखने वाले command intents ढूँढता है, और केवल configured, one-shot, agent-allowed, closed-stdin intents चलाता है।

## Selection rules

- Match exact `required_after` reason string से होता है।
- Runnable intents वही safe path उपयोग करते हैं जो `mf run <intent>` करता है।
- Unknown, manual-only, long-running, blocked या incomplete intents guess नहीं किए जाते; वे skipped के रूप में report होते हैं।
- अगर कोई intent reason से match नहीं करता, result `blocked` होता है।

## Examples

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
```

## JSON fields

```sh
npx mf verify --reason code_change --json
```

Machine-readable output ये fields उपयोग करता है:

- `schema_version` (`string`): verify report format version।
- `command` (`string`): हमेशा `verify`।
- `mustflow_root` (`string`): resolved mustflow root।
- `reason` (`string`): requested `required_after` reason।
- `status` (`string`): `passed`, `partial`, `failed`, या `blocked`।
- `summary` (`object`): matched, ran, passed, failed, skipped counts।
- `results` (`object[]`): हर intent का run या skip result।

## Exit codes

- `0`: सभी selected runnable intents pass हुए और कोई selected intent skipped नहीं हुआ।
- `1`: verification failed, partial, blocked, या input invalid था।
