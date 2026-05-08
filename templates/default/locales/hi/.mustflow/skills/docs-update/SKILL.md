---
mustflow_doc: skill.docs-update
locale: hi
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: docs-update
description: mustflow या परियोजना दस्तावेज़ अद्यतन करते समय इस स्किल का उपयोग करें।
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.docs-update
  command_intents:
    - docs_validate
    - mustflow_check
---

# दस्तावेज़ अद्यतन

## उद्देश्य

यह सुनिश्चित करना कि दस्तावेज़ वर्तमान कार्यप्रवाह, कमांड, और उपयोगकर्ता-दृश्य व्यवहार को सही रूप में दर्शाएं।

## कब उपयोग करें

- एजेंट कार्यप्रवाह फाइलें संशोधित हों।
- कमांड अनुबंध या configuration fields बदले जाएं।
- उपयोगकर्ता-दृश्य व्यवहार बदल गया हो और दस्तावेज़ अद्यतन आवश्यक हो।

## कब उपयोग न करें

- कार्य केवल निजी implementation details से संबंधित हो।
- उपयोगकर्ता ने स्पष्ट रूप से कहा हो कि दस्तावेज़ न बदलें।

## आवश्यक इनपुट

- बदला हुआ व्यवहार या configuration field
- संबंधित source या template file
- वर्तमान documentation page या Markdown file
- `.mustflow/config/commands.toml`

## पूर्व शर्तें

- Task Use When conditions से match करता है और Do Not Use When exclusions से match नहीं करता।
- Required inputs उपलब्ध हैं, या missing inputs को guess किए बिना report किया जा सकता है।
- Higher-priority instructions और `.mustflow/config/commands.toml` current scope के लिए check किए गए हैं।

## अनुमत edits

- Edits को इस skill, user request और `.mustflow/skills/INDEX.md` की matching route में बताए scope तक सीमित रखें।
- Command permission न बढ़ाएं, project facts invent न करें और unrelated workflow files न बदलें।

## प्रक्रिया

1. उस दस्तावेज़ का पता लगाएं जो संबंधित व्याख्या का उत्तरदायी है।
2. केवल सबसे प्रासंगिक अनुभाग अपडेट करें।
3. कमांड नाम और paths की शुद्धता सुनिश्चित करें।
4. marketing language या tutorial filler जोड़ने से बचें।
5. generated files को हाथ से संशोधित न करें।

## पश्च शर्तें

- Expected output clear evidence, executed command intents, skipped checks और remaining risks के साथ बनाया जा सकता है।
- Missing command intent, unknown input या authority conflict को छिपाने के बजाय report किया जाता है।

## सत्यापन

यदि `docs_validate` और `mustflow_check` कॉन्फ़िगर हैं और एजेंट उपयोग के लिए उपलब्ध हैं, तो उन्हें चलाएं।
अन्यथा, इन जांचों को छोड़ने का कारण रिपोर्ट करें।

## विफलता प्रबंधन

- यदि docs validation विफल हो, तो पहला प्रासंगिक broken link या syntax error ठीक करें।
- यदि command contract बदला हो, तो documentation और `.mustflow/config/commands.toml` के बीच सुसंगति सत्यापित करें।
- यदि अनुवाद स्थिति स्पष्ट न हो, तो दस्तावेज़ को up-to-date मानकर अनुमान लगाने के बजाय review के लिए चिह्नित करें।

## आउटपुट प्रारूप

- संशोधित दस्तावेज़
- दस्तावेज़ित व्यवहार या fields
- चलाए गए command intents
- छोड़ी गई जांचें और कारण
- आवश्यक अनुवाद फॉलो-अप
