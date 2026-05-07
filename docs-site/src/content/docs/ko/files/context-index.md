---
title: .mustflow/context/INDEX.md
description: 에이전트를 작업별 프로젝트 문맥 파일로 안내하는 라우터입니다.
---

`.mustflow/context/INDEX.md`는 현재 작업에 필요한 프로젝트 문맥 파일만 고르도록 돕습니다.

## 어디에 쓰이나

- 에이전트가 모든 문맥 파일을 기본으로 전부 읽지 않게 합니다.
- 프로젝트 방향을 짧은 `AGENTS.md` 라우터와 분리합니다.
- `README.md`, `DESIGN.md` 같은 선택 외부 앵커를 mustflow 소유 파일로 만들지 않고 연결합니다.

## 필드

앞부분 속성은 이 파일이 mustflow 문맥 문서임을 표시합니다.

- `kind: mustflow-context`
- `name: context-index`
- `authority: contextual`
- `stability`: 내용이 얼마나 안정적인지 나타냅니다.
- `review_status`: 사람이 문맥을 검토했는지 나타냅니다.

## 표

주요 표는 문맥 이름, 사용할 조건, 경로를 연결합니다.

기본 템플릿은 `.mustflow/context/PROJECT.md`만 나열합니다.
프론트엔드, 백엔드, API, 데이터, 보안, 운영 같은 도메인별 문맥 파일은 기본 생성하지 않습니다.

## 외부 앵커

`README.md`는 사람용 개요입니다. 에이전트는 정책이 아니라 참고 맥락으로만 사용합니다.

`DESIGN.md`는 mustflow가 생성하지 않습니다. 존재한다면 UI, 시각 디자인, 레이아웃, 디자인 토큰, 접근성 작업에서 참고할 수 있습니다.

