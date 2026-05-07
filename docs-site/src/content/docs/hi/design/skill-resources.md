---
title: Skill संसाधन
description: बताता है कि जब किसी skill का दायरा SKILL.md से आगे बढ़ जाए, तो references, assets, scripts, और resources.toml कैसे जोड़े जाएं।
---

mustflow skill एक अकेली `.mustflow/skills/<name>/SKILL.md` फ़ाइल से शुरू होती है।

खाली `references/`, `assets/`, या `scripts/` folders पहले से न बनाएं। supporting resources केवल तब जोड़ें जब skill document बहुत बड़ा हो जाए या सच में repeatable helper की आवश्यकता हो।

## मूल सिद्धांत

- `SKILL.md` skill का entry point है।
- `resources.toml` केवल तब मौजूद होता है जब supporting resources मौजूद हों।
- `references/` rubrics, examples, और background notes जैसी read-only लंबी सामग्री रखता है।
- `assets/` templates, sample inputs, और schemas जैसी reusable files रखता है।
- `scripts/` केवल तब मौजूद होता है जब skill को dedicated helper चाहिए।
- Scripts को सीधे `SKILL.md` से invoke नहीं किया जाता; वे `.mustflow/config/commands.toml` के माध्यम से resolve होते हैं।

## वैकल्पिक संरचना

```text
.mustflow/skills/<name>/
├─ SKILL.md
├─ resources.toml        # optional: only when supporting resources exist
├─ references/           # optional: read-only reference material
├─ assets/               # optional: templates, schemas, sample inputs
└─ scripts/              # optional: helpers connected to command intents
```

यह हर skill के लिए अनिवार्य scaffolding नहीं है। डिफ़ॉल्ट template `SKILL.md` देता है; बाकी फ़ाइलें और folders केवल तब जोड़े जाने चाहिए जब skill को सच में उनकी आवश्यकता हो।

## resources.toml

`resources.toml` supporting resources के लिए वैकल्पिक index है। यह skill body को प्रतिस्थापित नहीं करता। यह agents को तय करने में मदद करता है कि कौन सी सामग्री पढ़ी या चलाई जा सकती है, और किन शर्तों के तहत।

अपेक्षित संरचना:

```toml
schema_version = "1"

[resources."references/severity-rubric.md"]
type = "reference"
purpose = "Rubric for classifying review finding severity."
read_when = ["finding_severity_is_unclear"]
required = false

[resources."assets/templates/review-report.md"]
type = "asset"
asset_kind = "template"
purpose = "Template for review report output."
required = false

[resources."scripts/validate-review-report.py"]
type = "script"
language = "python"
purpose = "Validates the review report format."
run_policy = "requires_command_contract"
command_intent = "review_report_validate"
network = false
destructive = false
writes = []
dependencies = ["python>=3.10"]
```

## references/

`references/` का उपयोग लंबी सामग्री के लिए करें जिसे agents केवल आवश्यकता होने पर पढ़ते हैं।

उदाहरण:

- निर्णय rubrics
- विफलता के उदाहरण और सुधार
- आउटपुट उदाहरण
- पृष्ठभूमि notes

यहां secrets, raw execution logs, generated caches, या बड़ी फ़ाइलें न रखें।

## assets/

skill को सहारा देने वाली static files के लिए `assets/` उपयोग करें।

उदाहरण:

- Report templates
- Sample input files
- Validation schemas
- छोटा sample data

यहां बड़े binaries, build output, caches, या secrets न रखें।

## scripts/

dedicated skill helpers के लिए `scripts/` उपयोग करें।

हर script को:

- help output देना चाहिए।
- failure पर non-zero exit code लौटाना चाहिए।
- स्पष्ट input और output rules घोषित करने चाहिए।
- `resources.toml` और `commands.toml` के माध्यम से file writes या network access घोषित करना चाहिए।
- डिफ़ॉल्ट रूप से destructive behavior से बचना चाहिए।

Agents को script paths का अनुमान लगाकर उन्हें सीधे नहीं चलाना चाहिए। जब execution चाहिए, तो पहले `.mustflow/config/commands.toml` में संबंधित command intent resolve करें।

## skills/INDEX.md से संबंध

`.mustflow/skills/INDEX.md` skills की सूची देता है, हर skill के नीचे मौजूद हर supporting file की नहीं।

Supporting resources को skill-local `resources.toml` file index करती है।

## Community skill registry दिशा

mustflow core को अपना default skill set अनिश्चित रूप से नहीं बढ़ाना चाहिए। default template छोटा रहना चाहिए, जबकि अतिरिक्त skills बाद में अलग community skill repository से आ सकती हैं।

Repository names को mustflow naming convention का पालन करना चाहिए, जैसे `mustflow-skills` या `mustflow-community-skills`। बहुत व्यापक या दूसरे skill ecosystems से आसानी से भ्रमित होने वाले नामों से बचें।

यदि community skill repository जोड़ी जाती है, तो हर skill को `SKILL.md` और mustflow-specific `skill.toml` दोनों देने चाहिए। `skill.toml` file को skill identifier, version, compatible mustflow range, license, शामिल scripts, network usage, write scope, और risk level घोषित करने चाहिए।

Skill समूहों को automation skills नहीं, बल्कि `pack` या `bundle` कहा जाना चाहिए। pack skills install करता है; उसे कमांड नहीं चलानी चाहिए और `.mustflow/config/commands.toml` को अपने आप edit नहीं करना चाहिए। आवश्यक या अनुशंसित command intents report किए जाने चाहिए, फिर मौजूदा project के लिए उपयोगकर्ता द्वारा घोषित किए जाने चाहिए।

भविष्य की `mf skill add` या `mf pack add` कमांड को ये safety rules लागू करने होंगे:

- installation से पहले बदली जाने वाली files, शामिल scripts, permissions, और risk level का preview दें।
- installation के दौरान scripts कभी न चलाएं।
- source, version, और hashes को `.mustflow/skills.lock.toml` जैसी lock file में दर्ज करें।
- `mf skill audit` को lock file, current file hashes, script-to-command-intent links, और deprecated skills verify करने दें।
- tool-native skill locations में export को optional adapter रखें, default installation target नहीं।

## जांच नियम

`mf check --strict` सत्यापित करता है:

- Registered files मौजूद हैं।
- Registered files `references/`, `assets/`, या `scripts/` के नीचे हैं।
- `scripts/` में unregistered helpers नहीं हैं।
- Scripts `run_policy = "requires_command_contract"` उपयोग करती हैं और `commands.toml` में configured command intent से जुड़ी हैं।
- Scripts डिफ़ॉल्ट रूप से network access या destructive behavior enable नहीं करतीं।
- Script `writes` declarations relative paths के माध्यम से skill folder तक सीमित हैं।
- हर skill folder में `SKILL.md` मौजूद है।

मौजूदा default template अभी `resources.toml` शामिल नहीं करता। format और rules पहले document किए गए हैं; वास्तविक resource indexes केवल तब जोड़े जाने चाहिए जब skill उन्हें आवश्यक बनाने जितनी जटिल हो जाए।
Large-file, secret, और cache checks को retention और context-file validation की तरह अलग repository safety checks के रूप में बढ़ाया जा सकता है।
