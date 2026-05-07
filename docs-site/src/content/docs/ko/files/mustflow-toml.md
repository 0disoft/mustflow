---
title: .mustflow/config/mustflow.toml
description: 에이전트가 읽을 기준 문서와 보호 경로를 선언하는 파일입니다.
---

`.mustflow/config/mustflow.toml`은 저장소 안에서 에이전트가 어떤 문서를 먼저 읽고, 어떤 경로를 조심해야 하는지 선언합니다.

`mf check`는 이 파일을 파싱하는 데서 끝나지 않고, `[map]`과 `[workspace]`의 값이 안전하게 해석 가능한지도 확인합니다.

## 어디에 쓰이나

- `AGENTS.md`의 읽기 순서를 기계가 확인할 수 있는 설정으로 고정합니다.
- 에이전트가 mustflow 소유 문서와 사용자 프로젝트 문서를 구분하게 합니다.
- 보호 경로와 주의 경로를 선언해 잘못된 파일 수정을 줄입니다.
- 최종 작업 보고에 어떤 항목을 포함할지 정합니다.

## 주요 영역

- `authority`: 기준 문서의 위치입니다.
- `read_order`: 에이전트가 처음 읽을 파일 순서입니다.
- `optional_read_order`: 있으면 읽고, 없으면 건너뛰는 파일 순서입니다.
- `authority.workflow_preferences`: 저장소별 기본 선호값 파일의 위치입니다.
- `map`: `REPO_MAP.md` 생성 방식과 포함할 앵커 파일 기준입니다.
- `workspace`: 작업대 루트에서 하위 독립 저장소를 제한적으로 찾기 위한 기준입니다.
- `context`: 작업에 필요할 때만 읽는 프로젝트 맥락 계층입니다.
- `capabilities`: 이 저장소가 제공하는 에이전트 작업 기능 표면입니다.
- `agent_loop`: 에이전트가 작업할 때 따를 표준 순환입니다.
- `harness`: 에이전트 하네스가 읽을 저장소 안쪽 계약 경계입니다.
- `refresh`: 긴 세션에서 mustflow 지침을 다시 읽어야 하는 지점입니다.
- `compaction`: 원문을 기본 저장하지 않고 최신 파생 맥락, 중간 요약, 장기 요약을 나누는 정책입니다.
- `verification`: 검증 명령을 어디서 읽고, 어떤 실행 추측을 금지할지 정합니다.
- `testing`: 테스트를 현재 동작 계약에 맞게 유지하기 위한 정책입니다.
- `handoff`: 안전하게 끝내지 못한 작업을 어떻게 넘길지 정합니다.
- `budget`: 장기 작업이나 반복 실행의 한계입니다.
- `approval`: 진행 전 사람의 승인이 필요한 행동입니다.
- `isolation`: 장기 작업에 권장되는 작업트리나 샌드박스 경계입니다.
- `retention`: 실행 기록, 저장소 지도, 향후 지식 문서가 무한히 커지지 않게 상한을 정합니다.
- `document_roots`: mustflow 문서 흐름에 속하는 경로입니다.
- `document_roots.generated`: 생성해서 다시 만들 수 있는 문서와 로컬 상태 경로입니다.
- `edit_policy.protected`: 기본적으로 수정하면 안 되는 경로입니다.
- `edit_policy.extra_care`: 수정 전 더 신중해야 하는 경로입니다.
- `reporting`: 작업 결과 보고에 포함할 항목입니다.

## 읽기 순서 필드

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

`read_order`는 항상 읽어야 하는 기준 문서 흐름입니다. `optional_read_order`는 있으면 읽고, 없으면 건너뛰는 문서입니다.

이 파일은 에이전트의 탐색 범위를 줄이고, 실수로 생성물이나 비밀정보를 수정하는 일을 막기 위한 안전장치입니다.

`REPO_MAP.md`는 `optional_read_order`와 `document_roots.generated`에 속합니다. 에이전트는 이 파일을 전체 파일 목록으로 보지 말고, 주요 앵커 파일을 모은 탐색 지도로만 사용합니다. 넓은 저장소 탐색이 필요할 때만 읽으며, 필요하면 생성 명령으로 갱신해야 합니다.

`.mustflow/context/INDEX.md`도 `optional_read_order`에 속합니다. 프로젝트, 제품, 도메인, UI, 백엔드, 데이터, 보안, 운영 맥락이 작업과 관련 있을 때만 읽습니다.

`.mustflow/cache/**`와 `.mustflow/state/**`도 생성 경로입니다. 캐시는 `mf index`가 만드는 SQLite 색인처럼 다시 만들 수 있는 보조 파일을 담고, 상태 경로는 `mf run` 실행 기록처럼 사용 중 만들어지는 로컬 상태를 담습니다. 둘 다 처음 읽어야 하는 기준 문서가 아닙니다.

## 지도 생성 필드

```toml
[map]
output = "REPO_MAP.md"
mode = "anchors_only"
privacy = "minimal"
include_nested = false
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

`map.output`은 생성할 파일 이름입니다. 기본값은 `REPO_MAP.md`입니다.

`map.mode = "anchors_only"`는 일반 소스 파일 전체가 아니라 탐색에 도움이 되는 앵커 파일만 담는다는 뜻입니다.

`map.privacy = "minimal"`은 원격 주소, 브랜치명, 최근 변경 상태, 명령어 목록, 자동 요약처럼 작업 맥락이나 비밀정보를 노출할 수 있는 값을 기본 출력하지 않는다는 뜻입니다.

`map.include_nested = false`는 작업대 안의 하위 독립 저장소를 기본으로 색인하지 않는다는 뜻입니다. 작업대 지원을 켤 때는 `workspace.enabled`와 함께 명시적으로 바꿔야 합니다.

`mf check`는 `output`과 `anchor_files`가 현재 루트 안쪽을 가리키는 상대 경로인지 확인합니다. `mode`는 현재 `anchors_only`, `privacy`는 현재 `minimal`만 허용합니다.

`preferences.toml`은 기본 앵커에 포함됩니다. 에이전트가 응답 언어, 문서화 언어, 커밋 메시지, 로그, 서식 같은 저장소별 기본 선호값을 빠르게 찾기 위함입니다.

`DESIGN.md`는 선택 외부 앵커입니다. mustflow가 만들지는 않지만, 프로젝트에 이미 있으면 `mf map`이 UI, 시각 디자인, 디자인 토큰, 레이아웃, 접근성 작업을 위한 참고 지점으로 표시할 수 있습니다.

## 프로젝트 맥락 필드

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

`context.enabled = true`는 `.mustflow/context/` 아래에 에이전트용 프로젝트 맥락을 둘 수 있다는 뜻입니다.

`context.index`는 에이전트가 작업에 맞는 맥락 파일을 고르는 라우터입니다.
`context.default_files`는 기본 템플릿이 설치하는 맥락 파일입니다.

`read_policy = "task_relevant_only"`는 모든 맥락 파일을 기본으로 전부 읽지 말라는 뜻입니다.
`authority = "contextual"`은 맥락 파일이 방향 파악을 돕지만, 사용자 직접 지시, 현재 코드, 테스트, 명령 계약, 설정된 정책보다 낮은 권위를 가진다는 뜻입니다.

`external_anchors`는 mustflow 소유 파일이 아니지만 참고 맥락이 될 수 있는 루트 파일입니다.
`README.md`는 사람용 개요이고, `DESIGN.md`는 프로젝트에 이미 있을 때만 쓰는 선택 시각 디자인 앵커입니다.

## 작업대 필드

```toml
[workspace]
enabled = false
roots = []
max_depth = 4
max_repositories = 50
follow_symlinks = false
stop_at_repository_root = true
```

`workspace.enabled = false`는 현재 루트를 일반 mustflow 루트로 다룬다는 뜻입니다.

작업대 루트로 사용할 때는 `roots = ["projects", "repos"]`처럼 하위 저장소가 모이는 경로를 명시합니다. 설정되지 않은 `projects/`, `repos/`를 자동으로 훑지 않습니다.

`max_depth`와 `max_repositories`는 우발적인 대규모 탐색을 막기 위한 한계입니다. `follow_symlinks = false`는 작업대 바깥이나 다른 드라이브로 탐색이 새는 일을 막기 위한 기본 안전장치입니다.

`stop_at_repository_root = true`는 하위 독립 저장소를 발견하면 그 내부를 상위 지도에서 계속 재귀 탐색하지 않는다는 뜻입니다. 상위 `REPO_MAP.md`는 하위 저장소를 설명하지 않고, 하위 저장소로 들어가는 진입점만 표시해야 합니다.

`mf check`는 `roots`가 현재 루트 안쪽의 상대 경로 배열인지, `max_depth`와 `max_repositories`가 양의 정수인지, 작업대 관련 스위치가 참/거짓 값인지 확인합니다.

## 에이전트 제어면 필드

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

`capabilities`는 mustflow가 이 저장소에서 무엇을 제공하는지 선언합니다. `workflow`, `command_contract`, `skills`는 기본 기능이고, `repo_map`, `preferences`, `local_index`, `work_items`, `services`는 상태값으로 켜고 끄는 확장 기능입니다. 기본 템플릿은 로컬 색인을 선택형 생성물로 제공하지만, `mf init` 시점에 색인 파일을 만들지는 않습니다. 작업 항목과 서비스 관리는 아직 설치하지 않습니다.

`agent_loop.phases`는 에이전트의 표준 작업 순환입니다. 각 단계는 `orient`, `plan`, `act`, `verify`, `report`, `handoff` 순서를 따릅니다. 이 값은 장식용 설명이 아니라 도구가 검사할 수 있는 계약입니다.

`verification`은 검증의 기준 자료가 `.mustflow/config/commands.toml`임을 밝힙니다. `allow_inferred_commands = false`는 에이전트가 `package.json`, `Makefile`, 관습 이름을 보고 검증 명령을 추측하지 말라는 뜻입니다.

`handoff.enabled = false`는 기본 템플릿이 로컬 작업 항목 파일을 만들지 않는다는 뜻입니다. 안전하게 끝낼 수 없는 작업은 최종 보고로 넘기며, 선택형 작업 항목 기능은 나중에 별도 기능으로 켤 수 있습니다.

`mf check`는 이 영역의 참/거짓 값, 허용된 상태값, 표준 작업 순환, 검증 명령 경로를 확인합니다.

## 하네스 필드

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

`harness`는 mustflow가 자율 실행 환경이 아니라 저장소 안쪽 계약을 제공한다는 점을
나타냅니다. `mode = "single_session"`은 보수적인 기본값입니다. 나중에 선택형 장기 실행
하네스는 같은 계약을 `long_running_optional`로 읽을 수 있습니다.

`harness.phases.enabled`는 장기 실행 하네스가 분리해야 할 작업 단계를 정합니다. 이 값은
기본 폴더나 기본 하위 에이전트를 만들라는 뜻이 아닙니다.

## 지침 새로고침 필드

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

`refresh`는 세션이 길어졌거나, 작업 루트가 바뀌었거나, 명령 실행 직전이거나, 지침 파일이 바뀌었을 때 에이전트가 mustflow 지침을 다시 읽어야 함을 선언합니다.

`before_command_run`은 현재 작업과 현재 명령 의도에 대해 신선한 명령 수준 새로고침이 보장되어야 한다는 뜻입니다. 명령 계약이 바뀌지 않았고 기준값도 넘지 않았다면, 같은 명령을 반복할 때마다 모든 파일을 다시 읽으라는 뜻은 아닙니다.

`state_store = "cache"`는 대화 횟수나 세션 활동 상태를 프로젝트 파일에 저장하지 않는다는 뜻입니다. 호스트 애플리케이션이 필요하다면 로컬 캐시에 기록할 수 있지만, mustflow 문서는 안정적이고 커밋해도 안전한 상태로 남아야 합니다.

`refresh.levels`는 새로고침 수준별로 다시 읽을 파일을 정합니다. 기본 수준은 `light`, `command`, `edit`, `report`, `skill`, `full`입니다.

`mf check`는 새로고침 방식, 지점 이름, 임계값, 상태 저장 위치, 다시 읽을 파일 경로를 확인합니다.

## 맥락 압축 필드

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

기본 템플릿은 `compaction`을 꺼 둔 상태에서 호스트가 지켜야 할 안전 규칙만 선언합니다.
최신/중간/장기 요약이나 원본 보존 설정을 기본으로 설치하지 않으며, mustflow가 전체 대화
전문, 숨은 추론 과정, 전체 터미널 출력, 원본 명령 로그를 저장한다는 뜻도 아닙니다.

`state_store = "cache"`는 압축 상태를 프로젝트 문서가 아니라 로컬 캐시나 호스트 상태로
다뤄야 한다는 뜻입니다. 팀과 공유할 지식은 원문 로그가 아니라 출처를 가진 결정, 조사,
인계 요약으로만 승격해야 합니다.

`compaction.rules`는 요약 기억의 권위를 제한합니다. 압축 요약은 현재 사용자 지시,
현재 코드와 설정, 명령 계약, 실행 기록보다 낮은 보조 자료입니다.

압축 요약과 인계 요약을 어느 언어로 쓸지는 이 파일이 아니라
`.mustflow/config/preferences.toml`의 `[language.memory]`에서 정합니다.

## 테스트 관련성 필드

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

`testing.policy = "behavior_contract"`는 테스트를 현재 의도된 동작의 계약으로 다룬다는 뜻입니다.
테스트를 무조건 늘리거나 영구 보존하는 정책이 아닙니다.

`require_existing_test_search`는 새 테스트를 만들기 전에 기존 테스트를 먼저 찾게 합니다.
`allow_test_deletion_when`과 `forbid_test_deletion_when`은 낡은 테스트 제거와 검증 약화 사이의
경계를 나눕니다.

`stale_test_action = "update_remove_or_report"`는 낡은 테스트 후보를 발견했을 때 바로 삭제로
단정하지 않고, 수정·삭제·보고 중 안전한 처리를 선택하라는 뜻입니다.

## 예산, 승인, 격리 필드

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
  "dependency_install",
  "dependency_upgrade",
  "network_access",
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

`budget`은 반복 횟수, 경과 시간, 명령 실행 횟수, 출력량, 반복 실패 수를 제한해 무한 반복을
막습니다. 한계에 도달하면 에이전트는 멈추고 보고해야 합니다. 인계 흐름을 명시적으로 켠
프로젝트만 `stop_and_handoff`를 선택할 수 있습니다.

`approval`은 실행 전에 사람의 명시 승인이 필요한 행동을 나열합니다. 이 설정 자체가 실행
권한을 주는 것은 아닙니다.

`isolation`은 장기 작업에 권장되는 경계를 선언합니다. mustflow가 직접 작업트리나
샌드박스를 만들지는 않으며, 호스트 도구가 따를 정책을 제공합니다.

`mf check`는 이 필드들을 계약으로 검증하지만, 장기 실행 하네스를 실행하지는 않습니다.

## 보존 정책 필드

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
max_items = 1
max_total_mb = 1
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

`retention`은 mustflow가 전체 대화 원문, 전체 터미널 출력, 원시 JSONL 이벤트 로그를
프로젝트 안에 무한히 쌓지 않도록 막는 정책입니다.

`repo_local_ignored`는 `.mustflow/state/**`나 `.mustflow/cache/**`처럼 저장소 작업 공간 안에 있지만 기본적으로 버전 관리에서 제외되는 로컬 생성 경로에 상태를 둔다는 뜻입니다. 이 파일들은 삭제하거나 다시 만들 수 있으며, 현재 파일, 현재 사용자 지시, 명령 계약보다 낮은 권위의 참고 자료입니다.

`raw_events.store = "none"`은 기본 템플릿이 원시 이벤트 로그를 저장하지 않는다는 뜻입니다.
나중에 캐시 저장을 열더라도 프로젝트에 커밋될 수 있는 문서와 분리해야 합니다.

`run_receipts`는 `mf run`이 쓰는 `.mustflow/state/runs/latest.json`의 상한입니다.
실행 기록은 전체 로그가 아니라 작은 구조화 결과와 표준 출력/오류의 끝부분만 담아야 합니다.

`knowledge.enabled = false`는 기본 템플릿이 지식베이스를 만들지 않는다는 뜻입니다.
나중에 선택 기능으로 켜더라도 지식 문서는 원문 로그가 아니라 결정, 조사, 인계 요약만 담아야 합니다.

`context`는 `.mustflow/context/*.md` 맥락 파일의 크기 상한입니다. 이 파일들은 작업 방향을 잡는 짧은 계약이어야 하며, 긴 문서 보관함이 되면 안 됩니다.
`mf check --strict`는 이 상한과 함께 로컬 절대 경로, 비밀정보처럼 보이는 키/값, `DESIGN.md`와 중복되는 디자인 토큰 정의를 확인합니다.

`handoffs`는 선택형 인계 기록의 상한입니다. 인계 문서는 원시 세션 로그가 아니라 실행
기록 같은 출처를 참조하고, 다음으로 안전하게 할 일을 요약해야 합니다.

`repo_map`은 생성 지도인 `REPO_MAP.md`의 크기 상한입니다. 이 파일은 전체 파일 목록이나 최근 변경 로그가 아니라 탐색 앵커만 담습니다.

`mf check --strict`는 이 보존 정책이 빠졌는지, 생성 파일이 상한을 넘었는지, `.mustflow/**` 아래에 원시 JSONL 파일이 있는지 확인합니다.

이 파일은 mustflow 소유 영역인 `.mustflow/` 안에 있으므로 사용자 프로젝트의 일반 설정 파일과 섞이지 않습니다.
