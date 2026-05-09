---
mustflow_doc: skill.test-maintenance
locale: hi
canonical: false
revision: 2
lifecycle: mustflow-owned
authority: procedure
name: test-maintenance
description: व्यवहार, APIs, snapshots, compatibility, या bug fix बदलावों के अनुसार परीक्षण जोड़ने, अपडेट करने, हटाने, या ऑडिट करने के समय इस स्किल का उपयोग करें।
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  pack_id: mustflow.core
  skill_id: mustflow.core.test-maintenance
  command_intents:
    - test
    - test_related
    - test_audit
    - snapshot_update
    - lint
    - build
---

# परीक्षण रखरखाव

<!-- mustflow-section: purpose -->
## उद्देश्य

परीक्षणों को वर्तमान व्यवहार अनुबंध के अनुरूप बनाए रखना।

<!-- mustflow-section: use-when -->
## कब उपयोग करें

- व्यवहार जोड़ा, बदला, हटाया, या deprecated हुआ हो।
- bug fix के लिए regression test चाहिए।
- मौजूदा परीक्षण stale, duplicate, बहुत व्यापक, या हटे हुए implementation details से जुड़े हो सकते हों।
- snapshot output बदल गई हो।

<!-- mustflow-section: do-not-use-when -->
## कब उपयोग न करें

- कार्य केवल गद्य या टिप्पणियां बदलता हो।
- रिपॉजिटरी में configured test intent न हो और उपयोगकर्ता ने परीक्षण न जोड़ने को कहा हो।

<!-- mustflow-section: required-inputs -->
## आवश्यक इनपुट

- उपयोगकर्ता अनुरोध
- वर्तमान व्यवहार अनुबंध
- बदला या हटाया गया कोड पथ
- मौजूदा परीक्षण शैली
- `.mustflow/config/commands.toml`
- `.mustflow/config/mustflow.toml` का `[testing]`

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

1. अपेक्षित वर्तमान व्यवहार परिभाषित करें।
2. नए परीक्षण जोड़ने से पहले मौजूदा परीक्षण खोजें।
3. प्रभावित परीक्षण वर्गीकृत करें:
   - `active`: अभी भी वर्तमान व्यवहार सत्यापित करता है
   - `update_needed`: व्यवहार बदला है
   - `obsolete_candidate`: संभवतः हटे हुए या अप्रासंगिक व्यवहार को सत्यापित करता है
   - `legacy_contract`: पुराना व्यवहार जानबूझकर संरक्षित है
   - `flaky_or_environmental`: विफलता environment पर निर्भर हो सकती है
4. वर्गीकरण के अनुसार परीक्षण जोड़ें, अपडेट करें, हटाएं, या रिपोर्ट करें।
5. केवल इसलिए हटे व्यवहार को वापस न लाएं कि पुराने परीक्षण उसे अपेक्षित करते हैं।
6. snapshot updates को manual मानें, जब तक `snapshot_update` स्पष्ट रूप से approved और configured न हो।
7. परीक्षणों को deterministic और व्यवहार अनुबंध के निकट रखें।

<!-- mustflow-section: postconditions -->
## पश्च शर्तें

- Expected output clear evidence, executed command intents, skipped checks और remaining risks के साथ बनाया जा सकता है।
- Missing command intent, unknown input या authority conflict को छिपाने के बजाय report किया जाता है।

<!-- mustflow-section: verification -->
## सत्यापन

जहां उपलब्ध हों, configured oneshot command intents उपयोग करें:

- `test`
- `test_related`
- `test_audit`
- `snapshot_update` केवल स्पष्ट अनुमोदन के साथ
- `lint`
- `build`

गायब परीक्षण कमांड का अनुमान न लगाएं।

<!-- mustflow-section: failure-handling -->
## विफलता प्रबंधन

- परीक्षण विफल होने पर पहला प्रासंगिक विफलता कारण देखें।
- validation pass कराने के लिए परीक्षण हटाएं या कमजोर न करें।
- यदि यह स्पष्ट न हो कि परीक्षण stale है, तो हटाने के बजाय रिपोर्ट करें।
- यदि test command उपलब्ध न हो, तो missing intent रिपोर्ट करें।

<!-- mustflow-section: output-format -->
## आउटपुट प्रारूप

- परीक्षणित व्यवहार अनुबंध
- जोड़े गए परीक्षण
- अपडेट किए गए परीक्षण
- हटाए गए परीक्षण, कारण सहित
- stale test candidates
- चलाए गए command intents
- छोड़े गए command intents और कारण
- शेष परीक्षण जोखिम
