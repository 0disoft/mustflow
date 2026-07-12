---
title: 저장소에서 mustflow 사용하기
description: 명령을 추측하지 않고 프로젝트에 mustflow를 설치하고 검증합니다.
---

저장소를 소유하거나 관리하면서 에이전트가 저장소 안의 규칙을 따르게 만들고 싶을 때 이 경로를 사용하세요.

## 설치

```sh
npm install -D mustflow
npx mf init --yes
npx mf check --strict
```

`mf init`은 `AGENTS.md`와 `.mustflow/**`를 설치합니다. 애플리케이션 소스 코드, 지속적 통합(CI) 파일, 프로젝트 소유 루트 문서를 만들지는 않습니다.

## 첫 변경 검증

```sh
npx mf classify --changed --write .mustflow/state/change-classification.json
npx mf verify --from-classification .mustflow/state/change-classification.json --plan-only --json
npx mf verify --from-classification .mustflow/state/change-classification.json --json
```

명령 실행 권한은 오직 `.mustflow/config/commands.toml`에서 옵니다. 스킬, 문맥 파일, 생성된 지도, 검색 결과, 캐시, 상태 파일은 작업을 안내하거나 설명할 수 있지만 명령 권한을 주지는 않습니다.

## 기존 설치 갱신

mustflow를 설치한 것과 같은 패키지 관리자로 패키지를 갱신한 뒤 저장소 루트에서 `mf upgrade`를 실행하세요. 이 명령은 패키지 버전을 확인하고 안전한 템플릿 계획만 적용합니다. 패키지를 설치하거나 사용자 지정 워크플로우 파일을 덮어쓰지 않습니다.

```sh
npm update -D mustflow
npx mf upgrade --dry-run
npx mf upgrade
npx mf check --strict
```

계획에 로컬 변경 차단이 나오면 통과시키려고 프로젝트 소유 파일을 지우지 말고, 필요한 템플릿 변경을 의도적으로 병합하세요.

## 다음 파일

- 에이전트가 가장 먼저 읽는 저장소 규칙은 `AGENTS.md`에 있습니다.
- 실행 가능한 의도는 `.mustflow/config/commands.toml`에 설정합니다.
- 읽기 전용 상태 확인이 필요하면 `mf doctor`를 사용합니다.
- 가장 작은 프로젝트 형태는 `examples/minimal-js/`를 참고합니다.
