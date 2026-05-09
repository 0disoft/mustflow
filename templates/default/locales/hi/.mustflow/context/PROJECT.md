---
mustflow_doc: context.project
kind: mustflow-context
locale: hi
canonical: false
revision: 1
lifecycle: user-editable
name: project
authority: contextual
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# परियोजना संदर्भ

यह फाइल कोडिंग एजेंटों के लिए परियोजना-विशिष्ट संदर्भ दर्ज करती है।
यदि कोई फ़ील्ड अज्ञात हो तो उसे खाली छोड़ दें; विवरण का अनुमान या निर्माण न करें।

## अधिकार सीमाएं

- यह फाइल समर्थित संदर्भ, अज्ञात बातों और टकरावों को दर्ज कर सकती है।
- इसे कमांड चलाने की अनुमति नहीं देनी चाहिए, फाइल-संपादन निषेध परिभाषित नहीं
  करने चाहिए, `AGENTS.md` या `.mustflow/config/*.toml` को override नहीं करना
  चाहिए, और वर्तमान स्रोतों से समर्थित न होने वाली सुविधाओं का वादा नहीं करना
  चाहिए।
- टिकाऊ संचालन नियमों को यहां रखने के बजाय `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md`, या संबंधित configuration file में रखें।

## वर्तमान लक्ष्य

निर्धारित नहीं। परियोजना स्वामी द्वारा उपलब्ध कराए जाने पर इसे वर्तमान परियोजना लक्ष्य से बदलें।

## गैर-लक्ष्य

निर्धारित नहीं। ऐसे क्षेत्रों या उद्देश्यों की सूची दें जिन्हें असंबंधित कार्यों में एजेंट को नहीं अपनाना चाहिए।

## मुख्य वादे

- अनिवार्य संचालन नियमों के लिए `AGENTS.md` का पालन करें।
- कमांड के लिए `.mustflow/config/commands.toml` को सत्य का प्रमुख स्रोत मानें।
- कार्यप्रवाह और दस्तावेज़ सीमाओं के लिए `.mustflow/config/mustflow.toml` को सत्य का प्रमुख स्रोत मानें।
- व्यापक रिपॉजिटरी अवलोकन की आवश्यकता होने पर `REPO_MAP.md` को सतही नेविगेशन मानचित्र की तरह उपयोग करें।

## डोमेन शब्द

निर्धारित नहीं। केवल वही शब्द जोड़ें जो implementation निर्णयों को प्रभावित करते हों।

## अतिरिक्त सावधानी वाले क्षेत्र

निर्धारित नहीं। ऐसे paths, public APIs, generated files, migrations, secrets, या compatibility सतहों की सूची दें जिन पर विशेष ध्यान आवश्यक हो।

## आगे पढ़ें

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## अप्रचलन जांच

- यदि इस फाइल का टकराव वर्तमान कोड, परीक्षण, कमांड अनुबंध, या उपयोगकर्ता निर्देशों से हो, तो इसे stale मानें और टकराव रिपोर्ट करें।
- इस फाइल को केवल तब अपडेट करें जब परियोजना दिशा, non-goals, या रिपॉजिटरी-व्यापी वादे वास्तव में बदलें।
