---
title: mf status
description: स्थानीय mustflow स्थापना स्थिति दिखाने वाली केवल-पढ़ने वाली कमांड।
---

`mf status` जांचता है कि वर्तमान root में mustflow document flow installed है या नहीं, और manifest lock का उपयोग करके changed या missing files report करता है।

यह files modify नहीं करता। automation gates के लिए `mf check` उपयोग करें, और जब किसी व्यक्ति को quick local summary चाहिए तब `mf status` उपयोग करें।
जब किसी automation या agent को result पढ़ना हो, तब `--json` उपयोग करें।

## आउटपुट

- `Installed`: क्या `AGENTS.md` और `.mustflow/` मौजूद हैं।
- `Manifest lock`: lock-file state। `present`, `missing` या `invalid` में से एक।
- `Tracked files`: lock file में दर्ज files की संख्या।
- `Changed files`: ऐसी files की संख्या जिनका current content hash lock से अलग है।
- `Missing files`: lock में दर्ज लेकिन disk से missing files की संख्या।

## उदाहरण

```sh
npx mf status
```

उदाहरण output:

```text
mustflow status
Installed: yes
Manifest lock: present
Tracked files: 10
Changed files: 0
Missing files: 0
```

जब files बदलती या गायब होती हैं, उनके paths summary के नीचे print होते हैं।

## JSON फ़ील्ड

```sh
npx mf status --json
```

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `installed` (`boolean`): क्या `AGENTS.md` और `.mustflow/` मौजूद हैं।
- `manifestLock` (`string`): lock-file state।
- `trackedFiles` (`number`): lock file में दर्ज files की संख्या।
- `changedFiles` (`string[]`): वे paths जिनके hashes बदल गए।
- `missingFiles` (`string[]`): वे paths जो गायब हो गए।
- `issues` (`string[]`): व्यक्ति-पठनीय issue messages।
- `template` (`object | null`): lock file में दर्ज template identifier और version।

## सहायता और निकास कोड

```sh
npx mf status --help
```

Help output `Usage`, `Options`, `Examples` और `Exit codes` के क्रम में होता है।

- निकास कोड `0`: status inspect होकर print हुआ। changed files status inspection को fail नहीं करातीं।
- निकास कोड `1`: command को unknown option मिला।

यदि automation को changed files पर workflow fail करना हो, तो `mf status --json` पढ़कर fields से निर्णय लें, या `mf check` उपयोग करें।
