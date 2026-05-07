---
title: mf context
description: वर्तमान mustflow रूट के लिए JSON एजेंट कार्य संदर्भ प्रिंट करता है।
---

`mf context --json` संरचित context प्रिंट करता है जिसे कोई एजेंट वर्तमान रूट में काम शुरू करने से पहले देख सकता है।

यह command फ़ाइलों को modify नहीं करता। यह दस्तावेज़ों को खुद पढ़ने का विकल्प नहीं है; यह एक हल्का index है जो उन फ़ाइलों और command intents की ओर इशारा करता है जिन्हें एजेंट को पहले जांचना चाहिए।

## शामिल डेटा

- वर्तमान mustflow रूट।
- installation state।
- `manifest.lock.toml` state।
- `mustflow.toml` से authoritative document paths।
- `mustflow.toml` से capability surface।
- required reading order और फ़ाइलों की मौजूदगी।
- optional reading order और फ़ाइलों की मौजूदगी।
- authority और optional reading fields के माध्यम से context index और project context paths।
- `commands.toml` से command intent status summary।
- runnable finite command intent names।
- नवीनतम `mf run` receipt का summary।
- manifest lock से reported issues।

## रन रसीद सारांश

`latest_run` `.mustflow/state/runs/latest.json` से केवल चुनी हुई metadata दिखाता है।

इसमें standard output या standard error tails शामिल नहीं होते। यदि किसी एजेंट को command output चाहिए, तो उसे receipt file स्पष्ट रूप से पढ़नी होगी।

## उदाहरण

```sh
npx mf context --json
```

## JSON फ़ील्ड

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `schema_version` (`number`): output format version।
- `command` (`string`): हमेशा `context`।
- `mustflow_root` (`string`): वर्तमान रूट जहां command चलाया गया।
- `installed` (`boolean`): क्या `AGENTS.md` और `.mustflow/` मौजूद हैं।
- `manifest_lock` (`string`): lock-file state। `present`, `missing` या `invalid` में से एक।
- `template` (`object | null`): lock file में दर्ज template identifier और version।
- `authority` (`object`): authoritative document paths।
- `capabilities` (`object`): वर्तमान रूट के लिए agent capability surface।
- `read_order` (`object[]`): required reading files और existence flags।
- `optional_read_order` (`object[]`): optional reading files और existence flags।
- `command_contract` (`object`): command intent summary और runnable intent names।
- `latest_run` (`object`): नवीनतम run receipt का summary।
- `issues` (`string[]`): manifest lock से reported issues।

दोहराए गए और nested fields ये shapes उपयोग करते हैं:

- `read_order[].path` (`string`): पढ़ने के लिए relative path।
- `read_order[].exists` (`boolean`): क्या फ़ाइल वर्तमान रूट में मौजूद है।
- `command_contract.intents[].name` (`string`): command intent name।
- `command_contract.intents[].status` (`string`): command intent configuration status।
- `command_contract.intents[].lifecycle` (`string | null`): क्या command finite है या long-running।
- `command_contract.intents[].run_policy` (`string | null`): agent execution policy।
- `command_contract.runnable_intents` (`string[]`): intent names जिन्हें एजेंट `mf run <intent>` से चला सकता है।
- `latest_run.path` (`string`): नवीनतम run receipt path।
- `latest_run.exists` (`boolean`): क्या नवीनतम run receipt मौजूद है।
- `latest_run.valid` (`boolean | null`): क्या receipt JSON object के रूप में parse हुआ।
- `latest_run.status` (`string | null`): नवीनतम run result।
- `latest_run.exit_code` (`number | null`): नवीनतम run से प्रक्रिया निकास कोड।

## निकास कोड

- `0`: context inspect होकर print हुआ।
- `1`: command को unknown option मिला।
