---
title: mf tech
description: agents के लिए low-authority technology preferences प्रबंधित करता है।
---

`mf tech` `.mustflow/config/technology.toml` को पढ़ता और update करता है। Preferences hints हैं: वे dependencies install, migrations approve या current code और command contract को override नहीं करते।

```sh
npx mf tech list --json
npx mf tech suggest --scope frontend
npx mf tech add framework nextjs --scope frontend --ecosystem npm --package next --package react --verify --why "Preferred React app framework"
npx mf tech remove framework.frontend.nextjs
```

यह `list`, `suggest`, `add`, `remove` actions देता है। `--verify` write से पहले npm package names ही check करता है; packages install या `package.json` modify नहीं करता। सफलता `0`, input या verification failure `1` है।
