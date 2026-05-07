---
title: mf help
description: स्थापित mustflow दस्तावेज़ों और configuration को पढ़कर सहायता दिखाता है।
---

`mf help` कोई अलग लंबा manual नहीं है। यह वर्तमान रूट से स्थापित mustflow फ़ाइलें पढ़ता है और संबंधित view दिखाता है।

## विषय

```sh
npx mf help workflow
npx mf help skills
npx mf help commands
npx mf help preferences
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

- `workflow`: `.mustflow/docs/agent-workflow.md` print करता है।
- `skills`: `.mustflow/skills/INDEX.md` print करता है।
- `commands`: `.mustflow/config/commands.toml` से command intents और status का summary देता है।
- `preferences`: `.mustflow/config/preferences.toml` से preferences का summary देता है।

## सिद्धांत

Help output कोई दूसरी source of truth नहीं जोड़ता। हर विषय के पीछे एक स्थापित mustflow file होती है।

इससे documentation, configuration और CLI help के बीच drift कम होता है।

## CLI आउटपुट भाषा

`--lang` help headings और error guidance जैसे fixed CLI text की भाषा चुनता है।
वर्तमान values `en`, `ko`, `zh`, `es`, `fr` और `hi` हैं।

```sh
npx mf --lang en help
npx mf --lang ko help
npx mf --lang zh help
npx mf --lang es help
npx mf --lang fr help
npx mf --lang hi help
```

यह `mf init --locale` से अलग है। `--lang` terminal output नियंत्रित करता है; `--locale` स्थापित mustflow documents की भाषा नियंत्रित करता है।

जब `mf help commands` या `mf help preferences` स्थापित project files से descriptions पढ़ता है, तो वे values machine-translated नहीं होतीं। केवल आसपास के CLI labels चुनी गई CLI भाषा उपयोग करते हैं।

## संरचित आउटपुट

`mf help` अभी JSON output format नहीं देता।

जिन एजेंटों और स्वचालन को structured command information चाहिए, उन्हें runnable intent names के लिए `mf context --json` उपयोग करना चाहिए, फिर पूरा contract चाहिए होने पर `.mustflow/config/commands.toml` पढ़ना चाहिए।

## सहायता और निकास कोड

```sh
npx mf help --help
```

English help output `Usage`, `Topics`, `Options`, `Examples` और `Exit codes` के क्रम में होता है।
Localized help इसी क्रम को translated headings के साथ उपयोग करती है।

- निकास कोड `0`: मांगा गया help topic print हुआ, या missing installed topic file report हुई।
- निकास कोड `1`: command को unknown topic या option मिला।

topic list CLI में built-in है, लेकिन हर topic body वर्तमान रूट की `.mustflow/` files से पढ़ी जाती है।
