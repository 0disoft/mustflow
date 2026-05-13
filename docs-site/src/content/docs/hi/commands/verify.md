---
title: mf verify
description: required_after metadata से चुने गए configured verification intents चलाता है।
---

`mf verify --reason <event>` `.mustflow/config/commands.toml` पढ़ता है, उस reason को `required_after` में रखने वाले command intents ढूँढता है, और केवल configured, one-shot, agent-allowed, closed-stdin intents चलाता है।

`mf verify --from-plan <path>` mustflow root के अंदर मौजूद JSON file से verification reasons पढ़ता है। यह `reason`, `reasons`, `validationReasons`, `summary.validationReasons`, और `classification_summary.validationReasons` पहचानता है।

`mf verify --changed` current Git working tree को `mf classify --changed` जैसी semantics से classify करता है, फिर उन verification reasons को existing verification planner में देता है। `--write-plan <path>` से classification report mustflow root के अंदर save किया जा सकता है, जबकि current run in-memory plan ही use करता है।

`mf verify --plan-only --json` commands चलाए बिना verification plan print करता है। Fresh local index होने पर हर scheduled entry में `.mustflow/cache/mustflow.sqlite` से पढ़ा गया `effectGraph` आ सकता है, जिसमें write locks और lock conflicts होते हैं। Requirements में `surfaceReadModels` metadata भी आ सकता है, जो बताता है कि changed files से कौन सा indexed path-surface rule match हुआ। Index missing या stale हो तो output rebuild hint दिखाता है और command selection या execution authority नहीं बदलता।

## Selection rules

- Match exact `required_after` reason string से होता है।
- Plan files mustflow root के अंदर होने चाहिए और JSON होने चाहिए।
- `--changed` current Git status paths use करता है; यह कोई command runnable नहीं बनाता।
- `--write-plan` सिर्फ `--changed` के साथ available है, और output path mustflow root के अंदर रहना चाहिए।
- Runnable intents वही safe path उपयोग करते हैं जो `mf run <intent>` करता है।
- Unknown, manual-only, long-running, blocked या incomplete intents guess नहीं किए जाते; वे skipped के रूप में report होते हैं।
- अगर कोई intent reason से match नहीं करता, result `blocked` होता है।

## Examples

```sh
npx mf verify --reason code_change
npx mf verify --reason docs_change --json
npx mf verify --changed --plan-only --json
npx mf verify --changed --write-plan .mustflow/state/change-plan.json --json
npx mf verify --reason docs_change --plan-only --json
npx mf verify --from-plan verify-plan.json --json
```

## JSON fields

```sh
npx mf verify --reason code_change --json
```

Machine-readable output ये fields उपयोग करता है:

- `schema_version` (`string`): verify report format version।
- `command` (`string`): हमेशा `verify`।
- `mustflow_root` (`string`): resolved mustflow root।
- `reason` (`string`): requested `required_after` reason, या plan use होने पर comma-separated summary।
- `reasons` (`string[]`): command intents select करने के लिए used verification reasons।
- `plan_source` (`string | null`): `--from-plan` use होने पर JSON plan path, `--changed` use होने पर `changed`, या केवल `--reason` के लिए `null`।
- `status` (`string`): `passed`, `partial`, `failed`, या `blocked`।
- `summary` (`object`): matched, ran, passed, failed, skipped counts।
- `results` (`object[]`): हर intent का run या skip result।

`--plan-only --json` के साथ output change verification report schema use करता है। `schedule.entries[].effectGraph` field, जब present हो, locks और conflicts explain करने के लिए read-only local-index metadata होता है। `requirements[].surfaceReadModels` field, जब present हो, verification reason के पीछे path-surface rule explain करने के लिए read-only local-index metadata होता है।

## Exit codes

- `0`: सभी selected runnable intents pass हुए और कोई selected intent skipped नहीं हुआ।
- `1`: verification failed, partial, blocked, या input invalid था।
