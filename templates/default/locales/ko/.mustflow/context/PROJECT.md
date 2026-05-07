---
mustflow_doc: context.project
kind: mustflow-context
locale: ko
canonical: false
revision: 1
name: project
authority: contextual
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# 프로젝트 문맥

이 파일은 코딩 에이전트를 위한 프로젝트별 문맥을 기록합니다.
모르는 항목은 비워 두고 내용을 추측해서 만들지 않습니다.

## 현재 목표

미설정. 프로젝트 소유자가 제공한 현재 프로젝트 목표로 바꿉니다.

## 비목표

미설정. 관련 없는 작업 중 에이전트가 확장하면 안 되는 범위를 적습니다.

## 핵심 약속

- 반드시 지켜야 하는 작업 규칙은 `AGENTS.md`를 따릅니다.
- 명령의 기준 원본은 `.mustflow/config/commands.toml`입니다.
- 작업 흐름과 문서 경계의 기준 원본은 `.mustflow/config/mustflow.toml`입니다.
- 넓은 저장소 방향 파악이 필요할 때만 `REPO_MAP.md`를 얕은 탐색 지도로 사용합니다.

## 도메인 용어

미설정. 구현 판단에 영향을 주는 용어만 추가합니다.

## 특히 조심할 영역

미설정. 더 신중히 다뤄야 하는 경로, 공개 API, 생성 파일, 마이그레이션, 비밀정보, 호환성 표면을 적습니다.

## 다음으로 읽을 파일

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## 오래된 내용 확인

- 이 파일이 현재 코드, 테스트, 명령 계약, 사용자 지시와 충돌하면 이 파일을 오래된 문맥으로 보고 충돌을 보고합니다.
- 프로젝트 방향, 비목표, 저장소 전체 약속이 실제로 바뀔 때만 이 파일을 수정합니다.

