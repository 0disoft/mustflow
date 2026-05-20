---
title: .mustflow/config/commands.toml
description: tests, linting, builds, और documentation checks के लिए command-intent contracts।
---

`.mustflow/config/commands.toml` वह command-intent contract है जो agents को project commands का अनुमान लगाने से रोकता है।

## इसका उपयोग कहां होता है

- `AGENTS.md` no-command-guessing rule लागू करने के लिए इस file का उपयोग करता है।
- `agent-workflow.md` command चलाने की नीति के सत्य स्रोत के रूप में इस file को मानता है।
- हर `SKILL.md` raw commands के बजाय `test`, `lint`, और `build` जैसे intent names reference करता है।
- `mf check` जैसे tools इस file को पढ़कर executability और missing fields validate कर सकते हैं।

## रूप

```toml
schema_version = "1"

[defaults]
missing_behavior = "do_not_guess"
allow_inferred_commands = false
default_cwd = "."
default_timeout_seconds = 600
stdin = "closed"
require_lifecycle = true
require_timeout_for_oneshot = true
deny_unmanaged_long_running = true
max_output_bytes = 1048576
on_timeout = "terminate_process_tree"
kill_after_seconds = 5

[intents.test]
status = "unknown"
description = "Run tests."
reason = "No test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"
required_after = ["code_change", "behavior_change"]
```

## डिफ़ॉल्ट fields

- `schema_version`: इस file format का version।
- `defaults.missing_behavior`: intent missing होने पर agents क्या करें।
- `defaults.allow_inferred_commands`: क्या agents commands infer कर सकते हैं। default `false` होना चाहिए।
- `defaults.default_cwd`: जब intent अपना working directory न दे, तब default working directory।
- `defaults.default_timeout_seconds`: नई intent declarations के लिए scaffolding और validation default। `mf run` फिर भी हर runnable `oneshot` intent से explicit `timeout_seconds` मांगता है।
- `defaults.stdin`: नई intent declarations के लिए scaffolding और validation default। Agent-runnable intents को फिर भी explicit `stdin = "closed"` declare करना होगा।
- `defaults.require_lifecycle`: क्या executable intents को command lifecycle declare करना होगा।
- `defaults.require_timeout_for_oneshot`: क्या finite commands को timeout declare करना होगा।
- `defaults.deny_unmanaged_long_running`: क्या unmanaged long-running commands block होंगी।
- `defaults.max_output_bytes`: stdout या stderr stream में से हर एक के लिए runner द्वारा स्वीकार किया
  जाने वाला default output limit। 16 MiB (16,777,216 bytes) से बड़े मान अस्वीकार किए जाते हैं।
- `defaults.on_timeout`: timeout handling policy।
- `defaults.kill_after_seconds`: process cleanup के लिए default extra wait time। Intent अपना
  `kill_after_seconds` देकर इसे override कर सकता है।

## Intent status

- `configured`: executable command declare है।
- `unknown`: अभी command contract मौजूद नहीं है।
- `not_applicable`: इस repository को यह validation नहीं चाहिए।
- `manual_only`: इसे चलाना है या कैसे चलाना है, यह मनुष्य तय करे। नई human-run command declarations के लिए इसे status के रूप में उपयोग करें।
- `disabled`: command ज्ञात है लेकिन अभी नहीं चलनी चाहिए।

Agents केवल `status = "configured"` वाले intents चला सकते हैं, और status अकेले पर्याप्त नहीं है। `mf run` को `oneshot` lifecycle, `run_policy = "agent_allowed"`, closed standard input, explicit timeout, declared command, और current root के अंदर working directory भी चाहिए।

## Intent fields

- `description`: command intent का purpose।
- `reason`: intent executable क्यों नहीं है या अभी declare क्यों नहीं है।
- `agent_action`: intent न चला पाने पर agent को क्या करना चाहिए।
- `required_after`: वे change types जिनके बाद इस intent पर विचार करना चाहिए।
- `kind`: mustflow builtin या repository command जैसी classification।
- `lifecycle`: command finite है या long-running।
- `run_policy`: agents intent चला सकते हैं या explicit approval चाहिए। नई configurations को `agent_allowed` या `requires_explicit_user_request` उपयोग करना चाहिए; `run_policy = "manual_only"` केवल पुराने configs की compatibility के लिए accepted है।
- `argv`: shell interpretation के बिना चलने वाली command और arguments। Shell wrappers, interpreter
  loops, package-manager development scripts, watchers, और development servers जैसे स्पष्ट
  long-running रूप agent-runnable one-shot intents में reject होते हैं।
- `mode`: केवल shell syntax चाहिए होने पर `shell` सेट करें।
- `cmd`: `mode = "shell"` होने पर उपयोग होने वाली shell command string।
- `cwd`: command का working directory।
- `timeout_seconds`: command timeout।
- `kill_after_seconds`: timeout के बाद process cleanup के लिए optional per-intent extra wait time।
- `stdin`: standard input behavior। Agent-runnable intents को `closed` उपयोग करना चाहिए।
- `success_exit_codes`: successful माने जाने वाले exit codes।
- `manual_start_hint`: agent execution के बाहर किसी long-running command को शुरू करने के लिए human-facing hint।
- `health_check_url`: manually started long-running process inspect करने के लिए optional URL।
- `stop_instruction`: manually started long-running process रोकने के लिए optional instruction।
- `related_oneshot_checks`: long-running process शुरू किए बिना उसी surface को verify करने वाले optional oneshot intent names।
- `writes`: वे paths जिन्हें command modify कर सकती है।
- `network`: क्या command network उपयोग करती है।
- `destructive`: क्या command destructive हो सकती है।

## Executable intents

Configured intents को संभव हो तो `argv` array उपयोग करना चाहिए।

```toml
[intents.test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "Run tests."
argv = ["pnpm", "test"]
cwd = "."
timeout_seconds = 900
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
```

यदि shell चाहिए, तो `mode = "shell"` और `cmd` सेट करें, फिर command impact और write paths declare करें।

`unknown`, `not_applicable`, `manual_only`, और `disabled` के लिए agents replacement command infer नहीं कर सकते।

## Test-related intents

default template full tests, related tests, audit checks, coverage, और snapshot updates को अलग रखता है।

```toml
[intents.test_related]
status = "unknown"
reason = "No related-test command has been declared for this repository."
agent_action = "do_not_guess_report_missing"

[intents.test_audit]
status = "unknown"
reason = "No stale-test audit command has been declared."
agent_action = "do_not_guess_report_missing"

[intents.snapshot_update]
status = "manual_only"
reason = "Snapshot updates can hide unintended output changes."
agent_action = "do_not_update_snapshots_without_approval"
```

Tests maintain करते समय agents को ये intent names उपयोग करने चाहिए, लेकिन हर intent को फिर भी `commands.toml` के माध्यम से resolve करना होगा। Missing related-test या audit command report होती है; उसका अनुमान नहीं लगाया जाता।

## Command lifecycle

- `oneshot`: finite command जिसे exit करना चाहिए।
- `server`: long-running local server।
- `watch`: file-watching command जो अपने आप exit नहीं करती।
- `interactive`: user input की प्रतीक्षा करने वाली command।
- `browser`: browser या UI process।
- `background`: background में बने रहने के लिए बना process।

Agents डिफ़ॉल्ट रूप से केवल `oneshot` intents चला सकते हैं। `server`, `watch`, `interactive`, `browser`, और `background` को `run_policy = "agent_allowed"` उपयोग नहीं करना चाहिए।

Long-running intents manual guidance metadata रख सकते हैं, लेकिन यह metadata केवल जानकारी के लिए है और intent को agent-runnable नहीं बनाता।

```toml
[intents.dev_server]
status = "configured"
lifecycle = "server"
run_policy = "requires_explicit_user_request"
description = "Manual inspection के लिए development server start करें."
argv = ["pnpm", "dev"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = []
manual_start_hint = "इसे human-controlled terminal में start करें."
health_check_url = "http://127.0.0.1:3000/health"
stop_instruction = "Terminal process को Ctrl-C से stop करें."
related_oneshot_checks = ["test_fast"]
```

`mf run <intent>` केवल ऐसे intents execute करता है जिनमें `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, `stdin = "closed"`, positive integer `timeout_seconds`, `argv` या `mode = "shell"` plus `cmd` से declared command, और current mustflow root के अंदर `cwd` हो।
Execution के बाद यह latest run receipt को `.mustflow/state/runs/latest.json` में लिखता है; `--json` के साथ वही receipt standard output पर भी print होती है।

## Built-in intents

`mustflow_doctor` files लिखे बिना current mustflow root install state, check result, runnable command intents, और next steps inspect करता है।

```toml
[intents.mustflow_doctor]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "doctor", "--json"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = []
```

`repo_map` `REPO_MAP.md` generate या update करता है।

```toml
[intents.repo_map]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "map", "--write"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = ["REPO_MAP.md"]
```

default template `mf update` को भी built-in intents के ज़रिए expose करता है, ताकि agents command contract bypass किए बिना run receipts बना सकें।
`mustflow_update_dry_run` `mf update --dry-run --json` चलाता है और files नहीं लिखता।
`mustflow_update_apply` केवल clean plan के बाद और task द्वारा template updates apply करने की जरूरत होने पर उपयोग करें।

Root `config/` directory user project की हो सकती है, इसलिए mustflow उसका उपयोग नहीं करता।

## Git-related intents

default template final reporting और commit message suggestions के लिए read-only Git intents शामिल करता है।

```toml
[intents.changes_status]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "status", "--short"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false

[intents.changes_diff_summary]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "diff", "--stat"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false
```

ये intents Git state बदले बिना changed files और change summary inspect करते हैं।

Actual commits डिफ़ॉल्ट रूप से manual-only हैं।

```toml
[intents.git_commit]
status = "manual_only"
reason = "Commits require explicit user approval."
agent_action = "do_not_commit_report_suggestion_only"
```

Agents commit messages suggest कर सकते हैं, लेकिन explicit user request के बिना stage, commit, या push नहीं कर सकते।
