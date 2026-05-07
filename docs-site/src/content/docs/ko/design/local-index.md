---
title: 로컬 색인
description: mustflow가 SQLite를 로컬 색인으로 사용하는 방향을 설명합니다.
---

mustflow는 SQLite를 기본 로컬 색인 저장소로 사용합니다.

## 원칙

기준 원본은 항상 파일입니다.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite는 이 파일들을 더 빠르게 찾고 분석하기 위한 보조 색인입니다. 삭제해도 다시 만들 수 있어야 합니다.

## 예상 위치

```text
.mustflow/cache/mustflow.sqlite
```

`mf init`은 이 파일을 바로 만들지 않습니다. 색인은 `mf index`를 실행할 때 생성합니다.
`mf search`는 이 파일을 읽기 전용으로 조회합니다. 나중에 `mf map`, `mf dashboard`도
이 색인을 사용할 수 있습니다.

기본 템플릿은 이 상태를 다음처럼 선언합니다.

```toml
[capabilities]
local_index = "generated_optional"
```

이 값은 색인이 기본 원본이 아니라 필요할 때 다시 만들 수 있는 선택형 생성물이라는 뜻입니다.

## 색인에 넣을 수 있는 정보

- 문서 경로
- 제목과 섹션
- 앞부분 메타데이터
- 문서 판 번호
- 명령 의도 이름
- 스킬 참조 관계

현재 `mf index`는 mustflow 문서, 문맥 파일, 설정 파일, 스킬 문서, 명령 의도를 색인합니다.
`mf search`는 이렇게 색인된 mustflow 작업 흐름 데이터 안에서만 검색합니다.
색인에는 파일 내용 해시도 들어갑니다. `mf search`는 검색 전 현재 파일 해시와 비교하고,
캐시가 오래됐으면 실패합니다.
마지막 검증 결과나 실행 이력 분석은 후속 기능에서 검토합니다.

## 저장 규칙

LLM이나 대시보드가 문서를 수정할 때 최종 저장 대상은 Markdown 또는 TOML 파일입니다.

SQLite는 검색, 표시, 검증 속도를 높이기 위한 보조 데이터입니다.

원본 로그, 전체 터미널 출력, 전체 대화 원문은 색인이나 지식 문서의 기준 원본이 아닙니다.
mustflow는 작은 실행 영수증과 요약 문서만 프로젝트 안에 남기고, 원시 로그는 기본적으로
저장하지 않습니다. 이 원칙은 `.mustflow/config/mustflow.toml`의 `[retention]` 정책과
`mf check --strict`의 저장 크기 검사로 확인합니다.
