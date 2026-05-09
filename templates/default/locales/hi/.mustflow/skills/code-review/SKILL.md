---
mustflow_doc: skill.code-review
locale: hi
canonical: false
revision: 3
lifecycle: mustflow-owned
authority: procedure
name: code-review
description: कोड बदलाव, दायरे, जोखिम, या सत्यापन अंतराल की समीक्षा के समय इस स्किल का उपयोग करें।
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.code-review
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# कोड समीक्षा

<!-- mustflow-section: purpose -->
## उद्देश्य

यह सत्यापित करना कि बदलाव अनुरोध के अनुरूप है और व्यवहार संबंधी जोखिम या सत्यापन अंतराल शेष न रहें।

<!-- mustflow-section: use-when -->
## कब उपयोग करें

- कोड बदलाव, diffs, pull requests, या संभावित regression जोखिमों की समीक्षा आवश्यक हो।
- मुख्य उद्देश्य नया व्यवहार लागू करना नहीं, बल्कि जोखिम मूल्यांकन हो।

<!-- mustflow-section: do-not-use-when -->
## कब उपयोग न करें

- कार्य केवल शब्द-संशोधन, अनुवाद, या स्वरूपण से संबंधित हो।
- समीक्षा के लिए कोई बदली हुई फाइल या diff उपलब्ध न हो।

<!-- mustflow-section: required-inputs -->
## आवश्यक इनपुट

- संशोधित फाइलें या diffs
- उपयोगकर्ता द्वारा निर्दिष्ट समीक्षा मानदंड
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

<!-- mustflow-section: preconditions -->
## पूर्व शर्तें

- Task Use When conditions से match करता है और Do Not Use When exclusions से match नहीं करता।
- Required inputs उपलब्ध हैं, या missing inputs को guess किए बिना report किया जा सकता है।
- Higher-priority instructions और `.mustflow/config/commands.toml` current scope के लिए check किए गए हैं।

<!-- mustflow-section: allowed-edits -->
## अनुमत edits

- Edits को इस skill, user request और `.mustflow/skills/INDEX.md` की matching route में बताए scope तक सीमित रखें।
- Command permission न बढ़ाएं, project facts invent न करें और unrelated workflow files न बदलें।

<!-- mustflow-section: procedure -->
## प्रक्रिया

1. संशोधित फाइलों की सूची की समीक्षा करें।
2. असंबंधित या अतिरिक्त edits पहचानें।
3. व्यवहार, configuration, commands, और documentation पर प्रभाव का आकलन करें।
4. परीक्षण प्रासंगिकता की समीक्षा करें:
   - नई कार्यक्षमता के लिए गायब परीक्षण
   - हटाई गई कार्यक्षमता के लिए अप्रचलित परीक्षण
   - ऐसे दोहराव परीक्षण जो नए जोखिम नहीं कवर करते
   - कमजोर या अपर्याप्त assertions
   - स्पष्ट कारण के बिना snapshot updates
   - ऐसे परीक्षण जो अनजाने में हटाया गया व्यवहार वापस लाते हैं
5. संबंधित command intents की उपलब्धता सत्यापित करें।
6. गंभीरता के आधार पर निष्कर्ष दस्तावेज़ित करें।

<!-- mustflow-section: postconditions -->
## पश्च शर्तें

- Expected output clear evidence, executed command intents, skipped checks और remaining risks के साथ बनाया जा सकता है।
- Missing command intent, unknown input या authority conflict को छिपाने के बजाय report किया जाता है।

<!-- mustflow-section: verification -->
## सत्यापन

`.mustflow/docs/agent-workflow.md#command-execution-policy` का पालन करें।

संबंधित command intents:

- `test`
- `test_related`
- `test_audit`
- `lint`

raw shell commands न जोड़ें; `.mustflow/config/commands.toml` में परिभाषित command intent नामों का संदर्भ दें।

<!-- mustflow-section: failure-handling -->
## विफलता प्रबंधन

- यदि कोई command intent गायब, केवल manual execution तक सीमित, disabled, या unknown हो, तो अनुमान लगाने के बजाय स्थिति रिपोर्ट करें।
- छोड़े गए सत्यापनों और उनसे जुड़े शेष जोखिमों का दस्तावेज़ बनाएं।
- संवेदनशील डेटा या destructive command जोखिम मिलने पर तुरंत रोकें और रिपोर्ट करें।

<!-- mustflow-section: output-format -->
## आउटपुट प्रारूप

- सारांश
- गंभीरता के आधार पर वर्गीकृत निष्कर्ष
- समीक्षा की गई फाइलों की सूची
- चलाए गए command intents
- छोड़े गए command intents और उनके कारण
- परीक्षण प्रासंगिकता नोट्स
- पहचाने गए शेष जोखिम
