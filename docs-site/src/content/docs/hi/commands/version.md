---
title: mf version
description: इंस्टॉल किए गए mustflow package version को दिखाता है और जरूरत पड़ने पर npm जाँचता है।
---

`mf version` इंस्टॉल किए गए mustflow CLI package version को प्रिंट करता है।

Default रूप में यह network request नहीं करता, ताकि scripts version को स्थिर तरीके से पढ़ सकें।

## npm जाँच

```sh
npx mf version --check
```

`--check` npm registry से latest published version पढ़ता है, उसे installed version से मिलाता है, और नया version मिलने पर update command प्रिंट करता है।

यह packages install नहीं करता और files नहीं बदलता।

## Help और exit codes

```sh
npx mf version --help
```

- Exit code `0`: Version जानकारी प्रिंट की गई।
- Exit code `1`: Command को unknown option मिला या npm जाँच विफल रही।
