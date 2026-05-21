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

Execute करने से पहले `mf run` को readable `.mustflow/config/manifest.lock.toml` भी चाहिए। यह
file confirm करती है कि root mustflow से install या update हुआ था, तभी repository-controlled
commands चल सकते हैं। `--dry-run` और `--plan-only` lock के बिना भी चलते हैं, ताकि manual या older
root को process spawn किए बिना inspect किया जा सके। फिर भी उस root से execute करना हो तो
`AGENTS.md` और `.mustflow/config/commands.toml` review करने के बाद `--allow-untrusted-root` pass
करें; इससे ऊपर की command-intent requirements ढीली नहीं होतीं।

Blocked या unknown intents के लिए `mf run` एक copyable `status = "manual_only"` intent snippet print करता है। यह snippet `.mustflow/config/commands.toml` के लिए proposal है; जब तक कोई व्यक्ति review करके enable नहीं करता, यह command authority नहीं देता। `--dry-run` और `--plan-only` JSON में यही proposal `suggested_intent_snippet` में आता है।

## बाहर रखे गए जीवनचक्र

`mf run` इन lifecycles वाले intents execute नहीं करता:

- `server`
- `watch`
- `interactive`
- `browser`
- `background`

development servers, watch mode, browser UI और background processes finite validation commands नहीं हैं।

यदि intent `lifecycle = "oneshot"` declare करे, तब भी `argv` में साफ long-running shape दिखने पर `mf run` उसे reject करता है, जैसे shell-wrapper payloads, interpreter loops, `npm run dev`, `vite --host`, `next dev`, या `webpack --watch`।

## उदाहरण

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## JSON फ़ील्ड

हर execution एक unique `.mustflow/state/runs/run-*` directory में receipt लिखता है और उसी latest receipt से `.mustflow/state/runs/latest.json` को atomically update करता है।

`--json` के साथ वही receipt standard output पर print होता है। स्वचालन और एजेंटों को व्यक्ति-पठनीय output parse करने के बजाय यह संरचित output parse करना चाहिए।

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `schema_version` (`number`): run receipt format version।
- `command` (`string`): हमेशा `run`।
- `intent` (`string`): command intent name।
- `status` (`string`): run result। `passed`, `failed`, `timed_out`, `start_failed` या `output_limit_exceeded` में से एक।
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
- `kill_after_seconds` (`number`): timeout के बाद process cleanup के लिए extra wait time।
- `max_output_bytes` (`number`): stdout या stderr stream में से हर एक के लिए अधिकतम retained output size।
  16 MiB (16,777,216 bytes) से बड़े मान execution से पहले अस्वीकार किए जाते हैं।
- `max_output_bytes_scope` (`string`): हमेशा `per_stream`; `max_output_bytes` stdout और stderr का
  combined budget नहीं है।
- `success_exit_codes` (`number[]`): success माने जाने वाले exit codes।
- `exit_code` (`number | null`): प्रक्रिया निकास कोड।
- `signal` (`string | null`): signal से process समाप्त होने पर signal name।
- `error` (`string | null`): start या runtime error message।
- `kill_method` (`string | null`): timeout के बाद process रोकने की method।
- `termination` (`object`, optional): timeout cleanup evidence; इसमें stop method, graceful और forced signals, forced kill attempt, termination confirmation, और cleanup pending status दर्ज होते हैं।
- `stdout` (`object`): standard output summary।
- `stderr` (`object`): standard error summary।
- `receipt_path` (`string`): unique run directory में saved run receipt path।

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
