---
mustflow_doc: context.index
kind: mustflow-context
locale: ko
canonical: false
revision: 1
name: context-index
authority: contextual
stability: medium
review_status: needs_human_review
---

# 문맥 색인

이 파일은 현재 작업에 필요한 프로젝트 문맥 파일만 고르기 위한 라우터입니다.
모든 문맥 파일을 기본으로 전부 읽지 않습니다.

## 사용 가능한 문맥

| 문맥 | 사용할 때 | 경로 |
| --- | --- | --- |
| project | 작업이 프로젝트 방향, 범위, 공개 동작, 비목표, 저장소 전체 약속에 영향을 줄 수 있을 때 | `.mustflow/context/PROJECT.md` |

## 선택 외부 앵커

| 앵커 | 사용할 때 | 경로 |
| --- | --- | --- |
| 사람용 개요 | 공개 프로젝트 개요나 설치 흐름이 필요할 때. 정책이 아니라 참고 맥락으로만 사용합니다. | `README.md` |
| 시각 디자인 | UI, 시각 정체성, 디자인 토큰, 레이아웃, 접근성을 바꿀 때 | `DESIGN.md` |

## 읽기 규칙

- 현재 작업과 맞는 문맥 파일만 읽습니다.
- 문맥 파일은 더 높은 권위의 기준 파일을 근거로 한다고 명시하지 않는 한 참고 지침으로 봅니다.
- 문맥이 코드, 테스트, 명령 계약, 사용자 직접 지시와 충돌하면 충돌을 보고하고 더 높은 권위의 기준을 따릅니다.
- 빠진 프로젝트 목표, 비목표, 디자인 토큰, API 약속, 데이터 규칙을 추측해서 만들지 않습니다.
- `DESIGN.md`의 디자인 토큰을 `.mustflow/context/` 안에 중복 기록하지 않습니다.

