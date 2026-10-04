---
mustflow_doc: agents.root
locale: ko
canonical: false
revision: 1
lifecycle: user-editable
authority: binding
---

# AGENTS.md

이 저장소는 mustflow simple 워크플로를 씁니다.

## 우선순위

사용자 작업과 가장 가까운 프로젝트 규칙을 먼저 따릅니다. 이 파일보다 우선합니다.

## 읽기

가장 가까운 `AGENTS.md`와 작업이 건드리는 소스, 패키지 설정만 읽습니다. 확장 스킬 색인과 워크플로 문서는 선택 사항이고, 필요할 때만 봅니다.

## 명령

저장소의 package script, Makefile, Taskfile, Go, Rust 명령을 그대로 씁니다. `mf run check`, `test`, `typecheck`, `lint`, `build`는 선택 사항이고 package script와 Go/Rust 매니페스트에서 흔한 명령을 찾아냅니다. 저장소에 명시된 명령 제한은 그대로 적용되고 `mf run`도 이를 지킵니다.

## 범위

일반 개발에서는 intent 등록이나 매니페스트 동기화가 필요 없습니다. 좁고 관련 있는 검사만 고르고, 입력이 그대로면 유효한 결과를 재사용합니다. 실패, 누락, 실행하지 않은 검사는 통과가 아닙니다. 정식 릴리스, 공개 API, 보안, 데이터 변경처럼 현재 범위에 해당할 때만 전체 릴리스 검사를 돌립니다.

## 수정과 Git

무관한 수정은 그대로 둡니다. 비밀 정보는 로그와 저장소 밖에 둡니다. 정확한 범위만 스테이징하고 작은 논리 단위로 커밋합니다. 푸시, 게시, 배포는 사용자가 허용할 때만 합니다.

## 위생

자동 버전 범프와 반복되는 권한·읽기 루프는 피합니다. 백그라운드 프로세스를 띄우는 스크립트는 스스로 정리해야 합니다. 기존 전역 strict 문서는 일반적인 simple 워크플로를 규율하지 않습니다.
