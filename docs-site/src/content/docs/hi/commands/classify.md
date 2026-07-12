---
title: mf classify
description: बदले paths, public surfaces और validation reasons को वर्गीकृत करता है।
---

`mf classify --changed` Git changes पढ़कर प्रभावित public surfaces और validation reasons बताता है। जिस path का नियम नहीं है वह भी `unclassified_path` और `unknown_change` के साथ दिखता है, ताकि verification plan खाली न रहे।

```sh
npx mf classify --changed --json
npx mf classify README.md schemas/classify-report.schema.json --json
npx mf classify --changed --write .mustflow/state/change-classification.json
```

रिपोर्ट declared intents चुनने के लिए `mf verify` को दी जा सकती है। `--write` target वर्तमान root में रहना चाहिए। यह command checks नहीं चलाती: सफलता `0`, invalid input `1` है।
