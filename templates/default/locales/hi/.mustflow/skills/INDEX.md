---
mustflow_doc: skills.index
locale: hi
canonical: false
revision: 6
---

# स्किल सूचकांक

वर्तमान कार्य से संबंधित स्किल दस्तावेज़ ही पढ़ें। यदि कोई विशेष स्किल लागू नहीं होती,
तो सबसे न्यूनतम सुरक्षित बदलाव लागू करने के लिए `AGENTS.md` और `.mustflow/config/commands.toml` देखें।

## चयन नियम

- task start और first edit से पहले user request और expected changed files को नीचे के scenarios से मिलाएं।
- यदि एक या अधिक scenarios match हों, तो उस scope को edit करने से पहले हर matching `SKILL.md` पढ़ें।
- यदि task के दौरान command failure, test contract change, या documentation change जैसी नई condition आए,
  तो रुकें और newly matching skill पढ़कर आगे बढ़ें।
- यदि कोई scenario लागू नहीं होता, तो skill invent न करें। `AGENTS.md`,
  `.mustflow/docs/agent-workflow.md`, और `.mustflow/config/commands.toml` के साथ आगे बढ़ें।
- Skill documents केवल procedure guide करते हैं। वे declared command intents के बाहर command execution
  authorize नहीं करते।

| परिदृश्य | स्किल दस्तावेज़ | संबंधित Command Intents |
| --- | --- | --- |
| कोड बदलाव की समीक्षा | `.mustflow/skills/code-review/SKILL.md` | `test`, `test_related`, `test_audit`, `lint` |
| परीक्षण जोड़ना, अद्यतन करना, हटाना, या ऑडिट करना | `.mustflow/skills/test-maintenance/SKILL.md` | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` |
| विफलता की जांच | `.mustflow/skills/failure-triage/SKILL.md` | मूल विफल intent |
| `.mustflow/context/PROJECT.md` भरना या maintain करना | `.mustflow/skills/project-context-authoring/SKILL.md` | `mustflow_check` |
| `.mustflow/skills/*/SKILL.md` procedures बनाना या maintain करना | `.mustflow/skills/skill-authoring/SKILL.md` | `mustflow_check`, `docs_validate` |
| वेब image assets जोड़ना, convert करना, resize करना, या replace करना | `.mustflow/skills/web-asset-optimization/SKILL.md` | `asset_optimize`, `build` |
| दस्तावेज़ अद्यतन | `.mustflow/skills/docs-update/SKILL.md` | `docs_validate`, `mustflow_check` |

नई स्किल जोड़ते समय उसे यहां लिंक करें और उसके उपयोग के विशिष्ट परिदृश्य परिभाषित करें।
skill दस्तावेज़ों में raw shell commands शामिल न करें; इसके बजाय
`.mustflow/config/commands.toml` में परिभाषित command intent नामों का संदर्भ दें।
