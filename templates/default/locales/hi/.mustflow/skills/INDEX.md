---
mustflow_doc: skills.index
locale: hi
canonical: false
revision: 8
---

# Skills Index

मौजूदा काम से जुड़ा हुआ skill दस्तावेज ही पढ़ें। अगर कोई skill लागू नहीं होती, तो सबसे छोटा सुरक्षित बदलाव करने के लिए `AGENTS.md` और `.mustflow/config/commands.toml` का पालन करें।

## चयन नियम

- काम शुरू करते समय और पहली edit से पहले, user request और बदले जाने वाले files को नीचे दिए triggers से मिलाएं।
- अगर एक या अधिक trigger मिलते हैं, तो उस scope में edit करने से पहले हर संबंधित `SKILL.md` पढ़ें।
- काम के दौरान command failure, test contract change या documentation change जैसी नई condition दिखे, तो रुककर नई matching skill पढ़ें और फिर आगे बढ़ें।
- अगर कोई trigger लागू नहीं होता, तो skill invent न करें। `AGENTS.md`, `.mustflow/docs/agent-workflow.md` और `.mustflow/config/commands.toml` के साथ आगे बढ़ें।
- Skill documents केवल procedure बताते हैं। वे declared command intents से बाहर command execution की अनुमति नहीं देते।
- Route table compact रखें: हर route trigger, required input, edit scope, risk, verification intents और expected output बताता है।

| Trigger | Skill Document | Required Input | Edit Scope | Risk | Verification Intents | Expected Output |
| --- | --- | --- | --- | --- | --- | --- |
| Report से पहले code changes की review चाहिए | `.mustflow/skills/code-review/SKILL.md` | Diff और task goal | Changed files | behavior और regression | `test`, `test_related`, `test_audit`, `lint` | Findings या no-issue note |
| Tests add, update, remove या audit हो रहे हैं | `.mustflow/skills/test-maintenance/SKILL.md` | Changed behavior या stale-test evidence | Test files और related source | contract drift | `test`, `test_related`, `test_audit`, `snapshot_update`, `lint`, `build` | Test rationale और verification |
| Security-sensitive behavior changes को abuse-case regression tests चाहिए | `.mustflow/skills/security-regression-tests/SKILL.md` | Changed boundary, actors और expected deny behavior | Test files और related security boundary source | false confidence और unsafe coverage | `test`, `test_related`, `test_audit`, `lint`, `build` | Security boundary, abuse case, tests और remaining risks |
| Configured command intent या verification step fail हुआ | `.mustflow/skills/failure-triage/SKILL.md` | Failing intent और output tail | सिर्फ failure cause | misdiagnosis | `mustflow_check`; original failing intent | Root cause, fix, rerun result |
| `.mustflow/context/PROJECT.md` में cautious project context चाहिए | `.mustflow/skills/project-context-authoring/SKILL.md` | Supported project facts | `.mustflow/context/PROJECT.md` | authority drift | `mustflow_check` | Updated cautious context |
| Skill procedures या routes create/maintain हो रहे हैं | `.mustflow/skills/skill-authoring/SKILL.md` | Repeated task evidence | `.mustflow/skills/**` | overlap और command drift | `mustflow_check`, `docs_validate` | Skill route और procedure changes |
| Web image assets add, convert, resize या replace हो रहे हैं | `.mustflow/skills/web-asset-optimization/SKILL.md` | Image asset request और target path | Web image assets | asset quality और size | `asset_optimize`, `build` | Optimized asset notes |
| Documentation changes public या workflow docs को affect करते हैं | `.mustflow/skills/docs-update/SKILL.md` | Changed behavior या field | Relevant docs only | stale public docs | `docs_validate`, `mustflow_check` | Doc changes और skipped checks |

नई skill introduce करते समय उसे यहां link करें और concrete trigger तथा route fields लिखें।
Skill documents में raw shell commands न डालें; `.mustflow/config/commands.toml` में defined command intent names ही reference करें।
