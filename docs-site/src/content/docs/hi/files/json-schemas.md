---
title: schemas/
description: mustflow के स्थिर JSON output के लिए प्रकाशित JSON Schema contracts।
---

`schemas/` में mustflow के machine-readable JSON output और parsed configuration
shapes के लिए प्रकाशित JSON Schema contracts होते हैं।

## क्या mf init इसे install करता है

नहीं। `mf init` user repository में `schemas/` copy नहीं करता।

Default init template जानबूझकर छोटा रखा गया है। यह `AGENTS.md`,
`.mustflow/**`, और `.gitignore` में mustflow-managed block install करता है;
`REPO_MAP.md` बाद में `mf map` से generate होता है।

## क्या यह npm package में शामिल है

हां। `schemas/` npm package में शामिल है, ताकि tools human-facing text parse
किए बिना इन contracts पर निर्भर कर सकें।

`--json` output के आसपास automation बनाते समय installed package के schemas या
mustflow repository के schemas का उपयोग करें।

## मौजूदा schemas

- `doctor-report.schema.json`: `mf doctor --json`
- `context-report.schema.json`: `mf context --json`
- `version-sources-report.schema.json`: `mf version-sources --json`
- `verify-report.schema.json`: `mf verify --reason <event> --json`
- `run-receipt.schema.json`: `mf run <intent> --json` और `.mustflow/state/runs/latest.json`
- `commands.schema.json`: parsed `.mustflow/config/commands.toml`

Human-readable command output इन schemas में शामिल नहीं है।
