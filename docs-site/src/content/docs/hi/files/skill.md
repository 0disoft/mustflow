---
title: .mustflow/skills/*/SKILL.md
description: repeatable agent tasks के लिए procedure document।
---

`.mustflow/skills/*/SKILL.md` agents को repeatable tasks बिना अनुमान लगाए करने में मदद करता है।

## इसका उपयोग कहां होता है

Agents `.mustflow/skills/INDEX.md` से relevant skill चुनते हैं, फिर repeatable work करने से पहले उस skill को पढ़ते हैं।

Skill documents code review, test maintenance, failure triage, और documentation updates जैसी procedures cover करते हैं। वे shared policy copy करने के बजाय `.mustflow/docs/agent-workflow.md` को reference करते हैं।

## Frontmatter metadata

```yaml
mustflow_doc: skill.code-review
locale: en
canonical: true
revision: 1
name: code-review
description: Use when reviewing code changes, scope, risks, or missing verification.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - lint
```

- `mustflow_doc`: mustflow के भीतर stable skill identifier।
- `locale`: document language।
- `canonical`: क्या यह document canonical source है।
- `revision`: canonical document revision।
- `name`: skill name। इसे folder name से मेल खाना चाहिए।
- `description`: agent को यह skill कब पढ़नी चाहिए।
- `metadata.mustflow_schema`: skill metadata shape का version।
- `metadata.mustflow_kind`: document kind। default skills `procedure` उपयोग करती हैं।
- `metadata.command_intents`: command intent names जिन्हें यह skill reference कर सकती है।

English skill template canonical source है। Localized skill templates अपना locale उपयोग करती हैं और `canonical: false` सेट करती हैं।

## Standard sections

हर skill document में ये sections होनी चाहिए:

- `Purpose`: वह task जिसे skill संबोधित करती है।
- `Use when`: वे स्थितियां जो इस skill को trigger करें।
- `Do not use when`: overuse रोकने वाली exclusions।
- `Required inputs`: action से पहले agents को जुटानी वाली जानकारी।
- `Procedure`: work sequence।
- `Validation`: relevant command intents और checks।
- `Failure handling`: commands fail होने या जानकारी missing होने पर क्या करना है।
- `Output contract`: final report में शामिल items।

## लिखने के नियम

हर skill को एक task type cover करना चाहिए।

Skill documents में raw shell commands न लिखें। Validation section में `.mustflow/docs/agent-workflow.md#command-execution-policy` को reference करें और केवल relevant command intent names सूचीबद्ध करें।

हर intent को `.mustflow/config/commands.toml` के माध्यम से resolve करें। यदि `status = "configured"` मौजूद नहीं है, तो उसे न चलाएं; status और skipped reason report करें।

उदाहरण:

```md
## Validation

Relevant command intents:

- `test`
- `lint`

Resolve each intent through `.mustflow/config/commands.toml`.
```

## Supporting resources

Default skill केवल `SKILL.md` से शुरू होती है। खाली `references/`, `assets/`, या `scripts/` folders पहले से न बनाएं।

जब skill लंबी हो जाए या अलग supporting material चाहिए, तो optional `resources.toml` जोड़ें और references, templates, या scripts वहां register करें। Scripts को guessed paths से invoke नहीं करना चाहिए; उन्हें `.mustflow/config/commands.toml` में command intents से connect करें।

विस्तृत नियमों के लिए [Skill संसाधन](/design/skill-resources/) देखें।
