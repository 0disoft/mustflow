---
title: mf api
description: agent integrations के लिए stable, read-only JSON reports देता है।
---

`mf api` workflow, command catalog, verification plan, latest evidence, diff risk, health और active locks की machine-readable reports देता है।

```sh
npx mf api workspace-summary --json
npx mf api command-catalog --json
npx mf api verification-plan --changed --json
npx mf api latest-evidence --json
npx mf api health --json
```

`serve --stdio` वही reports line-delimited stdio पर देता है। API project commands नहीं चलाती, files नहीं बदलती और approval या authority नहीं देती। changed-file reports के लिए `--changed`, JSON-only reports के लिए `--json` चाहिए। सफलता `0`; invalid input या report failure `1` है।
