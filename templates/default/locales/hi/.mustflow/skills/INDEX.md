---
mustflow_doc: skills.index
locale: hi
canonical: false
revision: 2
---

# स्किल सूचकांक

वर्तमान कार्य से संबंधित स्किल दस्तावेज़ ही पढ़ें। यदि कोई विशेष स्किल लागू नहीं होती,
तो सबसे न्यूनतम सुरक्षित बदलाव लागू करने के लिए `AGENTS.md` और `.mustflow/config/commands.toml` देखें।

| परिदृश्य | स्किल दस्तावेज़ | संबंधित Command Intents |
| --- | --- | --- |
| कोड बदलाव की समीक्षा | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| परीक्षण जोड़ना, अद्यतन करना, हटाना, या ऑडिट करना | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| विफलता की जांच | `.mustflow/skills/failure-triage/SKILL.md` | मूल विफल intent |
| दस्तावेज़ अद्यतन | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

नई स्किल जोड़ते समय उसे यहां लिंक करें और उसके उपयोग के विशिष्ट परिदृश्य परिभाषित करें।
skill दस्तावेज़ों में raw shell commands शामिल न करें; इसके बजाय
`.mustflow/config/commands.toml` में परिभाषित command intent नामों का संदर्भ दें।
