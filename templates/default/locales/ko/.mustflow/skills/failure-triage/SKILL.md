---
mustflow_doc: skill.failure-triage
locale: ko
canonical: false
revision: 3
name: failure-triage
description: 테스트, 빌드, 규칙 검사, 문서 검증 명령이 실패했거나 원인을 좁혀야 할 때 사용합니다.
metadata:
  mustflow_schema: "1"
  mustflow_kind: procedure
  command_intents:
    - test
    - lint
    - build
    - docs_validate
    - mustflow_check
---

# Failure Triage

## 목적

실패를 숨기거나 무작위로 수정하지 않고, 가장 작은 원인 후보부터 확인합니다.

## 사용 조건

- 선언된 명령 의도가 실패했을 때 사용합니다.
- 테스트, 빌드, 규칙 검사, 문서 검증 실패의 원인을 좁혀야 할 때 사용합니다.

## 사용하지 않는 경우

- 실패 로그나 실행한 명령 의도를 알 수 없으면 먼저 실행 기록을 확보합니다.
- 파괴적 복구 명령이 필요해 보이면 사용자가 승인하기 전에는 진행하지 않습니다.

## 필요한 입력

- 실패한 명령 의도 이름
- 실제 실행된 `argv` 또는 `cmd`
- 작업 디렉터리, 종료 코드, 핵심 오류 메시지
- 관련 변경 파일
- `.mustflow/docs/agent-workflow.md`의 실패 대응 정책
- `.mustflow/config/commands.toml`의 실패한 명령 의도 계약

## 절차

1. 실패한 명령 의도와 작업 디렉터리를 기록합니다.
2. 종료 코드와 핵심 오류 메시지를 기록합니다.
3. 명령 생명주기와 제한 시간을 확인합니다.
4. `oneshot` 의도만 한 번 다시 실행해 일시 실패인지 확인합니다.
5. `server`, `watch`, `interactive`, `browser`, `background` 의도는 재실행하지 않고 장기 실행 명령으로 보고합니다.
6. 제한 시간 초과가 있었다면 프로세스 정리 결과를 기록합니다.
7. 환경 문제, 설정 문제, 코드 문제, 테스트 문제로 분류합니다.
8. 가장 작은 재현 명령이나 관련 파일을 찾습니다.
9. 최소 수정 후 실패한 명령 의도를 다시 실행합니다.

## 검증

공유 명령 정책은 `.mustflow/docs/agent-workflow.md#명령-실행-정책`을 따릅니다.

관련 명령 의도:

- 실패한 원래 명령 의도
- 수정 범위에 따라 필요한 `test`, `lint`, `build`, `docs_validate`, `mustflow_check`

각 의도는 `.mustflow/config/commands.toml`에서 확인합니다.
`status = "configured"`가 아니면 실행하지 않고, 상태와 건너뛴 이유를 보고합니다.
`lifecycle = "oneshot"`과 `run_policy = "agent_allowed"`가 아니면 검증 명령으로 실행하지 않습니다.
스킬 문서에서 원시 셸 명령을 만들지 않습니다.

## 실패 대응

- 비밀정보가 로그에 노출된 경우 멈추고 보고합니다.
- 파괴적 명령이 필요해 보이면 멈추고 승인 필요 사항으로 보고합니다.
- 장기 실행 프로세스가 필요한 실패라면 개발 서버나 브라우저 UI를 직접 실행하지 않고 승인 필요 사항으로 보고합니다.
- 제한 시간 초과 후 정리가 실패하면 프로세스 ID, 명령 의도, 정리 오류를 보고합니다.
- 원인이 저장소 밖 서비스나 권한 문제로 보이면 현재까지 확인한 내용을 보고합니다.

## 출력 형식

- 작업 요약
- 실패한 명령 의도
- 핵심 오류
- 확인한 원인 후보
- 수행한 재현 또는 재시도
- 명령 생명주기와 제한 시간 초과 여부
- 수정한 내용
- 남은 위험과 다음 확인 지점
