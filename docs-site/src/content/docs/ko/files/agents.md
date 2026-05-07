---
title: AGENTS.md
description: 에이전트가 저장소에서 가장 먼저 읽는 짧은 작업 규칙 진입점입니다.
---

`AGENTS.md`는 LLM 에이전트가 저장소에 들어왔을 때 가장 먼저 읽어야 하는 루트 진입점입니다.

## 어디에 쓰이나

`mf init`은 이 파일을 사용자 저장소 루트에 만듭니다. 루트에 두는 이유는 에이전트가 저장소에 처음 들어왔을 때 가장 쉽게 발견할 수 있어야 하기 때문입니다.

이 파일은 mustflow 문서 흐름으로 들어가는 입구입니다. 세부 정책은 `.mustflow/docs/agent-workflow.md`, 실행 명령은 `.mustflow/config/commands.toml`, 저장소별 기본 선호값은 `.mustflow/config/preferences.toml`, 작업별 프로젝트 문맥은 `.mustflow/context/`, 반복 절차는 `.mustflow/skills/`로 분리합니다.

## 역할

- mustflow 문서 흐름의 시작점을 제공합니다.
- 처음 읽을 파일 순서를 정합니다.
- 명령 추측 금지, 기존 변경 보존, 비밀정보 보호 같은 절대 규칙만 남깁니다.
- 세부 작업 흐름은 `.mustflow/docs/agent-workflow.md`로 연결합니다.
- 실행 가능 여부는 `.mustflow/config/commands.toml`의 명령 의도 상태로 판단하게 합니다.
- `mf doctor`는 수정 전 읽기 전용 진단 명령이라고 밝힙니다.
- `mf context --json`은 읽기 전용 맥락 색인일 뿐, 실제 문서 읽기를 대신하지 않는다고 밝힙니다.
- 길게 실행되거나 민감한 상태에 영향을 주는 작업은 `mustflow.toml`의 `[budget]`, `[approval]`, `[isolation]`을 따르게 합니다.

## 읽기 순서

```text
AGENTS.md
.mustflow/docs/agent-workflow.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml  # 있으면 읽기
.mustflow/skills/INDEX.md
.mustflow/context/INDEX.md  # 작업별 문맥이 필요할 때만
.mustflow/context/<name>.md  # 문맥 색인이 고른 파일만
.mustflow/skills/<name>/SKILL.md
REPO_MAP.md  # 넓은 탐색이 필요할 때만
```

## 앞부분 메타데이터

```yaml
mustflow_doc: agents.root
locale: en
canonical: true
revision: 4
```

- `mustflow_doc`: mustflow 안에서 이 문서를 식별하는 고정 이름입니다.
- `locale`: 문서 언어입니다.
- `canonical`: 현재 문서가 기준 원문인지 나타냅니다.
- `revision`: 기준 문서의 판 번호입니다.

영어 템플릿 `AGENTS.md`가 기준 원문입니다. 언어별 번역 템플릿은 각자의 `locale`을 쓰고
`canonical: false`로 표시합니다.

## 작성 기준

루트의 `AGENTS.md`는 에이전트가 쉽게 발견해야 하므로 `.mustflow/` 안으로 넣지 않습니다.

`AGENTS.md`에는 실제 테스트나 빌드 명령, 저장소 트리, 최근 변경사항, 생성 시각을 직접 쓰지 않습니다. 이런 정보는 입력 안정성을 떨어뜨리므로 `commands.toml`, `REPO_MAP.md`, 관련 소스 파일로 분리합니다.

언어, 주석, 커밋 메시지, 문서화, 로그, 서식 같은 기본 선호값은 `AGENTS.md`에 길게 쓰지 않고 `.mustflow/config/preferences.toml`에 둡니다.

자율 반복 실행기, 여러 작업자 조정, 페르소나 시스템, 장기 실행 하네스는 `AGENTS.md`에서
바로 시작하지 않습니다. 이런 기능이 필요하다면 mustflow 설정과 보조 문서에서 명시적으로
선택해야 합니다.
