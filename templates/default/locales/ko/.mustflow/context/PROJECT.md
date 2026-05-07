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

이 파일은 코딩 에이전트를 위한 프로젝트별 문맥을 정의합니다.
알 수 없는 항목은 비워 두며, 내용을 임의로 추측하여 작성하지 마십시오.

## 현재 목표

미설정. 프로젝트 소유자가 제공하는 현재 프로젝트 목표로 업데이트하십시오.

## 비목표

미설정. 관련 없는 작업 수행 시 에이전트가 다루지 말아야 할 범위를 정의합니다.

## 핵심 약속

- 반드시 준수해야 하는 작업 규칙은 `AGENTS.md`를 따릅니다.
- 명령의 기준 원본(Source of Truth)은 `.mustflow/config/commands.toml`입니다.
- 작업 흐름과 문서 경계의 기준 원본은 `.mustflow/config/mustflow.toml`입니다.
- 저장소 전반의 개요 파악이 필요한 경우에만 `REPO_MAP.md`를 얕은 탐색 지도로 참조하십시오.

## 도메인 용어

미설정. 구현 결정에 영향을 미치는 도메인 용어만 추가하십시오.

## 특히 조심할 영역

미설정. 특별한 주의가 필요한 경로, 공개 API, 생성 파일, 마이그레이션, 비밀정보, 호환성 표면을 정의합니다.

## 다음으로 읽을 파일

- `AGENTS.md`
- `.mustflow/docs/agent-workflow.md`
- `.mustflow/config/mustflow.toml`
- `.mustflow/config/commands.toml`
- `.mustflow/skills/INDEX.md`

## 오래된 내용 확인

- 이 파일이 현재 코드, 테스트, 명령 계약, 명시적 사용자 지시와 충돌하는 경우, 이를 오래된 문맥으로 간주하고 충돌 내용을 보고하십시오.
- 프로젝트 방향, 비목표, 저장소 전반의 규칙이 실제로 변경된 경우에만 이 파일을 수정하십시오.

