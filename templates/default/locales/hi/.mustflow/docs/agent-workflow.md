---
mustflow_doc: docs.agent-workflow
locale: hi
canonical: false
revision: 6
---

# एजेंट कार्यप्रवाह

यह दस्तावेज़ `AGENTS.md` में दिए गए संक्षिप्त राउटर का विस्तार है।
यह mustflow root के भीतर काम करने वाले एजेंटों के लिए डिफॉल्ट संचालन चक्र परिभाषित करता है।

## आरंभिक दिशा

संपादन शुरू करने से पहले `AGENTS.md` में सूचीबद्ध फाइलें पढ़ें। स्थापना स्थिति, कॉन्फ़िगर command intents, और सुझाए गए अगले कदमों की त्वरित read-only जांच के लिए `mf doctor` उपयोग करें।

`REPO_MAP.md` को केवल वर्तमान mustflow root के generated navigation map की तरह उपयोग करें। यह संपूर्ण file listing नहीं है और कार्य-संबंधित फाइलें पढ़ने की आवश्यकता का विकल्प नहीं है।

## परियोजना संदर्भ

`.mustflow/context/` में एजेंटों के लिए task-specific परियोजना संदर्भ होता है।
यह सामान्य documentation archive नहीं है।

- `.mustflow/context/INDEX.md` केवल तब पढ़ें जब कार्य के लिए परियोजना, उत्पाद, डोमेन, UI, बैकएंड, डेटा, सुरक्षा, या संचालन संदर्भ आवश्यक हो।
- केवल index द्वारा चुनी गई संदर्भ फाइलें पढ़ें।
- संदर्भ फाइलों को direct user instructions, current code, tests, command contracts, और configured policies की तुलना में द्वितीयक मानें।
- अनुपस्थित परियोजना लक्ष्य, non-goals, API promises, डेटा नियम, या design tokens का अनुमान न लगाएं।
- यदि `DESIGN.md` मौजूद हो, तो UI कार्य के लिए उसे वैकल्पिक external visual-design anchor की तरह लें। उसके design tokens को `.mustflow/context/` में कॉपी न करें।
- यदि संदर्भ का टकराव current files या commands से हो, तो टकराव रिपोर्ट करें और अधिक प्रामाणिक स्रोत को प्राथमिकता दें।

## इनपुट स्थिरता

उपयोगकर्ता निर्देश, स्थानीय फाइलें, command contracts, और generated reports को अलग-अलग स्रोत मानें।
इन स्रोतों को आपस में न मिलाएं।

- direct user instructions सर्वोच्च प्राथमिकता रखते हैं।
- संपादित फाइलों के निकटतम `AGENTS.md` को व्यापक parent नियमों पर प्राथमिकता दें।
- `.mustflow/config/preferences.toml` में defaults होते हैं, अनिवार्य requirements नहीं।
- `REPO_MAP.md`, `.mustflow/cache/**`, और `.mustflow/state/**` जैसी generated files stale हो सकती हैं।
- compacted summaries स्थिति के derived representations हैं। current code, configuration, command records, और current user instructions उनसे ऊपर हैं।

जब generated file stale लगे, तो हाथ से संपादित करने के बजाय संबंधित `mf` command से refresh करें।

## निर्देश पुनर्पाठ

लंबे सत्रों में निर्देशों से भटकाव हो सकता है। निर्देश refresh को project-file counter नहीं, अनिवार्य checkpoint मानें।

mustflow निर्देशों को इन बिंदुओं पर refresh करें:

- session start
- new task start
- first edit से पहले
- command execution से पहले, जब current task और command intent के पास पहले से fresh command refresh न हो
- `AGENTS.md` या `.mustflow/**` संपादित करने के बाद
- root बदलने या nested repository में जाने के बाद
- context compaction या summarization के बाद
- final report से पहले
- configured turn, tool-call, या output-size threshold के बाद

refresh स्तर तय करने के लिए `.mustflow/config/mustflow.toml` में `[refresh]` उपयोग करें:

- `light`: `AGENTS.md` और `.mustflow/docs/agent-workflow.md` दोबारा पढ़ें
- `command`: `AGENTS.md` और `.mustflow/config/commands.toml` दोबारा पढ़ें
- `skill`: `AGENTS.md` और `.mustflow/skills/INDEX.md` दोबारा पढ़ें
- `full`: mustflow की पूरी reading sequence दोबारा पढ़ें

`before_command_run` current command intent के लिए freshness checkpoint है। अगर command contract नहीं बदला, तो हर repeated command से पहले सभी files दोबारा पढ़ना जरूरी नहीं है।

repository में turn counters, message counts, या session activity न लिखें। यदि agent host refresh state ट्रैक करता है, तो उसे versioned project documents के बाहर local cache या host-managed state में रखें। skills refresh behavior बता सकती हैं, लेकिन वे भरोसेमंद lifecycle hooks नहीं हैं।

## संदर्भ संपीड़न

mustflow tiered context compaction नीति का समर्थन करता है, लेकिन डिफॉल्ट रूप से पूर्ण chat transcripts एकत्र नहीं करता।

`.mustflow/config/mustflow.toml` में `[compaction]` का उपयोग करके घोषित करें कि host agent कैसे अलग करेगा:

- local cache में रखा गया हाल का derived context
- source references वाले मध्यम-स्तरीय summaries
- long-term summaries जो निर्णय, constraints, risks, और next steps संरक्षित रखें

परियोजना में hidden chain of thought, secrets, unbounded raw transcripts, या raw command logs संग्रहीत न करें। default policy `store_raw = false` उपयोग करती है। compacted summary source-linked होना चाहिए और current files तथा current user instructions से कम प्रामाणिक रहना चाहिए।

## हार्नेस अनुबंध सीमा

mustflow स्वायत्त agent runtime नहीं है। यह agent harnesses के लिए repository-local contract layer है।

- Brain contract: `AGENTS.md`, यह workflow file, और skill documents अपेक्षित मॉडल व्यवहार परिभाषित करते हैं।
- Hands contract: `.mustflow/config/commands.toml` और `mf run` सुरक्षित command execution परिभाषित करते हैं।
- Session contract: run records, bounded checkpoints, और compact handoffs पुनर्प्राप्ति के लिए साक्ष्य देते हैं।

worker folders, persona systems, fleet orchestration, raw event logs, या autonomous loops न बनाएं, जब तक रिपॉजिटरी इन वैकल्पिक सतहों को स्पष्ट रूप से न जोड़े।

## लंबी अवधि कार्य चरण

लंबी अवधि या resumed tasks के लिए इन चरणों को अलग रखें:

1. Plan: task goal, repository rules, command contract, और acceptance criteria पढ़ें।
2. Work: current unit के लिए सबसे छोटा सुरक्षित बदलाव करें।
3. Verify: केवल configured oneshot command intents चलाएं, बेहतर है `mf run` के माध्यम से।
4. Judge: परिणाम को मूल acceptance criteria और run receipts के विरुद्ध मूल्यांकित करें।
5. Handoff: task अधूरा, अवरुद्ध, या continuation योग्य हो तो compact handoff छोड़ें।

Judge चरण worker की completion claim को पर्याप्त न माने। इसमें task goal, changed files, command contract, और run receipts उपयोग होने चाहिए।

## कमांड निष्पादन नीति

`package.json`, `Makefile`, `justfile`, `Taskfile.yml`, या source files से command अनुमान न लगाएं।
`.mustflow/config/commands.toml` को command contract मानें।

command intent तभी agent उपयोग के लिए पात्र है जब ये सभी सत्य हों:

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- defined timeout कॉन्फ़िगर हो

`mf run <intent>` को प्राथमिकता दें ताकि परियोजना को `.mustflow/state/runs/latest.json` में concise run record मिले।

development servers, watchers, browser launches, interactive prompts, या background processes सीधे न चलाएं। इसके बजाय skipped intent और कारण रिपोर्ट करें।

## संपादन नीति

बदलाव कार्य-सीमा के भीतर रखें। drive-by refactors न करें।
`.mustflow/config/mustflow.toml` में protected paths न बदलें।

परियोजना की मौजूदा शैली अपनाएं। यदि शैली स्पष्ट न हो, तो `.mustflow/config/preferences.toml` में दिए defaults लागू करें।

generated files को tools से refresh करें:

- `REPO_MAP.md` को `mf map --write` से
- `.mustflow/cache/mustflow.sqlite` को `mf index` से
- `.mustflow/state/runs/latest.json` को `mf run <intent>` से

## सत्यापन

जांच के लिए configured command intents उपयोग करें। सामान्य intent नाम:

- `mustflow_check`
- `test`
- `lint`
- `build`
- `docs_validate`

यदि expected intent गायब, disabled, manual-only, या not configured हो, तो replacement न गढ़ें।
क्या छोड़ा गया और क्यों, यह रिपोर्ट करें।

## सत्यापन सख्ती नीति

कार्य पूर्ण दिखाने के लिए validation कमजोर न करें।

एजेंट को यह नहीं करना चाहिए:

- checks pass कराने के लिए failing tests हटाना
- बिना कारण बताए assertions ढीली करना
- प्रासंगिक command intents छोड़ना
- failure से बचने के लिए command intents को केवल `not_applicable` चिह्नित करना
- implementation के बाद acceptance criteria बदलना

एजेंट tests अपडेट कर सकता है जब intended behavior बदला हो, पुराना test गलत हो, या नया behavior नई coverage मांगता हो। ऐसा बदलाव final report में समझाएं।

## परीक्षण प्रासंगिकता नीति

tests व्यवहार अनुबंध हैं, स्थायी artifacts नहीं।

एजेंट को यह नहीं करना चाहिए:

- केवल पुराने tests की अपेक्षा के कारण हटाया गया व्यवहार फिर लाना
- जानबूझकर हटाई गई सुविधाओं के tests बचाए रखना
- validation pass कराने के लिए failing tests हटाना
- behavior change समझाए बिना assertions ढीली करना
- tests pass कराने के लिए केवल snapshots अपडेट करना

एजेंट tests अपडेट या हटा सकता है जब tested behavior जानबूझकर हटाया गया हो, public contract बदला हो, test केवल हटे implementation details encode करता हो, coverage किसी मजबूत test से duplicate हो, या snapshot अप्रचलित हो।

जब tests जोड़े, अपडेट, हटाए जाएं, या stale candidates पहचाने जाएं, तब behavior contract, affected tests, run commands, skipped command intents, और remaining test risks रिपोर्ट करें।

## बजट, अनुमोदन, और पृथक्करण

लंबी अवधि सुरक्षा नीति के लिए `.mustflow/config/mustflow.toml` उपयोग करें।

- `[budget]` iterations, wall-clock time, command runs, output volume, और repeated failures सीमित करता है।
- `[approval]` उन actions की सूची देता है जिनके लिए आगे बढ़ने से पहले मानव अनुमोदन चाहिए।
- `[isolation]` लंबी अवधि tasks के लिए पसंदीदा worktree या sandbox boundary बताता है।

जब budget limit या approval gate पहुंचे, तो रुकें और report करें। handoff केवल तब उपयोग करें जब यह repository handoff workflow स्पष्ट रूप से enable करे। looping जारी न रखें।
यदि isolation policy अलग worktree या sandbox मांगती है, तो dirty primary worktree में लंबी अवधि autonomous work न चलाएं।

## विफलता प्रबंधन

जब command विफल हो:

1. मूल command intent नाम सुरक्षित रखें।
2. exit code और truncated output tail का विश्लेषण करें।
3. विफलता की सबसे संभावित मूल वजह पहचानें।
4. असंबंधित फाइलों में बदलाव न करें।
5. fix के बाद सबसे लक्षित प्रासंगिक सत्यापन फिर चलाएं।
6. छोड़ी गई जांचें और शेष जोखिम रिपोर्ट करें।

`.mustflow/` में raw full logs, secrets, customer data, या लंबे transcripts संग्रहीत न करें।

## रिपोर्टिंग

final reports में शामिल होना चाहिए:

- बदली हुई फाइलें
- चलाए गए command intents
- कारण सहित छोड़े गए command intents
- सत्यापन परिणाम
- शेष जोखिम

commit सुझाव केवल तब दें जब `.mustflow/config/preferences.toml` इसकी अनुमति देता हो।
