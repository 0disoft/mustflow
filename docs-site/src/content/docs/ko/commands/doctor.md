---
title: mf doctor
description: 현재 mustflow 루트를 읽기 전용으로 진단하는 명령입니다.
---

`mf doctor`는 현재 mustflow 루트의 상태를 신속하게 진단하고 요약합니다.
`mf check`, `mf context` 결과 중 에이전트가 바로 판단하는 데 필요한 항목만 뽑아 보여주고, 이어서 안전하게 실행할 다음 단계를 제안합니다.

이 명령은 파일을 수정하지 않는 읽기 전용 진단 도구입니다. 에이전트나 사용자가 본격적으로 수정에 들어가기 전에, 저장소 상태를 빠르게 파악하고 방향을 정할 때 사용합니다.

## 진단 항목

- 현재 mustflow 루트 경로
- `AGENTS.md` 및 `.mustflow/` 폴더의 존재 여부
- `mf check` 기준의 검사 결과
- `manifest.lock.toml` 유효성 상태
- 매니페스트 잠금 파일에 기록된 템플릿 식별자 및 버전 정보
- `commands.toml` 존재 여부 및 실행 가능한 단발성(Oneshot) 명령 의도 제공 여부
- 명령 실행, Git 자동화, 로컬 상태, 차단 행동에 대한 유효 정책
- `mustflow.toml`에 정의된 필수/선택적 읽기 순서 중 누락된 경로
- `REPO_MAP.md` 생성 여부
- `.mustflow/cache/mustflow.sqlite` 로컬 색인 생성 여부
- 가장 최근의 `mf run` 실행 결과 기록 존재 여부
- 주요 진단 체크리스트 및 추천 명령 목록

## 예시

```sh
npx mf doctor
```

출력 예시는 다음과 같습니다.

```text
mustflow doctor
mustflow root: /path/to/project
Installed: yes
Strict: no
Check: passed
Issues: 0
Command contract: present
Runnable intents: 3

Health:
- [ok] Install: installed
- [ok] Validation: 0 issues
- [ok] Command contract: present, 3 runnable intents
- [ok] Read order: all required files present
- [info] REPO_MAP.md: not generated (run: mf map --write)
- [info] Local index: not generated (run: mf index)
- [info] Latest run: no run receipt yet (run: mf run <intent>)

Suggested commands:
- mf help workflow
- mf help commands
- mf context --json
- mf check --strict
- mf map --write
- mf index
- mf run <intent>

No files were written.
```

## JSON 필드

```sh
npx mf doctor --json
```

기계가 읽기 위한 출력 형식은 다음 필드들을 포함합니다.

- `schema_version` (`number`): 출력 형식의 스키마 버전입니다.
- `command` (`string`): 항상 `doctor` 값입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트 경로입니다.
- `installed` (`boolean`): mustflow 설치 여부입니다.
- `strict` (`boolean`): `--strict` 검사 실행 여부입니다.
- `ok` (`boolean`): 설치 상태 및 검증 통과 여부입니다.
- `check` (`object`): `mf check` 기준의 상세 검증 결과입니다.
- `context` (`object`): 에이전트가 작업을 시작할 때 필요한 핵심 맥락 정보입니다.
- `effective_policy` (`object`): 명령 실행, Git 자동화, 상태 권위에 대해 실제로 적용되는 저장소 정책입니다.
- `state_policy` (`object`): 로컬 캐시와 로컬 상태 저장 정책입니다.
- `blocked_actions` (`string[]`): 저장소 계약에서 차단되는 행동 종류입니다.
- `diagnostics` (`object[]`): 항목별 진단 결과(설치, 검증, 명령 계약, 읽기 순서 등) 목록입니다.
- `next_steps` (`string[]`): 에이전트가 추측 없이 실행 가능한 추천 명령 목록입니다.

중첩 객체의 세부 필드는 다음과 같습니다.

- `check.ok` (`boolean`): 검증 통과 여부입니다.
- `check.issue_count` (`number`): 발견된 검증 이슈 수입니다.
- `check.issues` (`string[]`): 상세 이슈 메시지 목록입니다.
- `context.manifest_lock` (`string`): 잠금 파일 상태 (`present`, `missing`, `invalid`).
- `context.template` (`object | null`): 사용된 템플릿의 식별자 및 버전 정보입니다.
- `context.command_contract_exists` (`boolean`): `commands.toml` 파일 존재 여부입니다.
- `context.runnable_intents` (`string[]`): 실행 가능한 단발성 명령 의도 이름 목록입니다.
- `context.missing_read_order` (`string[]`): 필수 읽기 순서 중 누락된 파일 목록입니다.
- `context.missing_optional_read_order` (`string[]`): 선택적 읽기 순서 중 누락된 파일 목록입니다.
- `context.latest_run_exists` (`boolean`): 마지막 실행 결과 기록의 존재 여부입니다.
- `effective_policy.project_commands_require_mf_run` (`boolean`): 프로젝트 검증 명령에 `mf run`을 요구하는지 여부입니다.
- `effective_policy.allow_inferred_commands` (`boolean`): `commands.toml` 밖의 명령 추측을 허용하는지 여부입니다.
- `effective_policy.auto_stage`, `effective_policy.auto_commit`, `effective_policy.auto_push` (`boolean`): Git 자동화 선호값입니다.
- `state_policy.cache_path` (`string`): 로컬 캐시 경로입니다.
- `state_policy.state_path` (`string`): 로컬 상태 경로입니다.
- `state_policy.versioned` (`boolean`): mustflow 로컬 상태를 버전 관리 대상으로 볼지 여부입니다.
- `state_policy.safe_to_delete` (`boolean`): 로컬 캐시와 상태를 다시 만들 수 있는지 여부입니다.
- `state_policy.stores_raw_conversation`, `state_policy.stores_full_terminal_output`, `state_policy.stores_hidden_chain_of_thought` (`boolean`): 원본 대화, 전체 터미널 출력, 숨은 추론 저장 여부입니다.
- `diagnostics[].id` (`string`): 진단 항목 식별자입니다.
- `diagnostics[].status` (`string`): 진단 상태 (`ok`, `warn`, `fail`, `info`).
- `diagnostics[].summary` (`string`): 사용자 가독성을 위한 요약 상태 메시지입니다.
- `diagnostics[].action` (`string | null`): 해당 항목을 해결하거나 다음 단계를 위해 추천되는 명령입니다.

## 엄격 모드

```sh
npx mf doctor --strict --json
```

엄격 모드는 `mf check --strict`와 같은 수준의 추가 검증을 수행합니다.
mustflow 설정, 스킬 정의, 명령 계약, 보존 정책 등을 바꾼 뒤 저장소 안정성을 확인할 때 사용하세요.

## 도움말 및 종료 코드

- `0`: 진단이 완료되었고 저장소 상태가 정상이며 이슈가 없습니다.
- `1`: 설치가 되어 있지 않거나, 검증 이슈가 발견되었거나, 유효하지 않은 옵션이 제공되었습니다.

에이전트나 자동화 도구는 텍스트 요약을 파싱하기보다 `--json` 출력의 `ok`, `issues`, `diagnostics`, `next_steps` 필드를 활용하세요.
