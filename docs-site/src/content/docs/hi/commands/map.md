---
title: mf map
description: वर्तमान mustflow रूट के लिए एंकर-आधारित मानचित्र REPO_MAP.md बनाता है।
---

`mf map` वर्तमान mustflow रूट पढ़ता है और एजेंटों के लिए एंकर-आधारित navigation map बनाता है।

यह पूरी file listing के लिए नहीं है। उसके लिए `git ls-files` या editor बेहतर है। `mf map` केवल navigation में मदद करने वाले anchors शामिल करता है, जैसे `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, context files और महत्वपूर्ण configuration files।

## विकल्प

- `--stdout`: generated map को terminal पर print करें।
- `--write`: generated map को `REPO_MAP.md` में लिखें।
- `--depth <number>`: non-priority anchor files के लिए search depth set करें। default `3` है।
- `--include-nested`: configured workspace roots से नेस्टेड रिपॉज़िटरी को `Nested Repositories` section में शामिल करें।
- `--root-only`: configuration में nested repository discovery enabled होने पर भी केवल वर्तमान root के लिए map generate करें।

## शामिल एंकर

ये files मिलने पर शामिल हो सकती हैं।

```text
AGENTS.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml
.mustflow/context/INDEX.md
.mustflow/context/PROJECT.md
.mustflow/skills/INDEX.md
README.md
DESIGN.md
package.json
pyproject.toml
go.mod
Cargo.toml
deno.json
SKILL.md
justfile
Taskfile.yml
Makefile
Dockerfile
compose.yaml
tsconfig.json
ruff.toml
.golangci.yml
```

## बाहर रखे गए पथ

ये paths default रूप से exclude होते हैं।

```text
.git
node_modules
dist
build
coverage
cache
.cache
.astro
```

## उदाहरण

```sh
npx mf map --stdout
npx mf map --write
npx mf map --stdout --depth 3
npx mf map --write --include-nested
npx mf map --write --root-only
```

`--write` के साथ, command repository root पर `REPO_MAP.md` create या update करता है।

generated map के top पर generated time, hashes या file counts जैसी volatile values शामिल नहीं होतीं।

## नेस्टेड रिपॉज़िटरी

जब `.mustflow/config/mustflow.toml` में `map.include_nested = true` और `workspace.enabled = true` दोनों set हों, `mf map` configured `workspace.roots` के अंतर्गत independent repositories खोजता है और उन्हें `Nested Repositories` section में list करता है।

`--include-nested` वर्तमान run के लिए वह section enabled करता है, भले ही `map.include_nested` `false` हो। फिर भी यह केवल `workspace.roots` में declared paths scan करता है।

`--root-only` वर्तमान run को नेस्टेड रिपॉज़िटरी ignore करने के लिए बाध्य करता है, भले ही configuration उन्हें enable करे। दोनों options mutually exclusive हैं।

यह section नेस्टेड रिपॉज़िटरी की internal files list नहीं करता। यह केवल `AGENTS.md`, `REPO_MAP.md`, `.mustflow/config/commands.toml`, `.mustflow/context/INDEX.md`, `DESIGN.md` और major manifest files जैसे entrypoints दिखाता है।

## संरचित आउटपुट

`mf map` अभी JSON output format नहीं देता।

एजेंटों को generated Markdown को complete file index नहीं मानना चाहिए। पहले `Root Anchors` और `Nested Repositories` sections से entrypoint paths पढ़कर इसे navigation map के रूप में उपयोग करें।

## सहायता और निकास कोड

```sh
npx mf map --help
```

help output `Usage`, `Options`, `Examples` और `Exit codes` में organized होता है।

- निकास कोड `0`: map generate हुआ और वैकल्पिक रूप से लिखा गया।
- निकास कोड `1`: command को unknown option, invalid `--depth` value या incompatible nested-repository options मिले।

जब `--stdout` और `--write` दोनों छोड़े जाते हैं, command default रूप से map को terminal पर print करता है।
