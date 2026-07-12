---
title: mustflow
description: mustflow द्वारा इंस्टॉल किए गए एजेंट-पठनीय वर्कफ़्लो के लिए उपयोगकर्ता दस्तावेज़।
---

mustflow के दस्तावेज़ उन LLM-केंद्रित फ़ाइलों और फ़ील्डों को समझाते हैं जिन्हें `mf init` उपयोगकर्ता रिपॉज़िटरी में बनाता है।

## वर्कफ़्लो को नवीनतम रखना

पहले उसी package manager से mustflow package update करें जिससे उसे install किया था, फिर हर mustflow root में `mf upgrade` चलाएँ। यह packages install नहीं करता; npm version जाँचने के बाद केवल तब project files update करता है जब manifest plan में local-change या manual-review blocker न हो।

```sh
bun update -g --latest
mf upgrade
mf check --strict
```

Plan देखने के लिए `mf upgrade --dry-run` उपयोग करें। Custom workflow file overwrite होने के बजाय block होता है; आवश्यक template change merge और review करके repository के declared flow से manifest lock baseline update करें।

## यह साइट क्या समझाती है

- लक्ष्य रिपॉज़िटरी में हर फ़ाइल कहाँ रखी जाती है।
- एजेंट सबसे पहले कौन-सी फ़ाइलें पढ़ते हैं।
- हर कॉन्फ़िगरेशन फ़ील्ड और दस्तावेज़ अनुभाग का अर्थ क्या है।
- कौन-सी फ़ाइलें कॉपी होती हैं, कौन-सी जनरेट होती हैं, और कौन-सी जानबूझकर नहीं बनाई जातीं।
- कमांड अनुबंध एजेंटों को कमांड का अनुमान लगाने से कैसे रोकते हैं।
- एजेंट `mf context --json` के माध्यम से कौन-सा संदर्भ देख सकते हैं।

## डिफ़ॉल्ट संरचना

```text
AGENTS.md
REPO_MAP.md  # वैकल्पिक रूप से जनरेट की गई फ़ाइल
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml  # सफल init के बाद जनरेट होती है
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
├─ skills/
│  ├─ INDEX.md
│  └─ */SKILL.md
└─ state/  # उपयोग के दौरान जनरेट होता है
   └─ runs/
      ├─ run-*/receipt.json
      └─ latest.json
```

`mf init` `README.md`, `.github/`, रूट `docs/`, रूट `skills/`, स्रोत कोड या पैकेज मैनेजर कॉन्फ़िगरेशन नहीं बनाता।
`REPO_MAP.md` टेम्पलेट से कॉपी होने के बजाय रिपॉज़िटरी संरचना से जनरेट होता है।
`manifest.lock.toml` को `mf init` वास्तविक इंस्टॉल परिणाम दर्ज करने के लिए जनरेट करता है।
`.mustflow/state/runs/latest.json` सबसे नए execution का pointer है; हर `run-*` directory उस execution की saved receipt रखती है, और `latest.index.json` recent retained `run-*` और `verify-*` directories को summarize करता है।

## पढ़ने का क्रम

1. छोटी अनिवार्य नियमावली के लिए `AGENTS.md` पढ़ें।
2. साझा कार्य नीति के लिए `.mustflow/docs/agent-workflow.md` पढ़ें।
3. आधिकारिक दस्तावेज़ों और संरक्षित पथों के लिए `.mustflow/config/mustflow.toml` पढ़ें।
4. चलाए जा सकने वाले कमांड इरादों के लिए `.mustflow/config/commands.toml` पढ़ें।
5. यदि `.mustflow/config/preferences.toml` मौजूद हो, तो रिपॉज़िटरी-स्तरीय डिफ़ॉल्ट के लिए उसे पढ़ें।
6. संबंधित skill चुनने के लिए `.mustflow/skills/INDEX.md` पढ़ें।
7. `.mustflow/context/INDEX.md` केवल तब पढ़ें जब कार्य-विशेष परियोजना संदर्भ की आवश्यकता हो।

यह साइट संदर्भ दस्तावेज़ है। इसे उपयोगकर्ता परियोजनाओं में कॉपी नहीं किया जाता।
