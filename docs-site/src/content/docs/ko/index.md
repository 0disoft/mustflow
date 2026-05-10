---
title: mustflow
description: mustflow가 관리하는 에이전트 작업 흐름을 설명하는 기술 문서입니다.
---

mustflow는 LLM 코딩 에이전트가 저장소 안에서 추측으로 명령을 만들거나 검증 경계를 넘지 못하게 하는 작업 흐름 계약입니다. 필수 읽기 순서, 명령 계약, 변경 분류, 실행 없는 검증 계획, 명령 실행 기록을 함께 설치합니다.

## 첫 흐름

```sh
npm install -D mustflow
npx mf init --yes
npx mf check --strict
```

코드, 템플릿, 스키마, 문서를 바꾼 뒤에는 명령을 실행하기 전에 필요한 검증을 먼저 확인합니다.

```sh
npx mf classify --changed --json > .mustflow/state/change-plan.json
npx mf verify --from-plan .mustflow/state/change-plan.json --plan-only --json
npx mf verify --from-plan .mustflow/state/change-plan.json --json
```

`mf classify`는 변경된 경로를 공개 표면과 검증 사유로 분류합니다. `mf verify --plan-only --json`은 그 사유를 `.mustflow/config/commands.toml`의 `required_after` 메타데이터와 연결하되 명령은 실행하지 않습니다. 실제로 실행 가능한 명령은 여전히 선언된 명령 계약을 통과해야 합니다. 즉 구성 완료 상태(`configured`), 일회성 실행(`oneshot`), 에이전트 실행 허용(`agent_allowed`), 닫힌 표준 입력(`stdin = "closed"`), 제한 시간, 명시적인 명령 소스가 필요합니다.

## 계약 구성

- 필수 읽기 순서: 에이전트는 `AGENTS.md`에서 시작해 설정된 작업 흐름 파일을 순서대로 읽습니다.
- 명령 계약: 실행 가능한 명령 권한은 `commands.toml`에서만 나옵니다.
- 변경 수용: `classify`와 `verify --plan-only`는 명령 실행 전에 왜 검증이 필요한지 설명합니다.
- 실행 기록: `mf run`과 실행형 `mf verify` 흐름은 `.mustflow/state/` 아래에 최신 실행 기록을 남깁니다.
- 탐색 힌트: `REPO_MAP.md`, SQLite 검색 결과, 소스 앵커는 파일을 찾는 데만 쓰입니다. 명령 권한을 주거나, 검증을 생략하거나, 작업 흐름 규칙을 바꾸지 않습니다.
- 대시보드: 대시보드는 상태 확인, 복사, 설명을 위한 화면입니다. 명령 실행, 수정 적용, 에이전트 시작, 병합, 푸시, 자동 파일 갱신은 하지 않습니다.

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
