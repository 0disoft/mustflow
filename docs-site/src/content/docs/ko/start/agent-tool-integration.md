---
title: 에이전트 도구 통합 만들기
description: 중립적인 저장소 로컬 계약을 통해 AI 코딩 도구나 하네스를 mustflow에 연결합니다.
---

AI 코딩 도구, 에이전트 하네스, 편집기 통합, 자동화가 안정적인 mustflow 데이터를 소비해야 할 때 이 경로를 사용하세요.

## 읽기

- `AGENTS.md`에서 시작합니다.
- 기계가 읽기 쉬운 저장소 방향 정보가 필요하면 `mf context --json`을 사용합니다.
- 호스트별 지시 파일은 호환성 입력으로만 다루고, 명령 권한으로 보지 않습니다.

## 계획과 검증

```sh
mf classify --changed --json
mf verify --reason code_change --plan-only --json
mf run <intent> --json
```

사람용 터미널 문구를 파싱하지 말고 JSON 출력과 스키마를 사용하세요. 공개 스키마는 `schemas/`에 있습니다.

## 권한 경계

`.mustflow/config/commands.toml`만 실행 가능한 명령 권한을 정의합니다. 검색 결과, 로컬 색인, 생성된 지도, 선호 설정, 문맥 파일, 실행 상태는 설명용 데이터일 뿐입니다.
