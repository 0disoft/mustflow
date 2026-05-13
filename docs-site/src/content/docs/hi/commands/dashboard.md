---
title: mf dashboard
description: स्थानीय mustflow डैशबोर्ड शुरू करता है।
---

`mf dashboard` mustflow status, verification suggestions, command intents, command-effect explanations, सुरक्षित preferences और दस्तावेज़ समीक्षा के लिए स्थानीय browser dashboard शुरू करता है।

Status tab installation, manifest lock, template, बदली या missing tracked files, runnable commands, latest run और review वाले documents दिखाता है। Verification tab बदली हुई files पढ़कर copy किए जा सकने वाले `mf run ...` command intents suggest करता है, पर उन्हें run नहीं करता। Commands tab `.mustflow/config/commands.toml` पढ़ता है; local index fresh हो तो SQLite command-effect graph से निकले shared locks और lock conflicts भी दिखाता है। `commands.toml` ही command authority रहता है और dashboard intents run नहीं करता। Settings tab `.mustflow/config/preferences.toml` edit करता है। Documents review tab `.mustflow/review/docs.toml` पढ़ता है और मौजूदा entries को approved, ignored या needs human review के रूप में mark कर सकता है। यह stage, commit, push, version bump या command intents run नहीं करता।

Commands tab read-only है। यह हर command intent का status, lifecycle, run policy, stdin setting, timeout, working directory, write paths और declared blocking reason दिखाता है। `.mustflow/cache/mustflow.sqlite` मौजूद और fresh हो तो यह हर intent के derived write locks और conflict lock share करने वाले दूसरे intents भी दिखाता है। Index missing या stale हो तो stale graph details लौटाने के बजाय rebuild hint दिखाता है।

Editable groups में Git defaults, commit message suggestions, reporting, verification selection, test authoring, refactoring hotspot thresholds and limits, code style, और version-impact preferences शामिल हैं।

## वर्तमान व्यवहार

```sh
npx mf dashboard
```

यह command default रूप से `127.0.0.1` पर local HTTP server start करता है, dashboard URL print करता है, और उसे default browser में open करता है।

Dashboard page में English, Korean, Chinese, Spanish, French और Hindi के लिए language selector है। चुनी गई भाषा browser में save होती है।

Documents review tab default रूप से active review entries दिखाता है। Approved और ignored entries केवल status filter से चुने जाने पर दिखती हैं।

किसी specific port के लिए `--port` use करें। Browser बंद रखना हो तो `--no-open` use करें। किसी tool को URL parse करना हो तो `--json` use करें; JSON mode browser open नहीं करता।

```sh
npx mf dashboard --port 4173
npx mf dashboard --no-open
npx mf dashboard --json
npx mf dashboard --export .mustflow/state/artifacts/dashboard.html
npx mf dashboard --export-json .mustflow/state/artifacts/dashboard.json
```

`--export <path>` local server शुरू किए बिना static HTML dashboard snapshot लिखता है। `--export-json <path>` वही bounded snapshot structured JSON के रूप में लिखता है। Export paths current mustflow root के अंदर रहने चाहिए। Exported files में dashboard session token, API calls, preference-save controls, document-review mutation controls, raw command-output tails, या live-server assumptions शामिल नहीं होते।

## संरचित आउटपुट

`--json` के साथ command local server चलाए रखते हुए dashboard URL, mustflow root और preferences path print करता है।

`--export-json` के साथ command server URL print करने के बजाय JSON file लिखता है। JSON status, verification, commands, update, skills, document-review और preferences snapshots शामिल करता है; raw run output omit करता है और truncation metadata `limits` के तहत रखता है।

Dashboard API session token use करती है और केवल page पर दिखाए गए limited preference fields तथा document-review status transitions update करती है। `git.auto_push` locked setting के रूप में दिखता है।

Preference save सफल होने पर dashboard `.mustflow/config/preferences.toml` लिखता है और, यदि `.mustflow/config/manifest.lock.toml` मौजूद हो, तो उस file entry को `last_action = "customized"` के रूप में refresh करता है। इससे `mf check`, `mf status`, और `mf update --dry-run` accepted local preference baseline के साथ aligned रहते हैं।

Document review action सफल होने पर dashboard `.mustflow/review/docs.toml` update करता है। Reviewer kind broad रहता है (`human`, `llm`, `tool`, या `external`); reviewer ID और summary free-form रहते हैं।

## सहायता और निकास कोड

```sh
npx mf dashboard --help
```

- निकास कोड `0`: dashboard start हुआ या सहायता print हुई।
- निकास कोड `1`: dashboard start नहीं हो पाया या input invalid था।
