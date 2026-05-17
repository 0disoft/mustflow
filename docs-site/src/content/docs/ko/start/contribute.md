---
title: mustflow에 기여하기
description: 설치된 사용자 프로젝트 파일과 mustflow 저장소 개발 흐름을 구분하며 작업합니다.
---

mustflow 패키지, 문서 사이트, 템플릿, 스키마, 테스트, 배포 흐름을 바꿀 때 이 경로를 사용하세요.

## 시작

- `CONTRIBUTING.md`를 읽습니다.
- 편집 전에 이 저장소의 `AGENTS.md`를 읽습니다.
- 검증은 `.mustflow/config/commands.toml`에 설정된 intent를 사용합니다.

## 자주 쓰는 확인

```sh
mf run docs_validate_fast
mf run mustflow_check
mf run test_related
```

변경된 표면을 덮는 가장 좁은 검증 intent를 고르세요. 배포, 넓은 동작 변경, 스키마, 패키지, 템플릿 변경에는 더 넓은 확인이 필요할 수 있습니다.

## 경계

이 저장소의 개발 환경은 Bun을 사용하지만, 사용자 프로젝트에서 mustflow를 실행하는 데 Bun이 필요한 것은 아닙니다. `templates/default/` 아래 파일은 설치되는 워크플로 파일이고, `docs-site/`, `src/`, `tests/`, `schemas/` 아래 파일은 이 패키지 저장소의 개발 표면입니다.
