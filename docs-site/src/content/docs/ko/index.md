---
title: mustflow
description: mustflow가 관리하는 에이전트 작업 흐름을 설명하는 기술 문서입니다.
---

이 문서는 `mf init`이 사용자 저장소에 설치하는 LLM 최적화 파일과 설정 형식이 무엇을 의미하는지 설명합니다.

## 이 문서에서 다루는 내용

- 파일이 저장소 어디에 배치되는지
- 에이전트가 어떤 순서로 문서를 읽어야 하는지
- 각 설정 필드와 문서 섹션의 역할
- 복사되는 파일, 생성되는 파일, 기본적으로 만들지 않는 파일의 구분
- 명령 추측을 막기 위한 명령 의도 계약
- `mf context --json`으로 확인할 수 있는 기계 판독용 상태

## 기본 구조

```text
AGENTS.md
REPO_MAP.md  # 선택 생성
.mustflow/
├─ config/
│  ├─ commands.toml
│  ├─ mustflow.toml
│  ├─ preferences.toml
│  └─ manifest.lock.toml  # init 성공 시 생성
├─ context/
│  ├─ INDEX.md
│  └─ PROJECT.md
├─ docs/
│  └─ agent-workflow.md
├─ skills/
│  ├─ INDEX.md
│  └─ */SKILL.md
└─ state/  # 사용 중 생성
   └─ runs/latest.json
```

`mf init`은 `README.md`, `.github/`, 루트의 일반 `docs/`, `skills/`, `src/` 같은 프로젝트 기본 디렉터리를 건드리지 않습니다.
`REPO_MAP.md`는 정적 템플릿에서 복사하지 않고 저장소 구조를 분석해 생성합니다.
`manifest.lock.toml`은 초기화가 성공했을 때 실제 설치 결과를 기록하기 위해 생성합니다.
`.mustflow/state/runs/latest.json`은 `mf run` 실행 시 갱신되는 최신 실행 기록입니다.

## 필수 읽기 순서

1. `AGENTS.md`에서 반드시 지킬 짧은 규칙을 확인합니다.
2. `.mustflow/docs/agent-workflow.md`에서 공통 작업 정책을 확인합니다.
3. `.mustflow/config/mustflow.toml`에서 기준 문서와 보호 경로를 확인합니다.
4. `.mustflow/config/commands.toml`에서 실행 가능한 명령 의도를 확인합니다.
5. `.mustflow/config/preferences.toml`이 있으면 저장소별 기본 선호값을 확인합니다.
6. `.mustflow/skills/INDEX.md`에서 작업과 맞는 스킬을 찾습니다.
7. 작업별 프로젝트 맥락이 필요할 때만 `.mustflow/context/INDEX.md`를 확인합니다.

이 사이트는 `mf init`으로 사용자 프로젝트에 설치되지 않습니다. mustflow 구조를 이해하기 위한 참조 문서입니다.
