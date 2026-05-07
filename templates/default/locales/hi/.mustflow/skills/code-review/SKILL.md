---
mustflow_doc: skill.code-review
locale: hi
canonical: false
revision: 2
name: code-review
description: कोड बदलाव, दायरे, जोखिम, या सत्यापन अंतराल की समीक्षा के समय इस स्किल का उपयोग करें।
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - test_related
    - test_audit
    - lint
---

# कोड समीक्षा

## उद्देश्य

यह सत्यापित करना कि बदलाव अनुरोध के अनुरूप है और व्यवहार संबंधी जोखिम या सत्यापन अंतराल शेष न रहें।

## कब उपयोग करें

- कोड बदलाव, diffs, pull requests, या संभावित regression जोखिमों की समीक्षा आवश्यक हो।
- मुख्य उद्देश्य नया व्यवहार लागू करना नहीं, बल्कि जोखिम मूल्यांकन हो।

## कब उपयोग न करें

- कार्य केवल शब्द-संशोधन, अनुवाद, या स्वरूपण से संबंधित हो।
- समीक्षा के लिए कोई बदली हुई फाइल या diff उपलब्ध न हो।

## आवश्यक इनपुट

- संशोधित फाइलें या diffs
- उपयोगकर्ता द्वारा निर्दिष्ट समीक्षा मानदंड
- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/commands.toml`

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

## सत्यापन

`.mustflow/docs/agent-workflow.md#command-execution-policy` का पालन करें।

संबंधित command intents:

- `test`
- `test_related`
- `test_audit`
- `lint`

raw shell commands न जोड़ें; `.mustflow/config/commands.toml` में परिभाषित command intent नामों का संदर्भ दें।

## विफलता प्रबंधन

- यदि कोई command intent गायब, केवल manual execution तक सीमित, disabled, या unknown हो, तो अनुमान लगाने के बजाय स्थिति रिपोर्ट करें।
- छोड़े गए सत्यापनों और उनसे जुड़े शेष जोखिमों का दस्तावेज़ बनाएं।
- संवेदनशील डेटा या destructive command जोखिम मिलने पर तुरंत रोकें और रिपोर्ट करें।

## आउटपुट प्रारूप

- सारांश
- गंभीरता के आधार पर वर्गीकृत निष्कर्ष
- समीक्षा की गई फाइलों की सूची
- चलाए गए command intents
- छोड़े गए command intents और उनके कारण
- परीक्षण प्रासंगिकता नोट्स
- पहचाने गए शेष जोखिम
