---
title: mf update
description: स्थापित mustflow document flow की updates का पूर्वावलोकन करता है या उन्हें सुरक्षित रूप से लागू करता है।
---

`mf update` installed mustflow document flow की current bundled template से तुलना करता है।

`mf update --dry-run` `manifest.lock.toml` पढ़ता है, जांचता है कि current files अभी भी अपने install-time hashes से match करती हैं या नहीं, और update plan print करता है।
`mf update --apply` केवल `update` और `create` items apply करता है, जब कोई blocked local changes या manual-review items नहीं होते।
जब automation या agent को plan parse करना हो, तब `--json` भी उपयोग करें।

human output और JSON output एक ही policy follow करते हैं। baseline lock-file `content_hash` है, और केवल applyable states `update` और `create` हैं।

## dry-run पहले क्यों आता है

mustflow files में agent rules और procedures होते हैं। user-edited files को automatically overwrite करने से repository-specific rules मिट सकते हैं।

इसलिए update command को अलग-अलग पहचानना होता है:

- क्या current file अभी भी install-time hash से match करती है
- क्या current file bundled template से अलग है
- क्या local user changes automatic updates को block करते हैं
- क्या manual review आवश्यक है

## आउटपुट समूह

- `Blocked local changes`: current file hash install-time hash से अलग है, इसलिए automatic update blocked है।
- `Manual review`: file को automatic update के बजाय review चाहिए, जैसे managed block।
- `Would update`: file को `mf update --apply` से update किया जा सकता है।
- `Would create`: file template में मौजूद है लेकिन current root से missing है।

## उदाहरण

```sh
npx mf update --dry-run
```

जब सब कुछ current हो, output ऐसा दिखता है:

```text
mustflow update plan
Policy:
- Baseline: manifest_lock_content_hash
- Apply actions: update, create
- Blocking actions: blocked-local-change, manual-review
- Backup path: .mustflow/backups/<timestamp>/
Blocked local changes: 0
Manual review: 0
Would update: 0
Would create: 0
No template updates needed.
No files were written.
```

जब local changes मिलते हैं, command code `1` के साथ exit करता है। किसी भी future mutating update से पहले user को उन changes inspect करने चाहिए।

## अपडेट लागू करना

```sh
npx mf update --apply
```

`--apply` files केवल तब लिखता है जब ये सभी true हों:

- `Blocked local changes` `0` है।
- `Manual review` `0` है।
- target item `Would update` या `Would create` में है।

existing file update करने से पहले, mustflow `.mustflow/backups/<timestamp>/` के अंतर्गत backup लिखता है।
changes apply करने के बाद, यह `.mustflow/config/manifest.lock.toml` में affected entries को नए hash और `last_action` के साथ refresh करता है।

यदि newly added template file user repository में पहले से मौजूद है, lock file में दर्ज नहीं है, और उसका content अलग है, तो mustflow उसे local change मानता है और overwrite करने से मना करता है।

## JSON फ़ील्ड

```sh
npx mf update --dry-run --json
npx mf update --apply --json
```

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `schema_version` (`number`): output format version।
- `command` (`string`): हमेशा `update`।
- `mode` (`string`): execution mode। `dry-run`, `apply` या `unspecified` में से एक।
- `policy` (`object`): update safety policy।
- `ok` (`boolean`): क्या plan में कोई blocking items नहीं हैं।
- `wroteFiles` (`boolean`): क्या files सच में लिखी गईं। `--dry-run` के लिए यह हमेशा `false` है।
- `summary` (`object`): state के अनुसार update plan counts।
- `items` (`object[]`): per-file plan entries।
- `error` (`string`): failure reason। यह केवल failed output पर आ सकता है।

Nested fields ये shapes उपयोग करते हैं:

- `policy.baseline` (`string`): update decision baseline। अभी `manifest_lock_content_hash`।
- `policy.allowed_apply_actions` (`string[]`): states जिन्हें `--apply` लिख सकता है। अभी `update` और `create`।
- `policy.blocking_actions` (`string[]`): states जो `--apply` को कोई file लिखने से रोकते हैं।
- `policy.dry_run_writes_files` (`boolean`): क्या `--dry-run` files लिखता है। हमेशा `false`।
- `policy.backup_path_pattern` (`string`): existing files replace करने से पहले backup path pattern।
- `policy.never_overwrite_local_changes` (`boolean`): घोषित करता है कि local changes कभी automatically overwrite नहीं होते।
- `policy.writes_only_template_manifest_paths` (`boolean`): घोषित करता है कि update केवल template manifest में listed mustflow files लिखता है।
- `summary.blockedLocalChanges` (`number`): local changes से blocked files की संख्या।
- `summary.manualReview` (`number`): manual review मांगने वाली files की संख्या।
- `summary.wouldUpdate` (`number`): files की संख्या जिन्हें future mutating update बदल सकता है।
- `summary.wouldCreate` (`number`): files की संख्या जिन्हें future mutating update बना सकता है।
- `summary.unchanged` (`number`): files की संख्या जो पहले से current template से match करती हैं।
- `items[].relativePath` (`string`): plan entry का target path।
- `items[].sourceKind` (`string`): item template source से कैसे आया।
- `items[].action` (`string`): planned action state।
- `items[].reason` (`string`): item को उस state में रखने का reason।

जब bundled template बदल गया हो लेकिन user ने installed file edit न की हो, file `Would update` या `summary.wouldUpdate` में दिखती है।

## सहायता और निकास कोड

```sh
npx mf update --help
```

Help output `Usage`, `Options`, `Examples` और `Exit codes` के क्रम में होता है।

- निकास कोड `0`: `--dry-run` plan में कोई blocking items नहीं हैं, या `--apply` blocking items के बिना पूरा हुआ।
- निकास कोड `1`: local changes, manual-review items, missing lock file, invalid options या missing explicit mode ने success रोकी।

`mf update` अकेले चलाने पर files बदले बिना fail होता है। पहले `mf update --dry-run` से review करें, फिर केवल plan safe होने पर `mf update --apply` उपयोग करें।
