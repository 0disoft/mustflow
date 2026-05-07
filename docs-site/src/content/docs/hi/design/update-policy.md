---
title: mf update नीति
description: बताता है कि mf update planning को सुरक्षित application से कैसे अलग करता है।
---

`mf update` installed mustflow agent document flow को नए template से मिलाने के लिए update करता है।

क्योंकि इन फ़ाइलों में repository-specific agent rules होते हैं, automatic updates को सावधान रहना चाहिए। `mf update --dry-run` पहले plan का preview देता है, और `mf update --apply` केवल तब लिखता है जब कोई blocking item मौजूद न हो।

## Baseline

update baseline `.mustflow/config/manifest.lock.toml` में मौजूद `content_hash` है।

`content_hash` वह file content hash है जिसे अंतिम बार `mf init` या `mf update --apply` ने दर्ज किया था। यदि current file hash इस मान से अलग है, तो mustflow फ़ाइल को locally edited मानता है।

यह नीति `mf update --json` के `policy` object में भी शामिल होती है। Documentation, human-readable output, और automation output को consistent रहना चाहिए।

मौजूदा policy values:

```text
baseline: manifest_lock_content_hash
allowed_apply_actions: update, create
blocking_actions: blocked-local-change, manual-review
dry_run_writes_files: false
backup_path_pattern: .mustflow/backups/<timestamp>/
never_overwrite_local_changes: true
writes_only_template_manifest_paths: true
```

## स्थितियां

`mf update --dry-run` फ़ाइलों को इन स्थितियों में वर्गीकृत करता है:

- `unchanged`: current file lock baseline और bundled template दोनों से मेल खाती है।
- `update`: current file lock baseline से मेल खाती है लेकिन bundled template से अलग है।
- `create`: file template में मौजूद है लेकिन user repository में नहीं है।
- `blocked-local-change`: current file lock baseline से अलग है।
- `manual-review`: file को automatic update के बजाय human review चाहिए।

## लागू करने के नियम

`mf update --apply` ये नियम अपनाता है:

- `blocked-local-change` files को अपने आप modify न करें।
- `manual-review` files को अपने आप modify न करें।
- `update` files को backup बनने के बाद template content से बदला जाता है।
- `create` files आवश्यक parent directories बनने के बाद लिखी जाती हैं।
- यदि कोई new template file lock में मौजूद न होने वाली existing file से conflict करती है, तो उसे local change माना जाता है और overwrite नहीं किया जाता।
- successful update के बाद प्रभावित `manifest.lock.toml` entries refresh करें।
- `mf update` केवल template manifest और lock file में घोषित mustflow files लिखता है।
- यदि कोई write विफल होता है, तो पहले से लिखी गई files और backup paths report करें।

## AGENTS.md संभालना

`AGENTS.md` root entry point है और इसके लिए अतिरिक्त सावधानी चाहिए।

`mf update` पूरी `AGENTS.md` file को automatic merge नहीं करता।

जब मौजूदा `AGENTS.md` को mustflow-managed block के रूप में track किया जाता है, तो mustflow उस block के बाहर की user text का owner नहीं होता। वह block automatic update candidate तभी बन सकता है जब lock file block-level baseline record करे और current block अभी भी उससे match करता हो।

Schema v1 वह block-level baseline store नहीं करता। v1 में merged `AGENTS.md` files `managed-block-update` पाने के बजाय `manual-review` में रहती हैं।

## Backup स्थान

किसी `update` item द्वारा existing file बदलने से पहले backups यहां लिखे जाते हैं:

```text
.mustflow/backups/<timestamp>/
```

Backups अंतिम सुरक्षा परत हैं। उनका मौजूद होना `blocked-local-change` files को अपने आप overwrite करने का औचित्य नहीं देता।

## निकास कोड

- Exit `0`: plan में कोई blocking item नहीं है।
- Exit `1`: `blocked-local-change` या `manual-review` items मौजूद हैं, `--apply` के दौरान भी।
- Exit `1`: lock file missing या invalid है।
- Exit `1`: `mf update` को `--dry-run` या `--apply` चुने बिना चलाया गया।
