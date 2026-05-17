---
title: mf run
description: commands.toml에 정의된 단발성 명령 의도를 실행하는 명령입니다.
---

`mf run <intent>`는 `.mustflow/config/commands.toml`에 선언된 명령 의도 중 정상적으로 종료되는 단발성(Oneshot) 명령만을 실행합니다.

## 실행 조건

명령이 실행되기 위해서는 다음 조건을 모두 만족해야 합니다.

- `status = "configured"`
- `lifecycle = "oneshot"`
- `run_policy = "agent_allowed"`
- `stdin = "closed"`
- `timeout_seconds`가 양의 정수(Positive Integer)

위 조건을 하나라도 만족하지 않으면 실행을 거부하고 이유를 출력합니다.

차단되었거나 알 수 없는 명령 의도에 대해 `mf run`은 복사해서 붙여 넣을 수 있는 `status = "manual_only"` 명령 의도 조각을 출력합니다. 이 조각은 `.mustflow/config/commands.toml`에 넣을 제안일 뿐이며, 사람이 검토하고 활성화하기 전까지 실행 권한을 주지 않습니다. `--dry-run`과 `--plan-only` JSON에는 같은 제안이 `suggested_intent_snippet` 필드로 포함됩니다.

## 실행 제한 대상

`mf run`은 다음 생명주기를 가진 의도는 실행하지 않습니다.

- `server` (로컬 서버)
- `watch` (파일 감시)
- `interactive` (대화형 프롬프트)
- `browser` (브라우저/UI 실행)
- `background` (백그라운드 프로세스)

개발 서버 실행, 감시 모드, 사용자 화면 테스트 도구, 백그라운드 프로세스 등은 검증용 단발성 명령으로 보지 않습니다.

## 예시

```sh
npx mf run test
npx mf run lint
npx mf run mustflow_check
npx mf run test --json
```

## JSON 필드 상세

명령을 실행하면 `.mustflow/state/runs/latest.json`에 마지막 실행 기록(Run Record)을 저장합니다.

`--json`을 사용하면 같은 실행 기록을 표준 출력으로도 제공합니다. 자동화 도구나 에이전트는 텍스트 메시지를 파싱하기보다 이 데이터를 쓰는 것이 좋습니다.

자동화 도구용 출력에는 다음 필드가 포함됩니다.

- `schema_version` (`string`): 실행 결과 기록의 스키마 버전입니다.
- `command` (`string`): 항상 `run` 값입니다.
- `intent` (`string`): 실행된 명령 의도 식별자입니다.
- `status` (`string`): 최종 실행 결과(`passed`, `failed`, `timed_out`, `start_failed`)입니다.
- `timed_out` (`boolean`): 설정된 제한 시간을 초과했는지 여부입니다.
- `started_at` (`string`): 실행이 시작된 ISO 8601 시각입니다.
- `finished_at` (`string`): 실행이 종료된 ISO 8601 시각입니다.
- `duration_ms` (`number`): 총 실행 시간(밀리초)입니다.
- `cwd` (`string`): 명령이 실행된 작업 디렉터리 경로입니다.
- `lifecycle` (`string`): 명령 의도에 설정된 생명주기입니다.
- `run_policy` (`string`): 적용된 실행 허용 정책입니다.
- `mode` (`string`): 실행 모드(`exec` 또는 `shell`)입니다.
- `argv` (`string[]`): 실행된 명령 및 인수 목록 (`exec` 모드).
- `cmd` (`string`): 실행된 전체 셸 명령 문자열 (`shell` 모드).
- `timeout_seconds` (`number`): 적용된 제한 시간(초)입니다.
- `max_output_bytes` (`number`): 캡처 및 보존되는 최대 출력 바이트 수입니다.
- `success_exit_codes` (`number[]`): 성공으로 간주되는 종료 코드 목록입니다.
- `exit_code` (`number | null`): 프로세스의 종료 코드입니다.
- `signal` (`string | null`): 프로세스가 신호(Signal)로 종료됐을 때 신호 이름입니다.
- `error` (`string | null`): 실행 중 발생한 오류에 대한 상세 설명입니다.
- `kill_method` (`string | null`): 시간 초과 시 프로세스를 종료하기 위해 사용한 방식입니다.
- `stdout` (`object`): 표준 출력(stdout) 요약 정보입니다.
- `stderr` (`object`): 표준 오류(stderr) 요약 정보입니다.
- `write_drift` (`object`): 선언된 쓰기 경로와 실제 변경 경로를 제한된 형태로 비교한 정보입니다.
- `performance` (`object`): 최신 실행에 대한 안전한 성능 요약입니다.
- `redaction` (`object`): 실행 기록에서 비밀값처럼 보이는 텍스트를 가린 결과 정보입니다.
- `receipt_path` (`string`): 생성된 실행 결과 기록 파일의 경로입니다.

출력 요약 객체(`stdout`, `stderr`)는 다음 필드를 가집니다.

- `bytes` (`number`): 생성된 전체 출력 바이트 수입니다.
- `truncated` (`boolean`): 크기 제한으로 인해 출력이 생략되었는지 여부입니다.
- `tail` (`string`): 보존된 출력 데이터의 마지막 부분입니다.

실행 기록은 특정 시점의 실행 증거(Evidence)로 사용됩니다. 전체 명령 구성의 기준 원본은 항상 `.mustflow/config/commands.toml`입니다.

`write_drift`는 경로 메타데이터만 저장합니다. 파일 내용이나 차이(diff)는 저장하지 않으며, mustflow를 파일시스템 샌드박스로 만들지도 않습니다. 선언되지 않은 변경은 검토용 경고 근거이지 실행 차단 조건은 아닙니다.

쓰기 변경 추적은 가능하면 `git status`를 사용합니다. 현재 프로젝트가 Git 작업 트리가 아니면 기본적으로 저장소 전체를 재귀 스냅샷하지 않습니다. 해당 실행에서 로컬 대체 스냅샷을 명시적으로 원할 때만 `MUSTFLOW_WRITE_DRIFT_SNAPSHOT=1`을 설정하세요.

`performance`는 안전한 메타데이터만 담습니다. 실행 시간, 자식 명령 실행 시간과 분리해 측정한 실행기 부하 시간, 제한 시간 사용 비율, 출력 바이트 수, 종료 결과 요약, 실행 환경의 큰 분류, 그리고 정규화된 명령/의도/계약 지문만 저장합니다. 선택적 실행 프로파일처럼 구조화된 출처가 있을 때만 단계별 시간(`performance.phases`)을 저장하며, 원시 명령 출력을 파싱해서 만들지 않습니다. 명령 출력, 환경 변수 값, 절대 경로, 호스트 이름, 브랜치 이름, 원본 커밋 해시, 테스트 이름은 넣지 않습니다. 이 정보는 이미 허용된 명령 사이에서 속도 힌트로만 쓸 수 있으며, 명령 실행 권한을 부여하거나 검증을 생략해도 된다는 근거가 될 수 없습니다.

`mf run`은 제한된 로컬 성능 힌트도 `.mustflow/state/perf/samples.json`과 `.mustflow/state/perf/summary.json`에 씁니다. 이 파일들은 실행 기록의 안전한 `performance` 메타데이터만 복사하고, 날짜는 일 단위로만 저장하며, 작은 보존 한도를 적용합니다. 구조화된 단계별 시간이 있으면 단계 이름과 시간 숫자만 복사합니다. 원본 실행 기록, 명령 출력, 명령줄, 환경 변수 값, 절대 경로, 테스트 이름은 복사하지 않습니다.

## 선택적 실행 프로파일

`MUSTFLOW_RUN_PROFILE=1`을 설정하면 현재 `mf run` 호출에 대해 `.mustflow/state/runs/latest.profile.json`을 씁니다. 이 파일에는 루트 탐색, 명령 계약 로딩, 실행 계획 생성, 환경 준비, 쓰기 변경 추적, 자식 명령 실행, 실행 기록 쓰기 같은 단계별 시간이 제한된 형태로 들어갑니다.

이 프로파일은 최신 실행 경로를 진단하기 위한 로컬 생성 상태입니다. 명령 출력, 환경 변수 값, 절대 경로, 과거 실행 표본은 넣지 않으며, 명령 실행 권한을 부여하거나 검증을 생략해도 된다는 근거로 쓰면 안 됩니다.

## Help 및 종료 코드

- 종료 코드 `0`: 명령 의도가 정상적으로 수행되었으며 허용된 종료 코드로 종료되었습니다.
- 종료 코드 `1`: 의도 정의 누락, 실행 조건 미충달, 시간 초과 또는 명령 수행 실패가 발생했습니다.
