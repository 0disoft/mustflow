---
title: mf init
description: उपयोगकर्ता रिपॉज़िटरी में mustflow दस्तावेज़ आरंभ करता है।
---

`mf init` mustflow template को उपयोगकर्ता repository root में copy करता है।

यह root पर `AGENTS.md` बनाता है और mustflow-managed documents और settings को `.mustflow/` के अंतर्गत रखता है।

## बनाई गई संरचना

```text
AGENTS.md
.gitignore
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
└─ skills/
   ├─ INDEX.md
   ├─ code-review/SKILL.md
   ├─ docs-update/SKILL.md
   ├─ failure-triage/SKILL.md
   └─ test-maintenance/SKILL.md
```

`REPO_MAP.md` static template से copy नहीं होता। उपयोगकर्ता के अनुरोध पर यह repository structure से generate होता है।
सफल `mf init` के बाद `manifest.lock.toml` भी generate होता है; यह record करता है कि वास्तव में क्या install हुआ।
`DESIGN.md` mustflow द्वारा create नहीं किया जाता। यदि project में यह पहले से मौजूद है, तो `mf map` इसे optional visual-design anchor मान सकता है।

## टेम्पलेट स्रोत संरचना

installation target paths consistent रहते हैं, लेकिन package-side template उद्देश्य के अनुसार विभाजित होता है:

```text
templates/default/
├─ common/
│  ├─ gitignore.mustflow
│  └─ .mustflow/config/
└─ locales/
   ├─ en/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ ko/
   │  ├─ AGENTS.md
   │  └─ .mustflow/
   ├─ zh/
   ├─ es/
   ├─ fr/
   └─ hi/
```

`common/` में language-neutral TOML configuration और managed `.gitignore` fragment होता है। `locales/<locale>/` में `--locale` द्वारा चुने गए Markdown documents और skill files होते हैं।

## नियम

- copied files केवल उन workflow files तक सीमित हैं जिन्हें LLM agents सीधे पढ़ते हैं।
- केवल package install करने से user files modify नहीं होतीं।
- default रूप से, existing file conflicts किसी भी file लिखने से पहले process abort कर देंगे।
- यदि `AGENTS.md` पहले से मौजूद है, तो `--merge` केवल mustflow managed block insert कर सकता है।
- यदि `.gitignore` मौजूद नहीं है, तो `mf init` उसे create करता है। यदि वह पहले से मौजूद है, तो mustflow केवल अपना managed block update करता है और user rules सुरक्षित रखता है।
- `--force` conflicting files को overwrite करने से पहले `.mustflow/backups/` के अंतर्गत backup करता है।
- `REPO_MAP.md` static template से copy होने के बजाय repository structure से generate होता है।
- `manifest.lock.toml` installed workflow-file hashes, template identifier और हर tracked file पर की गई action record करता है। `.gitignore` support block lock file में track नहीं होता।
- `.mustflow/context/` में agent-facing project context होता है, general documentation archive नहीं।
- `README.md`, `.github/` और मौजूदा `config/`, `docs/`, `skills/` directories को touch नहीं किया जाता।
- source code, package-manager configuration और CI configuration create नहीं होते।
- `--dry-run` files लिखे बिना install plan print करता है।
- जब install conflicts पर abort हो या `--dry-run` के साथ चले, तब `manifest.lock.toml` नहीं लिखा जाता।

## उदाहरण

```sh
npx mf init
npx mf init --yes
npx mf init --dry-run
npx mf init --interactive
npx mf init --set git.auto_commit=true
npx mf init --merge
npx mf init --force
npx mf init --profile product --locale ko --agent-lang ko
npx mf init --profile product --product-source-locale en --product-locale ko-KR
```

interactive terminal में `mf init` document language, project profile और agent
report language पूछता है। `--interactive` इस prompt flow को force करता है।
advanced preferences enable करने पर prompt automatic staging, automatic commits,
commit message language और commit message suggestions भी set कर सकता है। `--yes`
बिना prompts के English defaults install करता है।

`--set` installation के दौरान preferences की छोटी allowlist set कर सकता है:

- `git.auto_stage`
- `git.auto_commit`
- `git.commit_message.language`
- `reporting.commit_suggestion.enabled`
- `language.memory.summary`

`git.auto_push` जानबूझकर `mf init` में उपलब्ध नहीं है; अगर किसी repository को
वास्तव में इसकी जरूरत हो, तो installation के बाद इसे manually configure करें।

`--yes` सुरक्षित defaults को explicit बनाता है। यह conflicting files को automatic overwrite नहीं करता।

## प्रोफ़ाइल और भाषाएं

`profile` project type बताता है, देश या भाषा नहीं।

समर्थित built-in profiles हैं:

- `minimal`
- `oss`
- `team`
- `product`
- `library`

`--locale` installed mustflow documents की भाषा है। वर्तमान default template `en`, `ko`, `zh`, `es`, `fr` और `hi` देता है, और default `en` है।

`--agent-lang` agent final reports की default language है। यह mustflow document locale से अलग हो सकती है।

उपयोगकर्ता को दिखने वाले उत्पाद पाठ का स्थानीयकरण अलग से `--product-source-locale` और `--product-locale` के साथ दर्ज होता है। ये मान `.mustflow/config/preferences.toml` में `[product_i18n]` में लिखे जाते हैं; ये mustflow दस्तावेज़ भाषा या CLI आउटपुट भाषा नहीं हैं।

उदाहरण के लिए, कोई project Korean agent reports मांग सकता है, Korean mustflow documents install कर सकता है, English product source strings रख सकता है और Korean users को support कर सकता है:

```sh
npx mf init --profile product --locale ko --agent-lang ko --product-source-locale en --product-locale ko-KR
```

## संरचित आउटपुट

`mf init` अभी JSON output format नहीं देता।

automated scripts को human-readable output parse नहीं करना चाहिए। installation के बाद result verify करने के लिए `mf status --json` या `mf check --json` उपयोग करें।

## सहायता और निकास कोड

```sh
npx mf init --help
```

Help output `Usage`, `Options`, `Examples` और `Exit codes` के क्रम में होता है।

- निकास कोड `0`: install पूरा हुआ, no-op पूरा हुआ, या `--dry-run` plan print हुआ।
- निकास कोड `1`: unknown options, file conflicts या incompatible options ने write रोक दिया।

Unknown options error reason के साथ `mf init --help` चलाने की guidance print करते हैं।
