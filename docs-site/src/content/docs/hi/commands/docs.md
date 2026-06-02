---
title: mf docs
description: LLM edits के बाद prose review की जरूरत वाले documents track करता है.
---

`mf docs review` agents द्वारा बनाए या बदले गए documents के लिए repository-local review queue manage करता है.

Queue `.mustflow/review/docs.toml` में store होती है. `mf init` यह file नहीं बनाता; document review में add होने पर ही यह file बनती है.

## Review Model

Queue document status track करती है, reviewer products की fixed list नहीं.

- `pending`: Review चाहिए.
- `in_review`: Review शुरू हुआ.
- `changes_made`: Reviewer ने document बदला.
- `approved`: Review complete है और document default list से छिपता है.
- `needs_human`: Reviewer confidently approve नहीं कर सका.
- `ignored`: Document को intentionally review से बाहर रखा गया.

Reviewers broad kinds use करते हैं: `human`, `llm`, `tool`, या `external`. Specific names, providers, models, और command intents free-form metadata हैं.

## Documents List करें

```sh
npx mf docs review list
npx mf docs review list --json
npx mf docs review list --all
```

Default list केवल active items दिखाती है. स्वीकृत और अनदेखी entries देखने के लिए `--all` use करें.

## Document Add करें

```sh
npx mf docs review add docs/guide.md --reason llm_modified --actor-kind llm --actor-id codex
```

Document add करने से entry create या update होती है और status `pending` बनता है.

## Document Approve करें

```sh
npx mf docs review approve docs/guide.md --reviewer-kind llm --reviewer-id opencode --reviewer-provider deepseek --reviewer-model deepseek-reasoner --summary "Rewritten for natural tone."
```

Approval document को default list से hide करता है लेकिन review record रखता है. Reviewer safely approve न कर सके तो `needs-human`, और repository इस file को skip करे तो `ignore` use करें.

## Help And Exit Codes

```sh
npx mf docs --help
```

- Exit code `0`: Queue inspect या update हुई.
- Exit code `1`: Input invalid था या queue update नहीं हो सकी.
