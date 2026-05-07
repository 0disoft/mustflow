---
title: 로컬 색인
description: mustflow가 SQLite를 로컬 색인으로 사용하는 방향을 설명합니다.
---

mustflow는 SQLite를 기본 로컬 색인 저장소로 사용합니다.

## 원칙

파일이 항상 기준 원본입니다.

- `AGENTS.md`
- `.mustflow/config/*.toml`
- `.mustflow/context/*.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/*/SKILL.md`

SQLite는 더 빠른 검색과 분석을 위한 보조 로컬 색인입니다. 삭제해도 안전하게 다시 만들 수 있어야 합니다.

SQLite 로컬 데이터베이스는 재생성 가능한 캐시입니다. 기준 원본, 기억 저장소, 감사 로그, 대화 기록 저장소로 취급하면 안 됩니다.

## 예상 위치

```text
.mustflow/cache/mustflow.sqlite
```

`mf init`은 이 파일을 바로 만들지 않습니다. 색인은 `mf index`를 실행할 때 만들어집니다.
`mf search`는 이 파일을 읽지만 원본 문서는 수정하지 않습니다. 향후 `mf map`과 `mf dashboard` 기능이 이 파일을 다시 사용할 수 있습니다.

기본 템플릿은 이 상태를 다음처럼 선언합니다.

```toml
[capabilities]
local_index = "generated_optional"
```

즉 색인은 선택적으로 생성되는 데이터이며 기준 문서가 아닙니다.

## 색인이 저장할 수 있는 데이터

- 문서 경로
- 제목과 섹션 제목
- 앞부분 메타데이터
- 문서 revision과 해시
- 짧은 본문 발췌
- 명령 의도 메타데이터
- 스킬 참조

현재 `mf index` 명령은 `metadata_and_snippets` 모드를 사용합니다. 문서마다 최대 2048바이트의 짧은 발췌만 저장하고, 기본값으로 전체 문서 본문은 저장하지 않습니다. 대신 명령 의도 이름과 설명을 파생 검색어로 저장해 `mf search`가 관련 설정 파일을 찾을 수 있게 합니다.

검색 전 `mf search`는 저장된 본문 해시와 현재 파일을 비교하고, 캐시가 오래되었으면 오류를 반환합니다. 마지막 검증 결과와 실행 분석은 향후 기능으로 남겨둡니다.

## 쓰기 규칙

LLM이나 대시보드가 문서를 수정하더라도 최종 쓰기 대상은 Markdown이나 TOML이어야 합니다.

SQLite는 검색, 표시, 검증 속도를 높이기 위한 보조 데이터입니다.

원본 로그, 전체 터미널 출력, 전체 대화 전문, 숨은 추론 과정, 비밀정보, 환경값, 비공개 외부 저장소 본문은 색인이나 향후 지식 계층의 기준 문서가 아닙니다. mustflow는 프로젝트 안에 작은 실행 기록만 남기며, 기본값으로 원본 로그를 저장하지 않습니다. 이 원칙은 `.mustflow/config/mustflow.toml`의 `[retention]` 정책과 `mf check --strict`의 저장소 검사로 강제됩니다.
