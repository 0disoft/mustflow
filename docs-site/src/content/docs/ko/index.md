---
title: mustflow
description: mustflow가 설치하는 에이전트 문서 흐름의 소비자용 설명서입니다.
---

mustflow 문서는 `mf init`이 사용자 저장소에 만드는 LLM 전용 파일들의 역할과 필드 의미를 설명합니다.

## 이 사이트에서 확인할 것

- 각 파일이 사용자 저장소에서 어디에 놓이는지
- 에이전트가 어떤 순서로 파일을 읽는지
- 각 설정 필드와 문서 섹션이 어떤 역할을 하는지
- 어떤 파일은 복사되고, 어떤 파일은 생성되며, 어떤 파일은 만들지 않는지
- 에이전트가 명령을 추측하지 않도록 어떤 계약을 따라야 하는지
- 에이전트가 `mf context --json`으로 어떤 맥락을 확인할 수 있는지

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

`mf init`은 `README.md`, `.github/`, 일반 `docs/`, 일반 `skills/`, 소스 코드, 패키지 관리자 설정을 만들지 않습니다.
`REPO_MAP.md`는 템플릿에서 복사하지 않고 저장소 구조를 읽어 생성하는 파일입니다.
`manifest.lock.toml`은 템플릿에서 복사하지 않고 `mf init`이 실제 설치 결과를 기록하기 위해 생성합니다.
`.mustflow/state/runs/latest.json`은 `mf run`으로 명령을 실행할 때 생기는 마지막 실행 영수증입니다.

## 읽는 순서

1. `AGENTS.md`에서 반드시 지킬 짧은 규칙을 확인합니다.
2. `.mustflow/docs/agent-workflow.md`에서 공통 작업 정책을 확인합니다.
3. `.mustflow/config/mustflow.toml`에서 기준 문서와 보호 경로를 확인합니다.
4. `.mustflow/config/commands.toml`에서 실행 가능한 명령 의도를 확인합니다.
5. `.mustflow/config/preferences.toml`이 있으면 저장소별 기본 선호값을 확인합니다.
6. `.mustflow/skills/INDEX.md`에서 작업과 맞는 스킬을 찾습니다.
7. 작업별 프로젝트 문맥이 필요할 때만 `.mustflow/context/INDEX.md`를 확인합니다.

이 사이트는 사용자 프로젝트에 복사되는 문서가 아닙니다. mustflow 구조를 이해하기 위한 참고 문서입니다.
