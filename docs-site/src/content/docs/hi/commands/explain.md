---
title: mf explain
description: mustflow policy decisions क्यों लागू होते हैं, यह बताने वाला read-only command.
---

`mf explain authority [path]` बताता है कि mustflow managed Markdown authority को कैसे classify करता है। यह फ़ाइलें नहीं बदलता और project verification नहीं माना जाता।

Path न देने पर command authority model प्रिंट करता है। Path देने पर यह बताता है कि उस path के लिए expected mustflow document role है या नहीं।

`mf explain asset-optimization` web image optimization की decision path बताता है। यह रिपोर्ट करता है कि `web-asset-optimization` skill लागू होता है या नहीं और `asset_optimize` agent-runnable configured command intent है या नहीं, ताकि agent image converters या package commands guess करके न चलाए।

`mf explain anchor <anchor_id>` structured source-code anchor बताता है। Source anchors सिर्फ navigation coordinates हैं: वे code ढूंढने में मदद करते हैं, लेकिन workflow rules, command permission, या verification authority define नहीं करते।

`mf explain command <intent>` बताता है कि `.mustflow/config/commands.toml` में command intent `mf run` से चल सकता है या नहीं, क्यों allowed या blocked है, और उसे चलाना mustflow verification माना जाएगा या नहीं।

`mf explain retention` `.mustflow/config/mustflow.toml` से effective retention policy बताता है, जिसमें raw event storage, bounded run receipts, और context limits शामिल हैं।

`mf explain skill <skill_id>` `.mustflow/skills/INDEX.md` की एक route बताता है, जिसमें trigger, required input, edit scope, risk, verification intents, और expected output शामिल हैं। Target skill folder name, full `metadata.skill_id`, `mustflow_doc`, या skill path हो सकता है।

`mf explain skills` वही strict skill index/body alignment summary बताता है जिसे `mf doctor --strict` उपयोग करता है। यह रिपोर्ट करता है कि `.mustflow/skills/INDEX.md` की हर route skill body पर जाती है या नहीं, और हर skill body index में listed है या नहीं।

## Output

- `mustflow root`: मौजूदा mustflow root.
- `Topic`: explanation topic.
- `Decision`: resolved policy decision.
- `Reason`: decision लागू होने का कारण.
- `Effective action`: agent को क्या करना चाहिए.
- `Counts as mustflow verification`: command result verification receipt माना जाता है या नहीं.
- `Source files`: rule source बताने वाली files.
- `Source anchor`: `anchor` topic के लिए anchor path, line, purpose, search terms, invariant, risk, और navigation-only authority.
- `Expected frontmatter`: path recognized होने पर required `mustflow_doc`, `authority`, और `lifecycle` values.
- `Authority boundary`: यह authority lane क्या define कर सकता है और क्या higher-authority files, current code, या `commands.toml` पर छोड़ना चाहिए.
- `Command intent`: `command` topic के लिए command-contract metadata.
- `Retention policy`: `retention` topic के लिए effective retention settings.
- `Skill route`: `skill` topic के लिए trigger, scope, risk, checks, और expected output.
- `Skill routes`: `skills` topic के लिए strict skill index/body alignment status.

## Examples

```sh
npx mf explain authority
npx mf explain authority AGENTS.md
npx mf explain anchor auth.session.resolve
npx mf explain anchor auth.session.resolve --json
npx mf explain asset-optimization
npx mf explain asset-optimization --json
npx mf explain command test
npx mf explain command lint --json
npx mf explain retention
npx mf explain retention --json
npx mf explain skill code-review
npx mf explain skill mustflow.core.code-review --json
npx mf explain skills
npx mf explain skills --json
npx mf explain authority .mustflow/skills/INDEX.md --json
```

## JSON Fields

```sh
npx mf explain authority AGENTS.md --json
```

Machine-readable output इन fields का उपयोग करता है:

- `schema_version` (`string`): output format version.
- `command` (`string`): हमेशा `explain`.
- `topic` (`string`): `anchor`, `asset-optimization`, `authority`, `command`, `retention`, `skill`, `skills`, या `surface`.
- `mustflow_root` (`string`): मौजूदा mustflow root.
- `decision` (`object`): resolved decision, reason, effective action, source files, verification status, और topic-specific details. `authority` के लिए इसमें `boundary.role`, `boundary.canDefine`, और `boundary.cannotDefine` शामिल हैं.

## Help and Exit Codes

```sh
npx mf explain --help
```

- Exit code `0`: authority decision जाँचा और प्रिंट किया गया.
- Exit code `1`: command को invalid topic, unknown option, या unexpected argument मिला.
