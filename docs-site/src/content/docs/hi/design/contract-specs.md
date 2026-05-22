---
title: अनुबंध विनिर्देश
description: mustflow के testable workflow rules परिभाषित करने वाले versioned root documents।
---

mustflow अपनी versioned contract specifications को repository में
[`docs/spec/`](https://github.com/0disoft/mustflow/tree/main/docs/spec) के
अंदर रखता है।

ये दस्तावेज़ वे rules परिभाषित करते हैं जिन्हें future commands और schemas को
साझा करना चाहिए। ये concise reference documents हैं, tutorials नहीं।

## JSON Schemas

प्रकाशित JSON Schemas
[`schemas/`](https://github.com/0disoft/mustflow/tree/main/schemas) में हैं और
npm पैकेज में भी शामिल हैं।

- `doctor-report.schema.json`: `mf doctor --json`.
- `context-report.schema.json`: `mf context --json`.
- `run-receipt.schema.json`: `mf run <intent> --json` और `.mustflow/state/runs/latest.json`.
- `commands.schema.json`: parse किया गया `.mustflow/config/commands.toml`.

`commands.schema.json` planning metadata के रूप में `preconditions` भी स्वीकार करता है। ये dry-run,
verify-plan, और explain output में missing paths या stale artifacts दिखा सकते हैं, लेकिन
`satisfy_intent` को dependency की तरह अपने-आप execute नहीं किया जाता।

## मौजूदा specifications

- `instruction-authority-v1.md`: user instructions, host policy, repository files, command contracts, और generated state के बीच effective rule resolution.
- `command-contract-v1.md`: कोई command intent `mf run` से कब चलाया जा सकता है।
- `verification-receipt-v1.md`: `mf run` द्वारा लिखा गया latest run receipt.
- `state-retention-v1.md`: generated state, cache, receipts, और raw output boundaries.

## Installed files से संबंध

Specifications `AGENTS.md`, `.mustflow/docs/agent-workflow.md`,
`.mustflow/config/mustflow.toml`, और `.mustflow/config/commands.toml` जैसे
installed files के व्यवहार को describe करती हैं।

अगर कोई specification और current behavior अलग हों, तो उसे implementation या
documentation bug मानकर ठीक करें। Specification को current user instructions,
host safety gates, या nearest installed mustflow root से ऊपर authority न दें।
