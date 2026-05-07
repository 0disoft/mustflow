---
mustflow_doc: agents.root
locale: hi
canonical: false
revision: 5
---

# AGENTS.md

यह फाइल इस रिपॉजिटरी में LLM कोडिंग एजेंट के लिए पढ़ने योग्य पहला कार्य-समझौता है।
यह रिपॉजिटरी mustflow एजेंट कार्यप्रवाह का पालन करती है।
mustflow द्वारा प्रबंधित विवरण `.mustflow/` के अंतर्गत हैं।

## पढ़ने का क्रम

1. `AGENTS.md`
2. `.mustflow/docs/agent-workflow.md`
3. `.mustflow/config/mustflow.toml`
4. `.mustflow/config/commands.toml`
5. `.mustflow/config/preferences.toml` (यदि मौजूद हो)
6. `.mustflow/skills/INDEX.md`
7. `.mustflow/context/INDEX.md` केवल तब, जब कार्य के लिए परियोजना, उत्पाद, डोमेन, UI,
   बैकएंड, डेटा, सुरक्षा या संचालन संदर्भ चाहिए
8. `.mustflow/context/<name>.md` की संबंधित फाइलें, केवल तब जब संदर्भ सूचकांक उन्हें चुने
9. `.mustflow/skills/<name>/SKILL.md` की संबंधित फाइल
10. `REPO_MAP.md` केवल तब, जब रिपॉजिटरी में व्यापक नेविगेशन की आवश्यकता हो
11. संबंधित स्रोत, परीक्षण और दस्तावेज़ फाइलें

## मुख्य नियम

- उपयोगकर्ता द्वारा किए गए मौजूदा बदलाव वापस न करें।
- पैकेज प्रबंधक फाइलों से कमांड का अनुमान न लगाएं।
- केवल वही कमांड परिभाषाएं चलाएं जिनमें `status` = `configured`, `lifecycle` = `oneshot`,
  और `run_policy` = `agent_allowed` हो।
- कॉन्फ़िगर किए गए oneshot कमांड के लिए `mf run <intent>` को प्राथमिकता दें।
- विकास सर्वर, watcher, ब्राउज़र इंटरफेस, इंटरैक्टिव prompt,
  या पृष्ठभूमि प्रक्रियाएं सीधे शुरू न करें।
- स्वायत्त लूप, worker प्रक्रिया, persona प्रणाली, या लंबी अवधि harness प्रक्रियाएं शुरू न करें,
  जब तक यह रिपॉजिटरी उन्हें स्पष्ट रूप से कॉन्फ़िगर न करे।
- जब कार्य लंबा चल सकता हो या संवेदनशील स्थिति प्रभावित कर सकता हो, तब
  `.mustflow/config/mustflow.toml` में `[budget]`, `[approval]`, और `[isolation]` का पालन करें।
- बड़े बदलावों से पहले read-only स्वास्थ्य जांच के लिए `mf doctor` या `mf doctor --json` चलाएं।
- `mf context --json` मशीन-पठनीय दिशा दे सकता है, लेकिन यह नियम और कमांड विनिर्देशन का विकल्प नहीं है।
- `.mustflow/config/preferences.toml` की प्राथमिकता सीधे उपयोगकर्ता निर्देशों और मौजूदा परियोजना शैली से कम है।
- `.mustflow/context/` की संदर्भ फाइलें परियोजना दिशा और डोमेन परंपराएं बताती हैं।
  इन्हें कार्य-विशिष्ट संदर्भ के रूप में लें, न कि कोड, परीक्षण, कमांड या उपयोगकर्ता निर्देशों के स्थान पर।
- यदि `DESIGN.md` मौजूद हो, तो उसे केवल UI, दृश्य डिज़ाइन, लेआउट, design token, या
  अभिगम्यता कार्य के लिए पढ़ें। यदि `DESIGN.md` नहीं है, तो नई फाइल न बनाएं।
- जब उपयुक्त skill लागू हो, उसकी संबंधित skill फाइल पढ़ें।
- स्पष्ट अनुरोध के बिना generated files, external dependencies, या secrets files संशोधित न करें।
- root के `config/`, `docs/`, या `skills/` डायरेक्टरी को mustflow दस्तावेज़ न मानें।

## Parent और Child नियम प्राथमिकता

- संपादित फाइलों के सबसे निकट का `AGENTS.md` अधिक विशिष्ट नियम है।
- यदि कार्यप्रवाह, शैली, परीक्षण, या कमांड नियमों में टकराव हो, तो child रिपॉजिटरी के `AGENTS.md`
  और `.mustflow/config/commands.toml` का पालन करें।
- secrets, गोपनीयता, destructive commands, और अनुमत संपादन मार्गों के सुरक्षा नियम संचयी हैं।
  अधिक सख्त नियम अपनाएं।
- nested रिपॉजिटरी में जाने पर संपादन से पहले उसका `AGENTS.md` और
  `.mustflow/config/*.toml` फिर से पढ़ें।
- स्पष्ट अनुरोध के बिना चुनी हुई child रिपॉजिटरी के बाहर संपादन न करें।

## होस्ट-विशिष्ट निर्देश अनुकूलता

कुछ कोडिंग होस्ट अपने अलग निर्देश फाइल पढ़ सकते हैं या अपनी approval, sandbox, checkpoint,
और command execution नीतियां लागू कर सकते हैं।

इन host नीतियों को अतिरिक्त सुरक्षा और execution constraints मानें। ये इस रिपॉजिटरी के
mustflow command contract को प्रतिस्थापित नहीं करतीं। जब host निर्देश mustflow नियमों से टकराएं:

- सीधे उपयोगकर्ता निर्देश task goal तय करते हैं, जब तक वे असुरक्षित न हों।
- host safety और approval gates बाध्यकारी रहते हैं।
- repository work rules सबसे निकट के `AGENTS.md` और `.mustflow/config/*.toml` से आते हैं।
- project verification commands को configured mustflow intents का उपयोग करना चाहिए।
- privacy, secrets, destructive commands, और Git push पर अधिक सख्त नियम लागू होता है।
- generated state, summaries, और caches कभी भी current files या current user instructions से ऊपर नहीं होते।

यदि effective rule स्पष्ट न हो, तो अनुमान लगाने के बजाय रुकें और conflict रिपोर्ट करें।

## निर्देश पुनर्पाठ जाँच बिंदु

- लंबी सत्रों में mustflow निर्देशों को पहली बार संपादन से पहले, command intent के पास fresh
  command refresh न होने पर command चलाने से पहले, संदर्भ संपीड़न के बाद, `AGENTS.md` या
  `.mustflow/**` बदलने के बाद, परियोजना root बदलने के बाद, और अंतिम रिपोर्ट लिखने से पहले दोबारा पढ़ें।
- `.mustflow/config/mustflow.toml` में `[refresh]` नीति से तय करें कि light, command, skill,
  या full refresh की आवश्यकता है।
- बातचीत के turn count या session activity को परियोजना फाइलों में संग्रहीत न करें।
  session refresh स्थिति local cache या host application में रहनी चाहिए।

विस्तृत कार्यप्रवाह, कमांड नीति, विफलता प्रबंधन, और सुरक्षा नियम
`.mustflow/docs/agent-workflow.md` में हैं।
