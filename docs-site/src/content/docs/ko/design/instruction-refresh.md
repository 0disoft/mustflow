---
title: 지침 새로고침
description: mustflow가 프로젝트 파일 세션 카운터 대신 새로고침 체크포인트를 사용하는 이유입니다.
---

긴 에이전트 세션에서는 시작할 때 읽은 지침과 작업 상태가 어긋날 수 있습니다. 도구 출력,
큰 diff, 맥락 압축, 중첩 저장소 변경은 처음 읽은 `AGENTS.md`를 덜 보이게 만듭니다.

mustflow는 이를 새로고침 체크포인트로 처리합니다.

## 해결하는 문제

- 에이전트가 위험한 행동 전에 관련 지침 파일을 다시 확인할 수 있습니다.
- 명령 실행은 기억에 의존하지 않고 `commands.toml`을 다시 확인할 수 있습니다.
- 루트 변경은 가장 가까운 `AGENTS.md` 재확인을 강제할 수 있습니다.
- 최종 보고는 작업 요약 전에 보고 규칙을 다시 확인할 수 있습니다.

## 피하는 것

mustflow는 대화 횟수, 메시지 수, 세션 활동 상태를 프로젝트 파일에 쓰지 않습니다.

그런 상태 추적은 Git 기록에 불필요한 소음을 만들고, 여러 에이전트 사이에서 충돌하며,
활동 메타데이터를 노출할 수 있습니다. 호스트 애플리케이션이 세션 길이를 추적한다면 로컬
캐시나 호스트 관리 저장소에 둬야 합니다.

## 새로고침 수준

- `light`: `AGENTS.md`와 `agent-workflow.md`를 다시 읽습니다.
- `command`: `AGENTS.md`와 `commands.toml`을 다시 읽습니다.
- `edit`: 민감한 수정 전에 `AGENTS.md`, `mustflow.toml`, `agent-workflow.md`를 다시 읽습니다.
- `report`: 최종 보고 전에 `AGENTS.md`, `mustflow.toml`, `preferences.toml`을 다시 읽습니다.
- `skill`: `AGENTS.md`와 `skills/INDEX.md`를 다시 읽습니다.
- `full`: mustflow 필수 읽기 순서 전체를 다시 읽습니다.

`before_command_run`은 명령 실행 전에 필요할 때 명령 계약을 새로고침하라는 뜻입니다.
모든 명령 실행 전에 mustflow 문서 전체를 다시 읽으라는 뜻은 아닙니다.

기본 임계값은 대화 8회, 도구 호출 16회, 누적 출력 100000바이트입니다. 기준 원본은
`.mustflow/config/mustflow.toml`의 `[refresh]`입니다.

## CLI 방향

향후 `mf orient`, `mf refresh` 같은 명령은 이 정책을 기계가 읽을 수 있는 계획으로 보여줄
수 있습니다. 현재 템플릿은 정책과 문서부터 제공하므로, 호스트는 모든 도구가 같은 생명주기
훅을 가진다고 가정하지 않고도 이 정책을 채택할 수 있습니다.
