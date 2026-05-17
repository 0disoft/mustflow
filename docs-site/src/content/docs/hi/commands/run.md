---
title: mf run
description: commands.toml में घोषित सीमित command intent चलाता है।
---

`mf run <intent>` केवल `.mustflow/config/commands.toml` में declared finite command intents execute करता है।

## निष्पादन शर्तें

intent को ये सभी conditions पूरी करनी होंगी:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds` is a positive integer

यदि कोई भी condition पूरी नहीं होती, command नहीं चलता और reason report होता है।

Blocked या unknown intents के लिए `mf run` एक copyable `status = "manual_only"` intent snippet print करता है। यह snippet `.mustflow/config/commands.toml` के लिए proposal है; जब तक कोई व्यक्ति review करके enable नहीं करता, यह command authority नहीं देता। `--dry-run` और `--plan-only` JSON में यही proposal `suggested_intent_snippet` में आता है।

## बाहर रखे गए जीवनचक्र

`mf run` इन lifecycles वाले intents execute नहीं करता:

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

development servers, watch mode, browser UI और background processes finite validation commands नहीं हैं।

## उदाहरण

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## JSON फ़ील्ड

हर execution नवीनतम run receipt को `.mustflow/state/runs/latest.json` में लिखता है।

`--json` के साथ वही receipt standard output पर print होता है। स्वचालन और एजेंटों को व्यक्ति-पठनीय output parse करने के बजाय यह संरचित output parse करना चाहिए।

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `schema_version` (`number`): run receipt format version।
- `command` (`string`): हमेशा `run`।
- `intent` (`string`): command intent name।
- `status` (`string`): run result। `passed`, `failed`, `timed_out` या `start_failed` में से एक।
- `timed_out` (`boolean`): क्या timeout reached हुआ।
- `started_at` (`string`): run start time।
- `finished_at` (`string`): run finish time।
- `duration_ms` (`number`): run duration।
- `cwd` (`string`): actual execution directory।
- `lifecycle` (`string`): intent lifecycle।
- `run_policy` (`string`): applied execution policy।
- `mode` (`string`): execution mode।
- `argv` (`string[]`): shell mode न होने पर command और arguments।
- `cmd` (`string`): shell mode में shell command string।
- `timeout_seconds` (`number`): applied timeout।
- `max_output_bytes` (`number`): अधिकतम retained output size।
- `success_exit_codes` (`number[]`): success माने जाने वाले exit codes।
- `exit_code` (`number | null`): प्रक्रिया निकास कोड।
- `signal` (`string | null`): signal से process समाप्त होने पर signal name।
- `error` (`string | null`): start या runtime error message।
- `kill_method` (`string | null`): timeout के बाद process रोकने की method।
- `stdout` (`object`): standard output summary।
- `stderr` (`object`): standard error summary।
- `receipt_path` (`string`): saved run receipt path।

Output summary objects ये फ़ील्ड उपयोग करते हैं:

- `stdout.bytes` (`number`): कुल standard output bytes।
- `stdout.truncated` (`boolean`): क्या output retention limit तक trim हुआ।
- `stdout.tail` (`string`): standard output का tail।
- `stderr.bytes` (`number`): कुल standard error bytes।
- `stderr.truncated` (`boolean`): क्या output retention limit तक trim हुआ।
- `stderr.tail` (`string`): standard error का tail।

receipt एक single execution का record है। command contracts की source of truth `.mustflow/config/commands.toml` ही रहती है।

## निकास कोड

- `0`: command intent allowed निकास कोड के साथ बाहर निकला।
- `1`: intent missing था, refused हुआ, timed out हुआ या failed हुआ।
