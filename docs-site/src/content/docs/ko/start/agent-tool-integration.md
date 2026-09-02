---
title: 에이전트 도구 통합 만들기
description: AI 코딩 도구나 자동화가 mustflow의 JSON 출력을 사용하도록 연결합니다.
---

AI 코딩 도구, 에이전트 실행기, 편집기 확장, 자동화에서 mustflow 데이터를 읽어야 할 때 이 안내를 사용하세요.

## 읽기

- `AGENTS.md`에서 시작합니다.
- 기계가 읽기 쉬운 저장소 방향 정보가 필요하면 `mf context --json`을 사용합니다.
- 호스트별 지시 파일은 호환성 입력으로만 다루고, 명령 권한으로 보지 않습니다.

## 계획과 검증

```sh
mf api workspace-summary --json
mf api serve --stdio
mf classify --changed --json
mf verify --reason code_change --plan-only --json
mf run <intent> --json
```

사람용 터미널 문구를 파싱하지 말고 JSON 출력과 스키마를 사용하세요. 공개 스키마는 `schemas/`에 있습니다.

## 기존 기능 활용

새 명령을 만들기 전에 기존 JSON 출력으로 해결할 수 있는지 확인하세요.

- 바뀐 파일의 종류와 검사 이유를 나누려면 `mf classify --changed --json`을 사용합니다.
- 작업공간, 명령, 검증 결과, 위험, 상태, 잠금 정보를 읽으려면 `mf api <action> --json` 또는 `mf api serve --stdio`를 사용합니다.
- 명령을 실행하기 전에 검사 계획만 보려면 `mf verify --plan-only --json`을 사용합니다.
- 결정 근거가 필요하면 `mf explain <topic> --json`을 사용합니다.
- 파일로 저장할 짧은 검토 보고서가 필요하면 `mf dashboard --export-json <path>`를 사용합니다.
- 호스트별 파일 호환성을 확인하려면 `mf adapters status --json`을 사용합니다. 어댑터 파일 생성은 기본 작업 흐름에 포함되지 않습니다.

이 기능들로 표현할 수 없을 때만 새 래퍼 명령을 추가하세요.

## 권한 경계

`.mustflow/config/commands.toml`만 실행 가능한 명령 권한을 정의합니다. 검색 결과, 로컬 색인, 생성된 지도, 선호 설정, 문맥 파일, 실행 상태는 설명용 데이터일 뿐입니다.
