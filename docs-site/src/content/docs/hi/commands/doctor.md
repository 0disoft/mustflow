---
title: mf doctor
description: वर्तमान mustflow रूट के लिए केवल-पढ़ने वाली निदान कमांड।
---

`mf doctor` वर्तमान mustflow रूट का त्वरित health summary देता है।
यह `mf check` और `mf context` के सबसे उपयोगी हिस्सों को मिलाता है, फिर एजेंट द्वारा अपनाए जा सकने वाले सुरक्षित next steps print करता है।

यह command कभी files नहीं लिखता। जब किसी एजेंट या व्यक्ति को कुछ बदलने से पहले शुरुआती दिशा चाहिए, तब इसे उपयोग करें।

## यह क्या जांचता है

- वर्तमान mustflow root।
- क्या `AGENTS.md` और `.mustflow/` मौजूद हैं।
- `mf check` का result।
- `manifest.lock.toml` state।
- lock file मौजूद होने पर उससे template identifier और version।
- क्या `.mustflow/config/commands.toml` मौजूद है और runnable finite intents expose करता है।
- क्या runnable intents व्यापक host environment inherit करते हैं।
- command execution, Git automation, local state, और blocked actions के लिए effective policy।
- `mustflow.toml` से missing required और optional read-order paths।
- क्या `REPO_MAP.md` generate हुआ है।
- क्या स्थानीय `.mustflow/cache/mustflow.sqlite` index मौजूद है।
- क्या नवीनतम `mf run` receipt मौजूद है।
- diagnostic checklist items और suggested next commands।

## उदाहरण

```sh
npx mf doctor
```

उदाहरण output:

```text
mustflow doctor
mustflow root: /path/to/project
Installed: yes
Strict: no
Check: passed
Issues: 0
Command contract: present
Runnable intents: 3

Health:
- [ok] Install: installed
- [ok] Validation: 0 issues
- [ok] Command contract: present, 3 runnable intents
- [ok] Environment: no inherited host-environment intents
- [ok] Read order: all required files present
- [info] REPO_MAP.md: not generated (run: mf map --write)
- [info] Local index: not generated (run: mf index)
- [info] Latest run: no run receipt yet (run: mf run <intent>)

Suggested commands:
- mf help workflow
- mf help commands
- mf context --json
- mf check --strict
- mf map --write
- mf index
- mf run <intent>

No files were written.
```

## JSON फ़ील्ड

```sh
npx mf doctor --json
```

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `schema_version` (`number`): output format version।
- `command` (`string`): हमेशा `doctor`।
- `mustflow_root` (`string`): वर्तमान mustflow root।
- `installed` (`boolean`): क्या `AGENTS.md` और `.mustflow/` मौजूद हैं।
- `strict` (`boolean`): क्या `--strict` checks enabled थे।
- `ok` (`boolean`): क्या install मौजूद है और validation पास हुई।
- `check` (`object`): `mf check` rules का उपयोग करते हुए validation result।
- `context` (`object`): शुरू करने से पहले एजेंट को चाहिए main context state।
- `command_environment` (`object`): व्यापक host environment inherit करने वाले runnable intents का summary।
- `effective_policy` (`object`): command execution, Git automation, और state authority के लिए applied repository policy।
- `state_policy` (`object`): local cache और local state storage policy।
- `blocked_actions` (`string[]`): repository contract से blocked action classes।
- `diagnostics` (`object[]`): install, validation, command contract, read order, repository map, local index और latest run के लिए per-area diagnostics।
- `next_steps` (`string[]`): commands जिन्हें एजेंट बिना guess किए आगे चला सकता है।

Nested fields ये shapes उपयोग करते हैं:

- `check.ok` (`boolean`): क्या validation पास हुई।
- `check.issue_count` (`number`): validation issues की संख्या।
- `check.issues` (`string[]`): validation issue messages।
- `check.warning_count` (`number`): non-blocking validation warnings की संख्या।
- `check.warnings` (`string[]`): non-blocking validation warning messages।
- `context.manifest_lock` (`string`): lock-file state। `present`, `missing` या `invalid` में से एक।
- `context.template` (`object | null`): ज्ञात होने पर template identifier और version।
- `context.command_contract_exists` (`boolean`): क्या `commands.toml` मौजूद है।
- `context.runnable_intents` (`string[]`): configured finite intents के नाम जिन्हें एजेंट चला सकते हैं।
- `context.missing_read_order` (`string[]`): missing required read-order files।
- `context.missing_optional_read_order` (`string[]`): missing optional read-order files।
- `context.latest_run_exists` (`boolean`): क्या नवीनतम run receipt मौजूद है।
- `command_environment.inherited_intents` (`string[]`): host environment inherit करने वाले runnable intents।
- `command_environment.inherited_network_intents` (`string[]`): network-enabled runnable intents जो host environment inherit करते हैं।
- `effective_policy.project_commands_require_mf_run` (`boolean`): क्या project verification commands को `mf run` उपयोग करना चाहिए।
- `effective_policy.allow_inferred_commands` (`boolean`): क्या agents `commands.toml` के बाहर commands infer कर सकते हैं।
- `effective_policy.auto_stage`, `effective_policy.auto_commit`, `effective_policy.auto_push` (`boolean`): Git automation preferences।
- `state_policy.cache_path` (`string`): local cache path।
- `state_policy.state_path` (`string`): local state path।
- `state_policy.versioned` (`boolean`): क्या mustflow local state versioned होना चाहिए।
- `state_policy.safe_to_delete` (`boolean`): क्या local cache और state regenerate हो सकते हैं।
- `state_policy.stores_raw_conversation`, `state_policy.stores_full_terminal_output`, `state_policy.stores_hidden_chain_of_thought` (`boolean`): raw storage boundaries।
- `diagnostics[].id` (`string`): diagnostic area name।
- `diagnostics[].status` (`string`): diagnostic state। `ok`, `warn`, `fail` या `info` में से एक।
- `diagnostics[].summary` (`string`): छोटा व्यक्ति-पठनीय state।
- `diagnostics[].action` (`string | null`): अगली चलाने योग्य command।

## सख़्त मोड

```sh
npx mf doctor --strict --json
```

सख़्त मोड `mf check --strict` जैसी अतिरिक्त जांचें उपयोग करता है।
mustflow documents, skills, command contracts, retention settings या repository-map behavior बदलने के बाद इसे उपयोग करें।

## निकास कोड

- `0`: root inspect हुआ और कोई issue नहीं मिला।
- `1`: validation में issues मिले, install missing है, या command को unknown option मिला।

एजेंटों और स्वचालन को human summary parse करने के बजाय `--json` output से `ok`, `check.issues`, `diagnostics` और `next_steps` पढ़ने चाहिए।
