---
title: REPO_MAP.md
description: 에이전트가 현재 mustflow 루트를 탐색할 때 참고하는 앵커 파일 기반 지도입니다.
---

`REPO_MAP.md`는 현재 mustflow 루트에 선택적으로 둘 수 있는 생성 파일입니다.

이 파일은 전체 파일 목록이 아닙니다. `AGENTS.md`, 루트 Markdown 문서, 기계 판독용 계약 파일, `package.json`, `SKILL.md`, `.mustflow/context/INDEX.md`, 언어별 설정 파일처럼 현재 루트를 이해하는 데 도움이 되는 주요 앵커 파일을 찾아, 에이전트가 어디를 먼저 살펴봐야 하는지 알려주는 지도입니다.

여기서 말하는 루트는 반드시 Git 저장소 하나만 뜻하지 않습니다. 현재 mustflow 루트가 여러 독립 저장소를 품은 작업대라면, 같은 `REPO_MAP.md` 안에 하위 저장소의 진입점만 간략히 표시할 수 있습니다.

## 어디에 쓰이나

에이전트가 현재 mustflow 루트의 구조를 넓게 파악해야 할 때만 읽습니다. 일반적인 작은 수정에서는 필수 읽기 문서가 아닙니다.

`AGENTS.md`와 `.mustflow/docs/agent-workflow.md`가 지나치게 길어지는 것을 막기 위해, 루트 탐색 설명은 이 생성 파일로 분리합니다.

## 역할

- 현재 루트의 주요 파일과 폴더가 왜 존재하는지 간략히 설명합니다.
- 에이전트의 초기 탐색 범위를 줄여줍니다.
- 변경 범위를 잡을 때 먼저 확인해야 할 경로를 알려줍니다.
- `AGENTS.md`가 지나치게 길어지는 일을 막습니다.
- 전체 파일 목록이 필요할 때는 `git ls-files`나 편집기 파일 탐색기를 사용하도록 역할을 분리합니다.
- 현재 루트가 작업대라면 하위 독립 저장소의 내부 설명이 아니라 진입점만 표시합니다.

## 구성요소

- 첫 문장: 전체 파일 목록이 아니라 앵커 파일 기반 탐색 지도라는 점을 밝힙니다.
- 사용 방법: 전체 목록이 필요하면 `git ls-files`를 쓰도록 안내합니다.
- 우선 앵커: `AGENTS.md`, `.mustflow/config/*.toml`, `.mustflow/context/INDEX.md`, `.mustflow/skills/INDEX.md`처럼 먼저 읽을 파일을 보여줍니다.
- 디렉터리 앵커: 각 폴더 안의 `README.md`, `AGENTS.md`, `package.json`, `SKILL.md`, 주요 설정 파일을 묶어서 보여줍니다.
- 중첩 저장소: 작업대 루트에서 발견한 하위 독립 저장소의 `AGENTS.md`, `REPO_MAP.md`, 맥락 색인, 명령 계약 파일 같은 진입점만 표시합니다.
- 생성 파일: `REPO_MAP.md` 자체가 생성물이며 직접 편집하지 않는다는 점을 밝힙니다.
- 제외 기준: 의존성, 빌드 산출물, 캐시, 대용량 파일을 제외합니다.

## 생성 규칙

- `repo_map` 명령 의도 또는 `mf map` 같은 생성 명령으로 만듭니다.
- 가능하면 `git ls-files`와 실제 파일 시스템의 주요 앵커 파일 탐지를 함께 사용합니다.
- 기본 깊이는 3단계입니다. 이 깊이는 전체 파일 트리의 깊이가 아니라, 우선 앵커가 아닌 앵커 파일을 어디까지 찾을지 정하는 기준입니다.
- `node_modules`, `dist`, `build`, `.git`, 캐시, 대용량 산출물은 제외합니다.
- 파일 본문을 요약하지 않습니다.
- 생성 시각, 해시, 파일 수 같은 변동 값은 상단에 넣지 않습니다.
- 일반 소스 파일을 전부 나열하지 않고, 탐색에 도움이 되는 앵커 파일만 포함합니다.
- `.mustflow/config/preferences.toml`처럼 에이전트 행동을 해석하는 데 필요한 설정 파일은 우선 앵커로 포함합니다.
- `.mustflow/context/INDEX.md`와 `.mustflow/context/PROJECT.md`가 있으면 포함하되, 이후 추가될 모든 도메인별 맥락 파일을 기본으로 펼치지는 않습니다.
- `README.md`, `PROJECT.md`, `ROADMAP.md`, `DESIGN.md`, `GOVERNANCE.md`, `TESTING.md`, `DEPLOYMENT.md`, `ARCHITECTURE.md`, `API.md` 같은 프로젝트 소유 루트 Markdown 문서가 있으면 선택 앵커로 포함합니다. `mf map`이 이 파일들을 새로 만들지는 않습니다.
- `project.contract.json`, `project.constants.json`, `design-tokens.json`, `openapi.yaml`, `asyncapi.yaml`, `schema.graphql`, `schema.prisma`처럼 용도가 분명한 기계 판독용 계약 파일이 있으면 선택 앵커로 포함합니다. `SSOT.json`처럼 모든 것을 담는 이름은 기본 앵커로 보지 않습니다.
- 하위 저장소를 표시하더라도 원격 주소, 브랜치명, 최근 변경 상태, 명령어 목록, 자동 요약은 기본적으로 포함하지 않습니다.

## 작성 기준

첫 줄에는 이 파일이 전체 목록이 아니라 현재 mustflow 루트의 탐색 지도라는 점을 명시합니다.

```md
# REPO_MAP.md

이 파일은 전체 파일 목록이 아니라 현재 mustflow 루트의 앵커 파일 기반 에이전트 탐색 지도입니다.
```

구조가 바뀌면 손으로 오래 유지하려 하지 말고 생성 명령으로 다시 만듭니다.
