---
title: mf flow
description: वर्तमान mustflow root का workflow map REPO_FLOW.md बनाता है।
---

`mf flow` task intake से reading, editing, verification और reporting तक का `REPO_FLOW.md` बनाता है। `REPO_MAP.md` महत्वपूर्ण files का स्थान बताता है; `REPO_FLOW.md` काम आगे बढ़ाने का तरीका बताता है।

```sh
npx mf flow --stdout
npx mf flow --write
npx mf flow --check
```

इसमें stable frontmatter, work/command/artifact/receipt flows, sync करने वाले public contracts और common changes के starting points होते हैं। इसमें timestamps, branches, remote URLs या absolute paths नहीं होते। यह navigation aid है, command authority नहीं। सफलता `0`; invalid options या missing/stale map `1` है।
