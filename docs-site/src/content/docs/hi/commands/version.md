---
title: mf version
description: इंस्टॉल किए गए mustflow package version को दिखाता है और जरूरत पड़ने पर npm जाँचता है।
---

`mf version` इंस्टॉल किए गए mustflow CLI package version को प्रिंट करता है।

Default रूप में यह network request नहीं करता, ताकि scripts version को स्थिर तरीके से पढ़ सकें।

## npm जाँच

mustflow global install हो तो direct `mf` command चलाएँ।

```sh
mf version --check
```

Project-local install से package manager के जरिए चलाएँ।

```sh
npx mf version --check
bunx mf version --check
```

`--check` npm registry से latest published version पढ़ता है, उसे installed version से मिलाता है, और नया version मिलने पर update command प्रिंट करता है।

यह packages install नहीं करता और files नहीं बदलता।

अगर shell `mf: command not found` दिखाती है, तो `version` command चली ही नहीं; shell को `mf` executable नहीं मिला। mustflow को global install करें, या package manager का global executable directory `PATH` में जोड़ें।

```sh
npm install -g mustflow
bun install -g mustflow
```

Bun के साथ, Bun का global executable directory, आम तौर पर `~/.bun/bin`, `PATH` में है या नहीं यह जाँचें।

## Help और exit codes

```sh
npx mf version --help
```

- Exit code `0`: Version जानकारी प्रिंट की गई।
- Exit code `1`: Command को unknown option मिला या npm जाँच विफल रही।
