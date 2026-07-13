---
title: .mustflow/config/mustflow.toml
description: agent पढ़ने का क्रम और protected paths घोषित करता है।
---

`.mustflow/config/mustflow.toml` घोषित करता है कि agents को पहले कौन सी files पढ़नी चाहिए और किन paths पर extra care चाहिए।

`mf check` केवल इस file को parse नहीं करता। यह यह भी verify करता है कि `[map]` और `[workspace]` values सुरक्षित रूप से interpret की जा सकती हैं।

## इसका उपयोग कहां होता है

- `AGENTS.md` के पढ़ने के क्रम को machine-checkable configuration में बदलता है।
- agents को mustflow-owned documents और user project documents में अंतर करने में मदद करता है।
- accidental edits घटाने के लिए protected और extra-care paths घोषित करता है।
- final work report में कौन से items आने चाहिए, परिभाषित करता है।

## Sections

- `authority`: authoritative mustflow documents।
- `read_order`: agents के लिए प्रारंभिक पढ़ने का क्रम।
- `optional_read_order`: मौजूद होने पर पढ़ी जाने वाली और missing होने पर skip की जाने वाली files।
- `authority.workflow_preferences`: repository-level default preferences का path।
- `map`: `REPO_MAP.md` कैसे generate होगा और कौन सी anchor files शामिल हो सकती हैं।
- `workspace`: workspace roots के नीचे independent nested repositories discover करने की limits।
- `context`: project context layer, जिसका उपयोग केवल task को ज़रूरत होने पर होता है।
- `capabilities`: इस repository द्वारा दी गई agent work surface।
- `agent_loop`: हर task के लिए agents द्वारा पालन किया जाने वाला standard loop।
- `harness`: agent harnesses के लिए repository-local contract boundary।
- `refresh`: long sessions में mustflow instructions फिर से पढ़ने के checkpoints।
- `compaction`: default रूप से raw transcripts store किए बिना derived recent context, mid summaries, और long summaries अलग रखने की policy।
- `verification`: validation commands कहां से आती हैं और कौन सा inference forbidden है।
- `testing`: tests को current behavior contract से aligned रखने की policy।
- `handoff`: unfinished work को सुरक्षित रूप से hand off कैसे करना है।
- `budget`: long-running या repeated agent activity की limits।
- `approval`: आगे बढ़ने से पहले human approval मांगने वाली actions।
- `isolation`: long-running tasks के लिए preferred worktree या sandbox boundary।
- `retention`: run receipts, repository maps, और future knowledge files को bounded रखने वाली size limits।
- `document_roots`: mustflow document flow से संबंधित paths।
- `document_roots.generated`: generated documents और local state paths।
- `edit_policy.protected`: वे paths जिन्हें agents को default रूप से edit नहीं करना चाहिए।
- `edit_policy.extra_care`: वे paths जिन्हें edit करने से पहले extra caution चाहिए।
- `reporting`: final work report में शामिल items।

## पढ़ने के क्रम के fields

```toml
read_order = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
optional_read_order = [
  ".mustflow/context/INDEX.md",
  "REPO_MAP.md",
]
```

`read_order` required document flow है। `optional_read_order` उन documents को list करता है जिन्हें मौजूद होने पर पढ़ना और missing होने पर skip करना है।

यह file agent guesswork घटाती है और generated files या secrets पर accidental edits रोकने में मदद करती है।

`REPO_MAP.md` `optional_read_order` और `document_roots.generated` में आता है। Agents को इसे केवल broad repository navigation चाहिए होने पर पढ़ना चाहिए, complete file list के बजाय anchor-file map मानना चाहिए, और ज़रूरत पड़ने पर regenerate करना चाहिए।

`.mustflow/context/INDEX.md` `optional_read_order` में है क्योंकि agents को इसे केवल तब पढ़ना चाहिए जब project, product, domain, UI, backend, data, security, या operations context task से relevant हो।

`.mustflow/cache/**` और `.mustflow/state/**` generated paths हैं। cache में `mf index` द्वारा लिखे गए SQLite index जैसी rebuildable supporting files होती हैं; state में उपयोग के दौरान बनी local state होती है, जैसे `mf run` receipts। दोनों paths पहले required पढ़ने के क्रम का हिस्सा नहीं हैं।

## Map fields

```toml
[map]
output = "REPO_MAP.md"
mode = "anchors_only"
privacy = "minimal"
include_nested = true
anchor_files = [
  "AGENTS.md",
  "REPO_MAP.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/context/INDEX.md",
  ".mustflow/context/PROJECT.md",
  ".mustflow/skills/INDEX.md",
  "README.md",
  "DESIGN.md",
  "package.json",
  "pyproject.toml",
  "go.mod",
  "Cargo.toml",
  "deno.json",
  "justfile",
  "Justfile",
  "Makefile",
  "Taskfile.yml",
]
```

`map.output` generated file name है। default `REPO_MAP.md` है।

`map.mode = "anchors_only"` का अर्थ है कि map हर source file के बजाय navigation anchors शामिल करता है।

`map.privacy = "minimal"` का अर्थ है कि generated output default रूप से remote URLs, branch names, recent change state, command lists, और automatic summaries छोड़ देता है।

`map.include_nested = true` का अर्थ है कि configured workspace roots के नीचे nested independent repositories default रूप से index होती हैं। Default root `projects/` है, और discovery workspace fields से bounded रहती है।

`mf check` verify करता है कि `output` और `anchor_files` current root के भीतर relative paths हैं। यह अभी `mode` के लिए केवल `anchors_only` और `privacy` के लिए `minimal` allow करता है।

`preferences.toml` default anchor के रूप में शामिल है ताकि agents response language, documentation, commit messages, logs, और formatting के repository-level defaults जल्दी खोज सकें।

`DESIGN.md` optional external anchor है। mustflow इसे create नहीं करता, लेकिन मौजूद होने पर `mf map` इसे UI, visual design, design-token, layout, या accessibility work के लिए surface कर सकता है।

## Context fields

```toml
[context]
enabled = true
root = ".mustflow/context"
index = ".mustflow/context/INDEX.md"
default_files = [
  ".mustflow/context/PROJECT.md",
]
read_policy = "task_relevant_only"
authority = "contextual"
external_anchors = [
  "README.md",
  "DESIGN.md",
]
```

`context.enabled = true` का अर्थ है कि project `.mustflow/context/` के नीचे agent-facing context रख सकता है।

`context.index` उस router की ओर इशारा करता है जो agents को बताता है कि task के लिए कौन सी context files पढ़नी हैं।
`context.default_files` default template द्वारा installed context files list करता है।

`read_policy = "task_relevant_only"` का अर्थ है कि agents को default रूप से हर context file नहीं पढ़नी चाहिए।
`authority = "contextual"` का अर्थ है कि context files orientation guide करती हैं, लेकिन direct user instructions, current code, tests, command contracts, और configured policies से कम authority रखती हैं।

`external_anchors` उन root files को list करता है जो mustflow-owned files बने बिना context दे सकती हैं।
`README.md` human-facing overview है। `DESIGN.md` optional visual-design anchor है जब project में पहले से मौजूद हो।

## Workspace fields

```toml
[workspace]
enabled = true
roots = ["projects"]
max_depth = 4
max_repositories = 50
follow_symlinks = false
stop_at_repository_root = true
```

`workspace.enabled = true` current root को default रूप से `projects/` के नीचे independent repositories discover करने देता है।

Workspace root के लिए `roots = ["projects", "repos"]` जैसे paths adjust करें। mustflow केवल configured roots scan करता है और parent workspace से child repository command authority grant नहीं करता।

`max_depth` और `max_repositories` accidental large scans रोकते हैं। `follow_symlinks = false` default रूप से workspace के बाहर या दूसरे drive में traversal रोकता है।

`stop_at_repository_root = true` का अर्थ है कि independent nested repository मिलने के बाद parent map को उसके internals में recursively जारी नहीं रहना चाहिए। Parent `REPO_MAP.md` को nested repositories के केवल entrypoints दिखाने चाहिए, उनका वर्णन नहीं।

`mf check` verify करता है कि `roots` current root के भीतर relative paths हैं, `max_depth` और `max_repositories` positive integers हैं, और workspace switches booleans हैं।

## Agent control surface फ़ील्ड

```toml
[capabilities]
workflow = true
command_contract = true
skills = true
repo_map = "generated_optional"
preferences = "optional"
context = "optional"
local_index = "generated_optional"
work_items = "disabled"
services = "disabled"
adapters = []

[agent_loop]
phases = [
  "orient",
  "plan",
  "act",
  "verify",
  "report",
  "handoff",
]

[verification]
command_source = ".mustflow/config/commands.toml"
require_configured_intents = true
allow_inferred_commands = false
require_command_lifecycle = true
require_timeout_for_oneshot = true

[handoff]
enabled = false
mode = "report_only"
```

`capabilities` घोषित करता है कि इस repository में कौन सी agent work surfaces उपलब्ध हैं। `workflow`, `command_contract`, और `skills` core features हैं। `repo_map`, `preferences`, `local_index`, `work_items`, और `services` state-based extension points हैं। default template local index को optional generated data के रूप में देता है, लेकिन `mf init` index file create नहीं करता। Local work items और service management तब तक inactive रहते हैं जब तक repository bounded lifecycle rules opt into न करे।

`agent_loop.phases` standard agent work loop है: `orient`, `plan`, `act`, `verify`, `report`, और `handoff`। यह machine-checkable contract है, decorative prose नहीं।

`verification` बताता है कि validation commands `.mustflow/config/commands.toml` से आती हैं। `allow_inferred_commands = false` का अर्थ है कि agents `package.json`, `Makefile`, या naming conventions से validation commands infer नहीं कर सकते।

`handoff.enabled = false` का अर्थ है कि current template local work-item writing inactive रखता है। जो work सुरक्षित रूप से पूरा नहीं हो सकता, उसे final report में hand off करना चाहिए, जब तक repository bounded work-item lifecycle enable न करे।

`mf check` booleans, allowed capability states, standard loop, और validation command path validate करता है।

## Harness fields

```toml
[harness]
mode = "single_session"
fresh_context_preferred = true

[harness.phases]
enabled = [
  "plan",
  "work",
  "verify",
  "judge",
  "handoff",
]
```

`harness` agent harnesses के लिए default execution shape declare करता है। `mode = "single_session"` conservative default है; future या repository-specific harness modes lifecycle, approval, isolation, और retention rules explicit होने पर long-running coordination opt into कर सकते हैं।

`harness.phases.enabled` वे phases define करता है जिन्हें long-running harness को अलग रखना चाहिए। ये phases हैं, default folders या default subagents नहीं।

## Refresh fields

```toml
[refresh]
enabled = true
mode = "checkpoint"
required_at = [
  "session_start",
  "task_start",
  "before_first_edit",
  "before_command_run",
  "after_instruction_file_change",
  "root_change",
  "after_compaction",
  "before_final_report",
]
turn_threshold = 8
tool_call_threshold = 16
output_bytes_threshold = 100000
state_store = "cache"

[refresh.levels.light]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.command]
read = [
  "AGENTS.md",
  ".mustflow/config/commands.toml",
]

[refresh.levels.edit]
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/docs/agent-workflow.md",
]

[refresh.levels.report]
read = [
  "AGENTS.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/preferences.toml",
]

[refresh.levels.skill]
read = [
  "AGENTS.md",
  ".mustflow/skills/INDEX.md",
]

[refresh.levels.full]
read = [
  "AGENTS.md",
  ".mustflow/docs/agent-workflow.md",
  ".mustflow/config/mustflow.toml",
  ".mustflow/config/commands.toml",
  ".mustflow/config/preferences.toml",
  ".mustflow/skills/INDEX.md",
]
```

`refresh` declare करता है कि session लंबी हो जाने, root बदलने, command execution होने वाली होने, या instruction files बदलने पर agent को mustflow instructions कब फिर से पढ़नी चाहिए।

`before_command_run` का अर्थ है कि current task और current command intent के लिए fresh command-level refresh उपलब्ध होना चाहिए। अगर command contract नहीं बदला और thresholds अभी current हैं, तो हर repeated command से पहले सभी files दोबारा पढ़ना जरूरी नहीं है।

`state_store = "cache"` का अर्थ है कि turn counts और session activity project files में नहीं रहतीं। Host application उन्हें local cache में track कर सकता है, लेकिन mustflow documents stable और commit-safe रहने चाहिए।

`refresh.levels` हर refresh level को उन files से map करता है जिन्हें फिर से पढ़ना चाहिए। default levels `light`, `command`, `edit`, `report`, `skill`, और `full` हैं।

`mf check` refresh mode, checkpoint names, thresholds, state store, और refresh file paths validate करता है।

## Context compaction fields

```toml
[compaction]
enabled = false
strategy = "tiered"
state_store = "cache"

[compaction.rules]
require_source_refs = true
summaries_are_derived = true
current_files_override_summaries = true
never_store_secrets = true
scrub_absolute_user_paths = true
do_not_store_hidden_chain_of_thought = true
```

Default template `compaction` को disabled रखता है और केवल host safety rules declare करता है। यह recent, mid, long, या raw-retention settings को default रूप से install नहीं करता, और इसका अर्थ यह नहीं कि mustflow full chat transcripts, hidden reasoning, full terminal output, या raw command logs store करता है।

`state_store = "cache"` का अर्थ है कि compaction state local cache या host-managed state में रहनी चाहिए, versioned project documents में नहीं। Shared project knowledge को केवल source-linked decisions, investigations, या handoff summaries के रूप में promote करना चाहिए।

`compaction.rules` summaries को current user instructions, current code और config, command contracts, और run receipts से कम authority पर रखता है।

Compaction summaries और handoff summaries की language यहां control नहीं होती। यह `.mustflow/config/preferences.toml` के `[language.memory]` में रहती है।

## Test relevance fields

```toml
[testing]
policy = "behavior_contract"
prefer_update_existing_tests = true
require_existing_test_search = true
require_test_change_report = true
forbid_validation_weakening = true
allow_test_deletion_when = [
  "behavior_removed",
  "public_contract_changed",
  "duplicate_coverage",
  "implementation_detail_removed",
  "obsolete_snapshot",
]
forbid_test_deletion_when = [
  "only_to_make_tests_pass",
  "without_behavior_rationale",
  "without_reporting",
  "without_running_relevant_validation",
]
stale_test_action = "update_remove_or_report"
```

`testing.policy = "behavior_contract"` का अर्थ है कि tests currently intended behavior validate करते हैं। इसका अर्थ यह नहीं कि tests हमेशा बढ़ते रहें या removed features preserve करें।

`require_existing_test_search` agents को new tests जोड़ने से पहले existing tests inspect करने को कहता है।
`allow_test_deletion_when` और `forbid_test_deletion_when` stale tests हटाने और validation कमजोर करने के बीच की boundary define करते हैं।

`stale_test_action = "update_remove_or_report"` का अर्थ है कि stale candidates को update, remove, या report करना चाहिए, automatically delete नहीं।

## Budget, approval, और isolation fields

```toml
[budget]
enabled = true
max_iterations = 6
max_wall_clock_minutes = 60
max_command_runs = 20
max_total_output_mb = 8
max_failures_per_intent = 2
on_limit = "stop_and_report"

[approval]
required_for = [
  "git_commit",
  "git_push",
  "dependency_upgrade",
  "database_migration",
  "destructive_command",
  "secret_access",
  "release",
  "cross_repository_change",
]
on_required = "stop_and_request_approval"

[isolation]
preferred = "git_worktree"
required_for_long_running = true
allow_dirty_main_worktree = false
```

`budget` iterations, elapsed time, command runs, output volume, और repeated failures सीमित करके unbounded loops रोकता है। Limit पहुंचने पर agents रुकते हैं और report करते हैं। जो projects handoff workflow स्पष्ट रूप से enable करते हैं, वे `stop_and_handoff` चुन सकते हैं।

`approval` उन actions को list करता है जिन्हें execution से पहले explicit human approval चाहिए। यह अपने आप permission नहीं देता।

`isolation` long-running work के लिए preferred boundary declare करता है। mustflow खुद worktree या sandbox create नहीं करता; यह host tools को पालन करने के लिए policy देता है।

`mf check` इन fields को contracts के रूप में validate करता है, लेकिन long-running harness नहीं चलाता।

## Retention fields

```toml
[retention]
enabled = true

[retention.raw_events]
store = "none"
max_file_mb = 25
max_total_mb = 250
max_age_days = 14
on_limit = "report"

[retention.run_receipts]
store = "repo_local_ignored"
max_file_kb = 128
max_items = 50
max_total_mb = 10
keep_stdout_tail_bytes = 65536
keep_stderr_tail_bytes = 65536

[retention.knowledge]
enabled = false
store = "repo_local_ignored"
max_file_kb = 128
max_total_mb = 10
require_source_refs = true
require_review_status = true

[retention.context]
max_file_kb = 8

[retention.handoffs]
store = "repo_local_ignored"
max_file_kb = 64
max_total_mb = 5
require_source_refs = true

[retention.repo_map]
max_file_kb = 128
fail_if_larger = true
```

`retention` mustflow को project के भीतर full chat transcripts, full terminal output, या raw JSONL event streams जमा करने से रोकता है।

`repo_local_ignored` का अर्थ है कि generated state repository workspace के अंदर, लेकिन `.mustflow/state/**` या `.mustflow/cache/**` जैसे ignored local paths में रहती है। ये files delete या rebuild की जा सकती हैं और current files, current user instructions, तथा command contracts से कम authority रखती हैं।

`raw_events.store = "none"` का अर्थ है कि default template raw event logs store नहीं करता। यदि cache storage बाद में जोड़ा जाए, तो वह commit हो सकने वाले project documents से अलग रहना चाहिए।

`run_receipts` retained `.mustflow/state/runs/run-*` और `.mustflow/state/runs/verify-*` directories को limit करता है; `latest.json` सिर्फ volatile latest pointer रहता है।
Run receipt में छोटे structured results और output tails होने चाहिए, full log नहीं। `latest.index.json` retained directories से rebuild होता है और generated state ही रहता है।

`knowledge.enabled = false` का अर्थ है कि default template knowledge base create नहीं करता।
बाद में enable होने पर knowledge files में decisions, investigations, और handoff summaries होने चाहिए, raw logs नहीं।

`context` `.mustflow/context/*.md` files को limit करता है। ये files documentation archive बनने के बजाय short और task-oriented रहनी चाहिए। `mf check --strict` उन्हें local absolute paths, secret-like key/value text, और `DESIGN.md` से duplicated design-token definitions के लिए भी check करता है।

`handoffs` optional compact handoff records को limit करता है। Handoffs raw session logs नहीं हैं; उन्हें run receipts जैसे sources reference करने चाहिए और next safe step summarize करना चाहिए।

`repo_map` generated `REPO_MAP.md` को limit करता है। Map में navigation anchors होने चाहिए, full file listing या recent-change log नहीं।

`mf check --strict` check करता है कि यह policy मौजूद है, generated files अपनी limits के भीतर रहती हैं, और raw JSONL files `.mustflow/**` के नीचे नहीं आतीं।

यह `.mustflow/` के नीचे रहता है ताकि ordinary project configuration से mix न हो।
