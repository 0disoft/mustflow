---
title: mf script-pack
description: command contract के अंतर्गत bundled utility scripts को list, suggest और run करता है।
---

`mf script-pack` छोटे checkers को एक namespace में रखता है। listing और suggestions read-only हैं; suggestion execution authority नहीं है।

```sh
npx mf script-pack list --json
npx mf script-pack suggest --path src/cli/index.ts --phase before_change
npx mf script-pack run core/text-budget check README.md --max 5000
```

helpers में source outline, relative import graph, change impact, symbol read, route outline, export diff, docs reference drift, text budget, config chain, generated boundary और related files शामिल हैं। `run_hint` दिखने पर भी local command contract और helper side-effect metadata की अनुमति चाहिए। package managers, shell wrappers, Git writes और publishing जैसे unconfigured processes रोके जाते हैं।
