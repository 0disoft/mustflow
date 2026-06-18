---
mustflow_doc: context.project
kind: mustflow-context
locale: ko
canonical: false
revision: 4
name: project
authority: contextual
lifecycle: user-editable
stability: medium
review_status: needs_human_review
source_refs:
  - AGENTS.md
  - .mustflow/config/mustflow.toml
  - .mustflow/config/commands.toml
---

# 프로젝트 컨텍스트

이 파일은 코딩 에이전트를 위한 프로젝트별 컨텍스트를 정의합니다.  
알 수 없는 항목은 비워 두시고, 내용을 임의로 추측하여 작성하지 마십시오.

## 권한 경계

- 이 파일에는 근거가 있는 컨텍스트, 알 수 없는 사항, 충돌 내용을 기록할 수 있습니다.  
- 이 파일은 명령 실행 권한을 부여하거나, 파일 수정 금지 규칙을 정의하거나,  
  `AGENTS.md` 또는 `.mustflow/config/*.toml`을 재정의하거나, 현재 근거가 없는  
  기능을 약속해서는 안 됩니다.  
- 장기적으로 유지해야 하는 작업 규칙은 이 파일이 아니라 `AGENTS.md`,  
  `.mustflow/docs/agent-workflow.md` 또는 해당 설정 파일에 두십시오.

## 현재 목표

미설정 상태입니다. 프로젝트 소유자가 제공하는 현재 프로젝트 목표로 업데이트해 주십시오.

## 비목표

미설정 상태입니다. 관련 없는 작업 수행 시 에이전트가 다루지 말아야 할 범위를 정의해 주십시오.

## 핵심 약속

- 반드시 준수해야 하는 작업 규칙은 `AGENTS.md`를 따릅니다.  
- 명령의 기준 원본(Source of Truth)은 `.mustflow/config/commands.toml`입니다.  
- 작업 흐름과 문서 경계의 기준 원본은 `.mustflow/config/mustflow.toml`입니다.  
- 저장소 전반의 개요 파악이 필요할 때만 `REPO_MAP.md`를 얕은 탐색 지도로 참조하십시오.

## 도메인 용어

미설정 상태입니다. 구현 결정에 영향을 미치는 도메인 용어만 추가해 주십시오.

## 특히 조심할 영역

미설정 상태입니다. 특별한 주의가 필요한 경로, 공개 API, 생성 파일, 마이그레이션, 비밀 정보, 호환성 표면 등을 정의해 주십시오.

## 다음으로 읽을 파일

- `AGENTS.md`  
- `.mustflow/docs/agent-workflow.md`  
- `.mustflow/config/mustflow.toml`  
- `.mustflow/config/commands.toml`  
- `.mustflow/skills/router.toml`
- 상세 라우트 메타데이터가 필요할 때만 `.mustflow/skills/routes.toml`
- 사람이 읽을 라우트 근거가 필요할 때만 `.mustflow/skills/INDEX.md`

## 오래된 내용 확인

- 이 파일이 현재 코드, 테스트, 명령 계약, 명시적 사용자 지시와 충돌하는 경우, 이를 오래된 컨텍스트로 간주하고 충돌 내용을 보고해 주십시오.  
- 프로젝트 방향, 비목표, 저장소 전반의 규칙이 실제로 변경된 경우에만 이 파일을 수정해 주십시오.
