---
title: mf dashboard
description: स्थानीय mustflow डैशबोर्ड शुरू करता है।
---

`mf dashboard` सुरक्षित mustflow preferences देखने और बदलने के लिए स्थानीय browser dashboard शुरू करता है।

पहला dashboard surface केवल `.mustflow/config/preferences.toml` को edit करता है। यह stage, commit, push, version bump या command intents run नहीं करता।

Editable groups में Git defaults, commit message suggestions, reporting, verification selection, test authoring, code style, और version-impact preferences शामिल हैं।

## वर्तमान व्यवहार

```sh
npx mf dashboard
```

यह command default रूप से `127.0.0.1` पर local HTTP server start करता है, dashboard URL print करता है, और उसे default browser में open करता है।

Dashboard page में English, Korean, Chinese, Spanish, French और Hindi के लिए language selector है। चुनी गई भाषा browser में save होती है।

किसी specific port के लिए `--port` use करें। Browser बंद रखना हो तो `--no-open` use करें। किसी tool को URL parse करना हो तो `--json` use करें; JSON mode browser open नहीं करता।

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
```

## संरचित आउटपुट

`--json` के साथ command local server चलाए रखते हुए dashboard URL, mustflow root और preferences path print करता है।

Dashboard API session token use करती है और केवल page पर दिखाए गए limited preference fields update करती है। `git.auto_push` locked setting के रूप में दिखता है।

Preference save सफल होने पर dashboard `.mustflow/config/preferences.toml` लिखता है और, यदि `.mustflow/config/manifest.lock.toml` मौजूद हो, तो उस file entry को `last_action = "customized"` के रूप में refresh करता है। इससे `mf check`, `mf status`, और `mf update --dry-run` accepted local preference baseline के साथ aligned रहते हैं।

## सहायता और निकास कोड

```sh
npx mf dashboard --help
```

- निकास कोड `0`: dashboard start हुआ या सहायता print हुई।
- निकास कोड `1`: dashboard start नहीं हो पाया या input invalid था।
