---
title: 선택적 루트 문서와 계약 파일
description: 프로젝트가 직접 소유하며, 존재할 때 mustflow가 탐색 앵커로 사용할 수 있는 루트 문서와 기계 판독 계약 파일입니다.
---

mustflow는 이 파일들을 필수로 요구하거나 새로 만들지 않습니다. 다만 프로젝트에 이미
있다면 루트 수준의 탐색 앵커로 찾아 활용할 수 있습니다.

## 흔히 쓰이는 Markdown 파일

- `README.md`: 사람이 읽는 프로젝트 개요입니다. 맥락으로만 다루며 에이전트 정책은 아닙니다.
- `PROJECT.md`: 프로젝트가 직접 소유하는 짧은 설명입니다. `.mustflow/context/PROJECT.md`도 있다면, 에이전트 작업 맥락으로는 mustflow 쪽 파일의 역할이 더 명확합니다.
- `ROADMAP.md`: 예정 작업, 우선순위, 마일스톤, 의도적으로 제외하는 항목(비목표)을 담습니다.
- `DESIGN.md`: UI 작업을 위한 시각 정체성, 화면 배치, 접근성, 디자인 토큰 기준입니다.
- `CONTRIBUTING.md`: 기여 흐름, 풀 리퀘스트에서 기대하는 사항, 로컬 개발 환경 안내입니다.
- `SECURITY.md`: 취약점 제보 절차와 보안에 민감한 변경 기준입니다.
- `CHANGELOG.md`: 릴리스 이력과 사용자에게 보이는 변경 내역입니다.
- `CODE_OF_CONDUCT.md`: 커뮤니티 참여 기준입니다.
- `SUPPORT.md`: 지원 채널과 유지보수 기대사항입니다.
- `GOVERNANCE.md`: 의사결정, 권한, 유지보수 절차입니다.
- `MAINTAINERS.md`: 관리자, 검토 책임, 문제 상향 처리 경로입니다.
- `RELEASING.md` 또는 `RELEASE.md`: 릴리스 절차와 배포 점검표입니다.
- `TESTING.md`: 테스트 전략, 필수 검사, 검증 기준입니다.
- `DEPLOYMENT.md`: 배포 환경, 릴리스 대상, 점진적 배포 기준입니다.
- `OPERATIONS.md` 또는 `RUNBOOK.md`: 운영 절차와 반복 대응 절차입니다.
- `CONFIGURATION.md`: 환경 변수, 기능 플래그, 실행 환경 설정 기준입니다.
- `DATA_MODEL.md` 또는 `SCHEMA.md`: 도메인 데이터 모델이나 스키마 기준입니다.
- `PRIVACY.md`: 개인정보, 데이터 처리, 보존 기준입니다.
- `TROUBLESHOOTING.md`: 알려진 실패와 복구 절차입니다.
- `ARCHITECTURE.md`: 시스템 구조, 모듈 경계, 아키텍처 결정입니다.
- `API.md`: 공개 API 범위와 연동 계약입니다.

## 기계 판독용 계약 파일

`SSOT.json`처럼 모든 것을 담는 이름보다, 용도를 바로 알 수 있는 이름을 우선합니다.

- `project.contract.json`: 도구가 검증할 수 있는 저장소 수준 계약입니다.
- `project.constants.json`: 코드나 도구가 읽는 공유 프로젝트 상수입니다.
- `design-tokens.json`: 디자인 토큰 계약입니다.
- `openapi.json`, `openapi.yaml`, `openapi.yml`: OpenAPI 계약입니다.
- `asyncapi.json`, `asyncapi.yaml`, `asyncapi.yml`: AsyncAPI 계약입니다.
- `schema.graphql`: GraphQL 스키마 계약입니다.
- `schema.prisma`: Prisma 데이터 스키마 계약입니다.

## mf init과의 관계

`mf init`은 이 파일들을 복사하지 않습니다. 사용자 저장소가 이미 소유하는 문서인 경우가
많기 때문에, mustflow가 프로젝트 문서를 덮어쓰지 않아야 합니다.

## REPO_MAP.md와의 관계

`mf map`은 이 파일들이 존재할 때 지도에 포함합니다. 에이전트가 유용한 맥락을 찾을 수 있도록
하되, 모든 Markdown 파일을 필수 읽기 문서로 취급하지 않기 위해서입니다. 이 파일들은
`AGENTS.md`, `.mustflow/config/*.toml`, 명령 계약을 덮어쓰지 않습니다.
