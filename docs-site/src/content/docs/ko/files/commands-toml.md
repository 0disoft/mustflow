---
title: .mustflow/config/commands.toml
description: 테스트, 규칙 검사, 빌드, 문서 검증 명령을 의도별로 선언하는 파일입니다.
---

`.mustflow/config/commands.toml`은 에이전트가 명령어를 추측하지 않도록 만드는 명령 의도 계약 파일입니다.

## 어디에 쓰이나

- `AGENTS.md`는 이 파일을 기준으로 명령 추측 금지 규칙을 적용합니다.
- `agent-workflow.md`는 명령 실행 정책을 설명할 때 이 파일을 기준 자료로 둡니다.
- 각 `SKILL.md`는 실제 명령 대신 `test`, `lint`, `build` 같은 명령 의도 이름만 참조합니다.
- `mf check` 같은 검증 도구는 이 파일을 읽어 실행 가능 여부와 누락된 필드를 확인할 수 있습니다.

## 기본 형태

```toml
schema_version = "1"

[defaults]
missing_behavior = "do_not_guess"
allow_inferred_commands = false
default_cwd = "."
default_timeout_seconds = 600
stdin = "closed"
require_lifecycle = true
require_timeout_for_oneshot = true
deny_unmanaged_long_running = true
max_output_bytes = 1048576
on_timeout = "terminate_process_tree"
kill_after_seconds = 5

[intents.test]
status = "unknown"
description = "테스트를 실행합니다."
reason = "이 저장소의 테스트 명령이 아직 선언되지 않았습니다."
agent_action = "do_not_guess_report_missing"
required_after = ["code_change", "behavior_change"]
```

## 기본 필드

- `schema_version`: 이 파일 형식의 판 번호입니다.
- `defaults.missing_behavior`: 명령 의도가 없을 때 에이전트가 어떻게 행동해야 하는지 정합니다.
- `defaults.allow_inferred_commands`: 에이전트가 명령을 추측해도 되는지 정합니다. 기본값은 `false`입니다.
- `defaults.default_cwd`: 의도별 작업 디렉터리가 없을 때 사용할 기본 작업 디렉터리입니다.
- `defaults.default_timeout_seconds`: 새 명령 의도 선언을 만들거나 검증할 때 참고하는 기본값입니다. `mf run`은 실행 가능한 모든 `oneshot` 의도에 명시적인 `timeout_seconds` 선언을 요구합니다.
- `defaults.stdin`: 새 명령 의도 선언을 만들거나 검증할 때 참고하는 기본값입니다. 에이전트가 실행할 수 있는 의도는 여전히 `stdin = "closed"`를 명시해야 합니다.
- `defaults.require_lifecycle`: 실행 의도에 명령 생명주기를 요구할지 정합니다.
- `defaults.require_timeout_for_oneshot`: 단발성 명령에 제한 시간을 요구할지 정합니다.
- `defaults.deny_unmanaged_long_running`: 관리되지 않는 장기 실행 명령을 차단할지 정합니다.
- `defaults.max_output_bytes`: 실행기가 받을 수 있는 출력의 기본 상한입니다.
- `defaults.on_timeout`: 제한 시간을 넘겼을 때의 처리 방식입니다.
- `defaults.kill_after_seconds`: 프로세스 정리 단계에서 사용할 수 있는 추가 대기 시간입니다.

## 의도 상태

- `configured`: 실행 가능한 명령이 선언되어 있습니다.
- `unknown`: 아직 명령 계약이 없습니다.
- `not_applicable`: 이 저장소에는 해당 검증이 필요하지 않습니다.
- `manual_only`: 사람이 직접 판단해서 실행해야 합니다. 새 설정에서 사람이 실행해야 하는 명령은 이 값을 `status`로 사용합니다.
- `disabled`: 명령은 알려져 있지만 현재 실행하면 안 됩니다.

에이전트는 `status = "configured"`인 의도만 실행할 수 있지만, 상태만으로는 충분하지 않습니다. `mf run`은 `oneshot` 생명주기, `run_policy = "agent_allowed"`, 닫힌 표준 입력, 명시적인 제한 시간, 선언된 명령, 현재 루트 안의 작업 디렉터리도 요구합니다.

## 의도 필드

- `description`: 명령 의도의 목적입니다.
- `reason`: 실행할 수 없거나 아직 선언되지 않은 이유입니다.
- `agent_action`: 실행할 수 없을 때 에이전트가 취할 행동입니다.
- `required_after`: 어떤 변경 뒤에 이 의도를 확인해야 하는지 나타냅니다.
- `kind`: mustflow 내장 의도인지, 저장소 명령인지 같은 분류입니다.
- `lifecycle`: 명령이 단발성 명령인지, 서버나 감시 모드처럼 계속 떠 있는 명령인지 나타냅니다.
- `run_policy`: 에이전트가 실행할 수 있는지, 명시 요청이 필요한지 나타냅니다. 새 설정은 `agent_allowed` 또는 `requires_explicit_user_request`를 사용해야 하며, `run_policy = "manual_only"`는 기존 설정 호환용으로만 허용됩니다.
- `argv`: 셸 해석 없이 실행할 명령과 인자 배열입니다.
- `mode`: `argv`가 아니라 셸 문법을 써야 할 때 `shell`로 둡니다.
- `cmd`: `mode = "shell"`일 때 실행할 셸 명령 문자열입니다.
- `cwd`: 명령을 실행할 작업 디렉터리입니다.
- `timeout_seconds`: 명령 제한 시간입니다.
- `stdin`: 표준 입력 처리 방식입니다. 자동 실행 가능한 의도는 `closed`여야 합니다.
- `success_exit_codes`: 성공으로 볼 종료 코드 목록입니다.
- `writes`: 명령이 수정할 수 있는 경로 목록입니다.
- `network`: 네트워크 사용 여부입니다.
- `destructive`: 파괴적 작업 가능성이 있는지 나타냅니다.

## 실행 가능한 의도

`configured` 의도는 가능하면 `argv` 배열을 사용합니다.

```toml
[intents.test]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
description = "테스트를 실행합니다."
argv = ["pnpm", "test"]
cwd = "."
timeout_seconds = 900
stdin = "closed"
success_exit_codes = [0]
writes = []
network = false
destructive = false
```

복잡한 셸 기능이 필요하면 `mode = "shell"`과 `cmd`를 명시하고, 실행 영향과 쓰기 경로를 함께 적습니다.

`unknown`, `not_applicable`, `manual_only`, `disabled` 상태에서는 대체 명령을 추측하지 않습니다.

## 테스트 관련 의도

기본 템플릿은 전체 테스트, 관련 테스트, 테스트 감사, 커버리지, 스냅샷 갱신을 분리합니다.

```toml
[intents.test_related]
status = "unknown"
reason = "이 저장소의 관련 테스트 명령이 아직 선언되지 않았습니다."
agent_action = "do_not_guess_report_missing"

[intents.test_audit]
status = "unknown"
reason = "이 저장소의 테스트 감사 명령이 아직 선언되지 않았습니다."
agent_action = "do_not_guess_report_missing"

[intents.snapshot_update]
status = "manual_only"
reason = "스냅샷 갱신은 의도하지 않은 출력 변경을 숨길 수 있습니다."
agent_action = "do_not_update_snapshots_without_approval"
```

에이전트는 테스트를 유지보수할 때 이 의도 이름을 사용할 수 있지만, 각 의도는 여전히
`commands.toml`에서 확인해야 합니다. 관련 테스트나 감사 명령이 없으면 보고하고, 대체 명령을
추측하지 않습니다.

## 명령 생명주기

- `oneshot`: 실행 후 종료되어야 하는 명령입니다.
- `server`: 개발 서버처럼 계속 떠 있는 명령입니다.
- `watch`: 파일 변경을 감시하며 종료되지 않는 명령입니다.
- `interactive`: 사용자 입력을 기다리는 명령입니다.
- `browser`: 브라우저나 UI 프로세스를 여는 명령입니다.
- `background`: 백그라운드에 남는 명령입니다.

에이전트가 기본으로 실행할 수 있는 생명주기는 `oneshot`뿐입니다. `server`, `watch`, `interactive`, `browser`, `background`는 `run_policy = "agent_allowed"`로 열면 안 됩니다.

`mf run <intent>`는 `status = "configured"`, `lifecycle = "oneshot"`, `run_policy = "agent_allowed"`, `stdin = "closed"`, 양의 정수 `timeout_seconds`, `argv` 또는 `mode = "shell"`과 `cmd`로 선언된 명령, 현재 mustflow 루트 안의 `cwd`를 모두 만족하는 의도만 실행합니다.
실행 뒤에는 `.mustflow/state/runs/latest.json`에 마지막 실행 기록을 남기고, `--json`을 쓰면 같은 내용을 표준 출력으로 내보냅니다.

## mustflow 내장 의도

`mustflow_doctor`는 현재 mustflow 루트의 설치 상태, 검사 결과, 실행 가능한 명령 의도,
다음 단계를 읽기 전용으로 확인하는 의도입니다.

```toml
[intents.mustflow_doctor]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "doctor", "--json"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = []
```

`repo_map`은 `REPO_MAP.md`를 생성하거나 갱신하는 의도입니다.

```toml
[intents.repo_map]
status = "configured"
kind = "mustflow_builtin"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["mf", "map", "--write"]
cwd = "."
timeout_seconds = 300
stdin = "closed"
writes = ["REPO_MAP.md"]
```

기본 템플릿은 `mf update`도 내장 의도로 열어 둡니다. 그래서 에이전트가 명령 계약을
우회하지 않고 실행 영수증을 남길 수 있습니다. `mustflow_update_dry_run`은
`mf update --dry-run --json`을 실행하며 파일을 쓰지 않습니다.
`mustflow_update_apply`는 계획이 깨끗하고 작업이 템플릿 갱신 적용을 요구할 때만 사용합니다.

루트의 `config/`는 사용자 프로젝트 설정일 수 있으므로 mustflow가 사용하지 않습니다.

## Git 관련 의도

기본 템플릿은 최종 보고와 커밋 메시지 추천에 필요한 읽기 전용 Git 의도를 제공합니다.

```toml
[intents.changes_status]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "status", "--short"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false

[intents.changes_diff_summary]
status = "configured"
lifecycle = "oneshot"
run_policy = "agent_allowed"
argv = ["git", "diff", "--stat"]
cwd = "."
timeout_seconds = 120
stdin = "closed"
writes = []
network = false
destructive = false
```

이 의도들은 Git 상태를 바꾸지 않고 변경 파일과 변경 요약만 확인합니다.

실제 커밋은 기본적으로 수동 의도입니다.

```toml
[intents.git_commit]
status = "manual_only"
reason = "커밋 생성은 명시적인 사용자 승인이 필요합니다."
agent_action = "do_not_commit_report_suggestion_only"
```

에이전트는 커밋 메시지를 제안할 수 있지만, 사용자 요청 없이 스테이징하거나 커밋하거나 푸시하면 안 됩니다.
