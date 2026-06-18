---
title: mf context
description: 현재 mustflow 루트의 작업 맥락 정보를 JSON으로 출력하는 명령입니다.
---

`mf context --json`은 에이전트가 작업 시작 전에 참고할 수 있는 구조화된 맥락 정보를 출력합니다.

이 명령은 파일을 수정하지 않습니다. 문서 본문을 대신 읽어주는 도구가 아니라, 에이전트가 먼저 확인해야 할 파일과 명령 의도를 짚어주는 간단한 색인 역할을 합니다.

## 포함 항목

- 현재 mustflow 루트 경로
- mustflow 설치 여부
- `manifest.lock.toml` 상태
- `mustflow.toml`에 정의된 기준 문서 위치
- `mustflow.toml`에 정의된 제공 기능 목록(Capabilities)
- 필수 읽기 순서 및 파일 존재 여부
- 선택 읽기 순서 및 파일 존재 여부
- 맥락 색인(Context Index) 및 프로젝트 맥락 경로
- `commands.toml` 내 명령 의도별 상태 요약
- 에이전트가 실행 가능한 단발성(Oneshot) 명령 의도 목록
- 명령 실행, Git 자동화, 상태 권위에 대한 유효 정책 요약
- 로컬 캐시와 로컬 상태 저장 정책
- 기본 저장소 계약에서 차단되는 행동 목록
- 마지막 `mf run` 실행 결과 기록 요약
- 매니페스트 잠금 파일 기준 이슈 목록

## 실행 결과 기록 요약

`latest_run` 섹션은 `.mustflow/state/runs/latest.json` 파일의 주요 메타데이터를 제공합니다.

보안과 가독성을 위해 표준 출력(stdout), 표준 오류(stderr) 본문은 포함하지 않습니다. 전체 실행 로그가 필요하면 실행 결과 파일을 직접 확인하세요.

## 프롬프트 캐시 프로필

호스트가 전체 맥락 보고서 대신 캐시에 유리한 프롬프트 계층이 필요할 때는 `--json`과 함께 `--cache-profile stable|task|volatile|all`을 사용합니다.

`stable` 프로필은 안정적인 지시문 경로, 파일 존재 여부, 내용 해시, `stable_prefix.cache_key`만 제공합니다. 절대 mustflow 루트 경로, 마지막 실행 기록, 시각 정보, 변경 파일 목록, 명령 출력 일부, 현재 사용자 요청처럼 자주 바뀌는 값은 의도적으로 제외합니다.

`task` 프로필은 맥락 색인, 전체 라우트 메타데이터, 저장소 지도, 선택된 스킬, 관련 소스 파일처럼 작업별로 고르는 출처를 보여줍니다. 또한 로컬 색인 상태도 함께 제공하므로, 호스트는 신선한 작업 메타데이터를 재사용하거나 색인이 없거나 오래되었거나 읽을 수 없을 때 `mf index` 재생성 안내를 표시할 수 있습니다. `volatile` 프로필은 안정 계층 뒤에 붙어야 하는 변동 상태를 보여주며, `all` 프로필은 세 계층을 모두 포함합니다.

`--cache-audit`를 추가하면 `cache_audit` 블록을 포함합니다. 이 감사는 mustflow reference
bundle 형식으로 안정 파일을 측정해 UTF-8 렌더링 바이트, 거친 바이트 기반 토큰 추정, 설정된
예산 상태, 가장 큰 안정 블록을 보고합니다. task 계층의 파일 후보도 선택 가능한 reference
bundle 블록으로 측정해 존재 여부, 내용 해시, 가장 큰 후보 블록을 함께 보여줍니다. 동적 task
출처와 volatile 출처는 호스트가 실제 선택 본문을 제공하기 전까지 runtime-only placeholder로
남습니다. 이 토큰 추정은 provider 청구 데이터가 아니며 OpenAI, Anthropic, Gemini 또는 다른
provider의 실제 캐시 적중을 증명하지 않습니다.

## 예시

```sh
npx mf context --json
npx mf context --json --cache-profile stable
npx mf context --json --cache-audit
```

## JSON 필드

자동화 도구가 읽는 출력은 아래 필드를 사용합니다.

- `schema_version` (`number`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `context`입니다.
- `mustflow_root` (`string`): 명령이 실행된 mustflow 루트 경로입니다.
- `installed` (`boolean`): mustflow 설치 여부입니다.
- `manifest_lock` (`string`): 잠금 파일 상태 (`present`, `missing`, `invalid`).
- `template` (`object | null`): 사용된 템플릿의 식별자 및 버전 정보입니다.
- `authority` (`object`): 기준 문서 경로 정보입니다.
- `capabilities` (`object`): 에이전트가 사용할 수 있는 기능 목록입니다.
- `read_order` (`object[]`): 필수 읽기 파일 목록 및 존재 여부입니다.
- `optional_read_order` (`object[]`): 선택적 읽기 파일 목록 및 존재 여부입니다.
- `command_contract` (`object`): 명령 의도 요약 및 실행 가능한 의도 목록입니다.
- `effective_policy` (`object`): 명령 실행, Git 자동화, 상태 권위에 대해 실제로 적용되는 저장소 정책입니다.
- `state_policy` (`object`): 로컬 캐시와 로컬 상태 저장 정책입니다.
- `blocked_actions` (`string[]`): 저장소 계약에서 차단되는 행동 종류입니다.
- `latest_run` (`object`): 마지막 실행 결과 요약입니다.
- `issues` (`string[]`): 잠금 파일 기준 이슈 목록입니다.

`--cache-profile`을 사용하면 출력은 프롬프트 캐시 프로필 보고서로 바뀝니다.

- `cache_profile` (`string`): 선택한 프로필입니다. `stable`, `task`, `volatile`, `all` 중 하나입니다.
- `prompt_cache` (`object`): `mustflow.toml`에서 읽은 유효 프롬프트 캐시 설정입니다.
- `stable_prefix.cache_key` (`string | null`): 안정 문서 경로와 내용 해시 목록으로 만든 해시입니다.
- `stable_prefix.documents[]` (`object[]`): 안정 문서 경로, 파일 존재 여부, 내용 해시입니다.
- `stable_prefix.volatile_excluded` (`string[]`): 안정 계층 앞에 두면 안 되는 변동 출처입니다.
- `task_context.sources` (`string[]`): 작업별로 선택하는 맥락 출처입니다.
- `task_context.local_index` (`object`): 작업 맥락용 읽기 전용 로컬 색인 상태입니다. `status`는 `fresh`, `missing`, `stale`, `unreadable` 중 하나이며, 색인이 오래되었거나 사용할 수 없으면 `mf index`용 `refresh_hint`를 함께 제공합니다.
- `volatile_suffix.sources` (`string[]`): 안정 계층 뒤에 붙여야 하는 변동 출처입니다.
- `volatile_suffix.include_absolute_root`, `volatile_suffix.include_latest_run` (`false`): 변동 필드가 안정 계층에 섞이지 않도록 고정한 안전 플래그입니다.
- `cache_audit.measurement` (`string`): 측정 방식입니다. 현재는 `reference_bundle`입니다.
- `cache_audit.estimator` (`object`): 거친 byte-to-token 추정기와 주의 문구입니다.
- `cache_audit.layers[]` (`object[]`): 계층별 렌더링 바이트, 추정 토큰, hard 예산 설정, 목표 설정, 상태 필드, 블록, 가장 큰 블록, 이슈입니다.
- `cache_audit.layers[].budget_status` (`string`): `within_budget`, `over_budget`, `unknown` 중 하나입니다.
- `cache_audit.layers[].target_status` (`string`): `within_budget`, `over_budget`, `unknown` 중 하나입니다. 명령 실패 조건이 아니라 선호 목표에 맞는지 보여줍니다.
- `cache_audit.layers[].blocks[]` (`object[]`): 파일 또는 source placeholder 블록이며, 경로 또는 출처, 내용 해시, 렌더링 바이트, 추정 토큰, 예산 비율, 선택 메타데이터, 이슈를 포함합니다.
- `cache_audit.layers[].blocks[].source_kind` (`string | undefined`): `file_reference`, `dynamic_selection`, `runtime_volatile` 같은 placeholder 출처 분류입니다.
- `cache_audit.layers[].blocks[].selection_policy` (`string | undefined`): 항상 렌더링되는지, 작업에서 선택될 때만 읽는지, fallback 메타데이터인지, 런타임에 선택되는지, volatile 런타임 상태인지 나타냅니다.
- `cache_audit.layers[].blocks[].measurement_status` (`string | undefined`): `measured`, `hash_only_deferred`, `dynamic_unmeasured` 중 하나입니다.
- `cache_audit.layers[].blocks[].candidate_exists`, `candidate_content_hash` (`boolean | null`, `string | null`): 작업 출처가 선택형 파일 참조일 때의 파일 존재 여부와 내용 해시입니다. 측정된 task 후보도 실제 작업 묶음에서는 제외될 수 있습니다.

배열 안 객체의 세부 필드는 다음과 같습니다.

- `read_order[].path` (`string`): 참조할 파일의 상대 경로입니다.
- `read_order[].exists` (`boolean`): 파일의 실제 존재 여부입니다.
- `command_contract.intents[].name` (`string`): 명령 의도 식별자입니다.
- `command_contract.intents[].status` (`string`): 명령 의도 구성 상태입니다.
- `command_contract.intents[].lifecycle` (`string | null`): 명령 생명주기(단발성 또는 장기 실행)입니다.
- `command_contract.intents[].run_policy` (`string | null`): 에이전트 실행 정책입니다.
- `command_contract.runnable_intents` (`string[]`): 에이전트가 즉시 실행 가능한 의도 목록입니다.
- `effective_policy.project_commands_require_mf_run` (`boolean`): 프로젝트 검증 명령에 `mf run`을 요구하는지 여부입니다.
- `effective_policy.allow_inferred_commands` (`boolean`): `commands.toml` 밖의 명령 추측을 허용하는지 여부입니다.
- `effective_policy.auto_stage`, `effective_policy.auto_commit`, `effective_policy.auto_push` (`boolean`): Git 자동화 선호값입니다.
- `state_policy.cache_path` (`string`): 로컬 캐시 경로입니다.
- `state_policy.state_path` (`string`): 로컬 상태 경로입니다.
- `state_policy.versioned` (`boolean`): mustflow 로컬 상태를 버전 관리 대상으로 볼지 여부입니다.
- `state_policy.safe_to_delete` (`boolean`): 로컬 캐시와 상태를 다시 만들 수 있는지 여부입니다.
- `state_policy.stores_raw_conversation`, `state_policy.stores_full_terminal_output`, `state_policy.stores_hidden_chain_of_thought` (`boolean`): 원본 대화, 전체 터미널 출력, 숨은 추론 저장 여부입니다.
- `latest_run.path` (`string`): 실행 결과 기록 파일 경로입니다.
- `latest_run.exists` (`boolean`): 실행 결과 기록 파일 존재 여부입니다.
- `latest_run.valid` (`boolean | null`): 실행 기록 파일의 JSON 유효성 여부입니다.
- `latest_run.status` (`string | null`): 마지막 실행의 최종 상태입니다.
- `latest_run.exit_code` (`number | null`): 프로세스 종료 코드입니다.

## Help 및 종료 코드

- `0`: 문맥 정보를 성공적으로 출력했습니다.
- `1`: 유효하지 않은 옵션이 제공되었습니다.
