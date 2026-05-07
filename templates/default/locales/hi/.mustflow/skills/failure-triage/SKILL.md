---
mustflow_doc: skill.failure-triage
locale: hi
canonical: false
revision: 1
name: failure-triage
description: जब कोई configured command intent या verification step विफल हो, तब इस स्किल का उपयोग करें।
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - mustflow_check
---

# विफलता विश्लेषण

## उद्देश्य

फाइलें संशोधित करने से पहले विफल कमांड या सत्यापन चरण की सबसे संभावित मूल वजह पहचानना।

## कब उपयोग करें

- कोई configured command intent non-zero exit code लौटाए।
- validation, build, test, या documentation checks विफल हों।
- विफलता की मूल वजह अभी स्पष्ट न हो।

## कब उपयोग न करें

- विफलता पूरी तरह समझ में आ चुकी हो और लक्षित समाधान उपलब्ध हो।
- उपयोगकर्ता ने केवल उच्च-स्तरीय सारांश मांगा हो।

## आवश्यक इनपुट

- मूल command intent
- exit code
- stdout और stderr की truncated output
- हाल ही में संशोधित फाइलें
- संबंधित command contract entry

## प्रक्रिया

1. मूल विफल intent नाम संरक्षित रखें।
2. पहली actionable error का विश्लेषण करें।
3. तय करें कि विफलता code, tests, configuration, documentation, या environment से आई है।
4. सबसे प्रासंगिक फाइलों की जांच करें।
5. एकल परिकल्पना बनाएं और सबसे लक्षित configured intent से सत्यापित करें।

## सत्यापन

जहां संभव हो, मूल विफल intent फिर से चलाएं। यदि वह बहुत व्यापक है, तो वही विफलता क्षेत्र अलग करने वाला
सबसे लक्षित configured intent चलाएं।

## विफलता प्रबंधन

- असंबंधित समाधानों को एक साथ न जोड़ें।
- यदि विफलता missing tools के कारण हो, तो missing tool और समस्या दिखाने वाली command रिपोर्ट करें।
- यदि output में संवेदनशील डेटा दिखे, तो raw output कॉपी करना रोकें और जानकारी को सुरक्षित रूप में सारांशित करें।

## आउटपुट प्रारूप

- विफल intent
- संभावित मूल कारण
- साक्ष्य
- लागू या अनुशंसित समाधान
- चलाया गया सत्यापन
- शेष जोखिम
