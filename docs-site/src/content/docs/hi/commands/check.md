---
title: mf check
description: उपयोगकर्ता रिपॉज़िटरी में mustflow दस्तावेज़ प्रवाह को सत्यापित करता है।
---

`mf check` यह सत्यापित करता है कि स्थापित mustflow फ़ाइलें एजेंटों के लिए पढ़ने योग्य और उपयोगी हैं।
दस्तावेज़ प्रवाह में बदलाव करने के बाद अतिरिक्त सुरक्षा जांचों के लिए `--strict` उपयोग करें।
जब किसी स्वचालन या एजेंट को परिणाम पार्स करना हो, तब `--json` उपयोग करें।

## यह क्या जांचता है

- `AGENTS.md` रिपॉज़िटरी रूट पर मौजूद है।
- `.mustflow/config/mustflow.toml` पार्स किया जा सकता है।
- `.mustflow/config/commands.toml` पार्स किया जा सकता है।
- `.mustflow/config/preferences.toml` मौजूद होने पर पार्स किया जा सकता है।
- `.mustflow/config/mustflow.toml` में `[map]`, `[workspace]` और `[context]` फ़ील्ड वैध प्रकार और सुरक्षित सापेक्ष पथ उपयोग करते हैं।
- `.mustflow/config/preferences.toml` मौजूद होने पर भाषा, फ़ॉर्मैटिंग, कोड शैली, git, दस्तावेज़ और लॉगिंग प्राथमिकताओं के लिए वैध मूल प्रकार उपयोग करता है।
- `.mustflow/config/manifest.lock.toml` मौजूद होने पर वर्तमान फ़ाइल सामग्री से मिलाकर जांचा जाता है।
- `.mustflow/skills/INDEX.md` मौजूद है।
- `.mustflow/skills/*/SKILL.md` फ़ाइलों में मानक सेक्शन हैं।
- `.mustflow/context/*.md` फ़ाइलें मौजूद होने पर खुद को mustflow संदर्भ दस्तावेज़ के रूप में पहचानती हैं।
- `commands.toml` में `status = "configured"` वाले इंटेंट में कमांड जानकारी, जीवनचक्र, रन नीति और टाइमआउट शामिल हैं।
- लंबे समय तक चलने वाले जीवनचक्र `run_policy = "agent_allowed"` के साथ उजागर नहीं किए जाते।

## सख़्त जांचें

```sh
npx mf check --strict
```

`--strict` ऐसी जांचें जोड़ता है जो एजेंट इनपुट की स्थिरता और कमांड सुरक्षा के अधिक करीब हैं।

- skill दस्तावेज़ों में `sh`, `bash` या `powershell` जैसे कच्चे shell fenced blocks नहीं होने चाहिए।
- mustflow-managed Markdown files अपने path के लिए अपेक्षित `mustflow_doc`, `locale`, `canonical`, `revision`, `authority`, और `lifecycle` frontmatter shape बनाए रखें। संबंधित messages logical document id और relative path दोनों दिखाते हैं।
- Context documents direct user instructions, current code, tests, या command contracts को override करने का दावा न करें।
- `.mustflow/skills/INDEX.md` और `.mustflow/context/INDEX.md` routing indexes रहें, procedure documents न बनें।
- `SKILL.md` frontmatter में `metadata.mustflow_schema: "1"`, `metadata.mustflow_kind: procedure`, और `.mustflow/skills/<name>/` folder से match करता `name` होना चाहिए।
- Skill frontmatter में `metadata.command_intents` केवल `.mustflow/config/commands.toml` में declared command intents को reference करे।
- Skill body command चलाने की permission देने का दावा न करे; command permissions `.mustflow/config/commands.toml` में रहती हैं।
- `.mustflow/skills/<name>/` के अंतर्गत skill फ़ोल्डरों में `SKILL.md` के बिना सहायक फ़ाइलें नहीं होनी चाहिए।
- जब किसी skill में `resources.toml` हो, तो पंजीकृत संसाधन मौजूद होने चाहिए और `references/`, `assets/` या `scripts/` के अंतर्गत रहने चाहिए।
- `.mustflow/skills/<name>/scripts/` में अपंजीकृत helper फ़ाइलें नहीं होनी चाहिए।
- script संसाधनों को `run_policy = "requires_command_contract"` और `command_intent` घोषित करना चाहिए, और वह इंटेंट `commands.toml` में configured होना चाहिए।
- script संसाधनों को डिफ़ॉल्ट रूप से नेटवर्क पहुंच, विनाशकारी व्यवहार या skill फ़ोल्डर के बाहर लिखना सक्षम नहीं करना चाहिए।
- `REPO_MAP.md` में generated time, update time, file count या changed-file count जैसी अस्थिर मेटाडेटा नहीं होनी चाहिए।
- `REPO_MAP.md` में remote URL या branch metadata नहीं होना चाहिए जो संदर्भ लीक कर सके या एजेंटों को वर्तमान रूट के बाहर भ्रमित कर सके।
- `commands.toml` को `[defaults].max_output_bytes` और `[defaults].on_timeout` परिभाषित करना चाहिए।
- `mustflow.toml` को `[retention]` नीति परिभाषित करनी चाहिए।
- `REPO_MAP.md` और `.mustflow/state/runs/latest.json` retention आकार सीमाओं के भीतर रहने चाहिए।
- `.mustflow/context/*.md` फ़ाइलें `[retention.context].max_file_kb` के भीतर रहनी चाहिए।
- `.mustflow/context/*.md` फ़ाइलों में स्थानीय absolute paths, secret जैसे key/value text या `DESIGN.md` से दोहराई गई design-token परिभाषाएं नहीं होनी चाहिए।
- `.mustflow/knowledge/**` मौजूद होने पर retention आकार सीमा के भीतर रहना चाहिए।
- कच्चे JSONL logs `.mustflow/**` के अंतर्गत नहीं आने चाहिए।
- `.mustflow/state/runs/latest.json` मौजूद होने पर JSON object के रूप में पार्स होना चाहिए।

सख़्त मोड वैकल्पिक है ताकि सामान्य workflow छोटा रहे। mustflow दस्तावेज़ों, skills, command contracts या repository-map generation rules बदलने के बाद इसकी अनुशंसा की जाती है।

## कॉन्फ़िगरेशन नियम

`mf check` `[map]`, `[workspace]` और `[context]` को लचीली default-backed configuration मानता है, लेकिन असुरक्षित या कठिन-से-समझने वाली values को विफल करता है।
पुरानी installations के लिए, गायब `manifest.lock.toml` check को विफल नहीं करता। जब lock file मौजूद हो, तो missing locked files या content-hash mismatches को failures के रूप में रिपोर्ट किया जाता है।

- `map.output`: non-empty relative path होना चाहिए।
- `map.mode`: अभी केवल `anchors_only` की अनुमति है।
- `map.privacy`: अभी केवल `minimal` की अनुमति है।
- `map.include_nested`: boolean होना चाहिए।
- `map.anchor_files`: non-empty relative paths की array होनी चाहिए।
- `workspace.roots`: वर्तमान रूट के भीतर relative paths होने चाहिए।
- `workspace.max_depth`, `workspace.max_repositories`: positive integers होने चाहिए।
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: booleans होने चाहिए।
- `context.root`, `context.index`, `context.default_files` और `context.external_anchors`: non-empty relative paths उपयोग करने चाहिए।
- `context.read_policy`: अभी केवल `task_relevant_only` की अनुमति है।
- `context.authority`: अभी केवल `contextual` की अनुमति है।
- `preferences.toml` में मुख्य values strings होनी चाहिए।
- `preferences.toml` में automatic commit, sensitive data और drive-by refactor settings booleans होने चाहिए।
- `preferences.toml` में `docs.update_when` string array होना चाहिए।
- `commands.toml` में executable intents को `lifecycle`, `run_policy`, `timeout_seconds` और `stdin` घोषित करना चाहिए।
- `lifecycle = "oneshot"` वाले intents के लिए `timeout_seconds` और `stdin = "closed"` आवश्यक हैं।
- `server`, `watch`, `interactive`, `browser` और `background` intents को default agent-runnable commands के रूप में उजागर नहीं किया जाना चाहिए।

## मानक skill सेक्शन

skill दस्तावेज़ों में ये सेक्शन शामिल होने चाहिए।

```text
## उद्देश्य
## कब उपयोग करें
## कब उपयोग न करें
## आवश्यक इनपुट
## प्रक्रिया
## सत्यापन
## विफलता प्रबंधन
## आउटपुट अनुबंध
```

## उदाहरण

```sh
npx mf check
```

सफल होने पर यह प्रिंट करता है:

```text
mustflow check passed
```

विफल होने पर यह missing files या sections को standard error पर प्रिंट करता है और code `1` के साथ बाहर निकलता है।

## JSON फ़ील्ड

```sh
npx mf check --json
```

Machine-readable output ये फ़ील्ड उपयोग करता है:

- `ok` (`boolean`): क्या सभी जांचें पास हुईं।
- `strict` (`boolean`): क्या `--strict` checks सक्षम थे।
- `issueCount` (`number`): मिली हुई समस्याओं की संख्या।
- `issues` (`string[]`): व्यक्ति-पठनीय समस्या संदेश।
- `issueDetails` (`object[]`): machine-readable समस्या विवरण। लागू होने पर `id` command boundary और संबंधित strict checks के लिए स्थिर identifier है, और `message` `issues` जैसा ही संदेश रखता है।

जब समस्याएं मिलती हैं, JSON रूप भी code `1` के साथ बाहर निकलता है।

## सहायता और निकास कोड

```sh
npx mf check --help
```

सहायता output `Usage`, `Options`, `Examples` और `Exit codes` के क्रम में होता है।

- निकास कोड `0`: सभी आवश्यक फ़ाइलें और settings वैध हैं।
- निकास कोड `1`: validation में समस्याएं मिलीं, या command को unknown option मिला।

एजेंटों और स्वचालन को व्यक्ति-पठनीय सफलता या विफलता text पार्स करने के बजाय `--json` output से `ok`, `issues` और `issueDetails` पढ़ने चाहिए।
