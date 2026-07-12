---
title: mf skill
description: skill route candidates resolve करता है और external SKILL.md को preview, install या update करता है।
---

`mf skill route` agents और integrations के लिए read-only routing prepass है। task, paths और reasons से यह route metadata तथा frontmatter का उपयोग करके छोटी ranked candidate list देता है; default रूप में expanded index नहीं पढ़ता।

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json
npx mf skill import https://github.com/example/agent-skills/tree/main/review/security --dry-run --json
npx mf skill outdated --json
npx mf skill update concurrency-review --dry-run --json
```

`read_plan` और `route_card` केवल जरूरी skill files load करने में मदद करते हैं। वे edit से पहले selected `SKILL.md` पढ़ने की अनिवार्यता या command authority को नहीं बदलते।

External skills `.mustflow/external-skills/` में रहते हैं। `outdated` saved provenance से तुलना करता है; `update <name>` या `update --all` उसी source से refresh करता है। `--trust-scripts` limited command fragments बना सकता है, लेकिन scripts नहीं चलाता और network तथा destructive approvals बनाए रखता है।
