---
title: 배포 전 확인
description: mustflow npm 패키지를 공개하기 전에 확인해야 하는 검증 흐름입니다.
---

mustflow는 npm으로 설치되는 CLI와 템플릿을 함께 배포합니다.

배포 전에는 로컬 소스에서 명령이 실행되는지만 보지 말고, 실제 npm 패키지 파일을 임시 프로젝트에 설치한 뒤 공개 명령이 동작하는지 확인해야 합니다.

## 확인 명령

```sh
bun run release:check
```

이 저장소에서 에이전트가 일반 검증을 실행할 때는 설정된 mustflow 명령 의도를 우선 사용합니다.

```sh
mf run build
mf run test_fast
mf run test_related
mf run test
mf run test_release
mf run docs_validate_fast
mf run docs_validate
mf run mustflow_check
```

`bun run release:check`는 배포 전 관문으로 유지합니다. `test_fast`는 빠른 CLI 회귀
기준선을 실행하고, `test_related`는 변경 파일에서 관련 테스트를 고른 뒤 없으면 빠른
기준선으로 돌아갑니다. 두 흐름은 기본적으로 Node 테스트 워커 8개를 사용하며,
로컬 환경에 맞게 `MUSTFLOW_TEST_CONCURRENCY`로 조정할 수 있습니다. `test_release`는
패키지 메타데이터와 포장 검사를 일반 로컬 수정 검증에서 분리합니다. `test_coverage`는
강제 임계값 없이 빠른 CLI 기준선을 Node 내장 coverage 보고서로 실행하며,
`MUSTFLOW_TEST_COVERAGE_CONCURRENCY`로 워커 수를 조정할 수 있습니다. `lint`와
test-audit는 좁은 저장소 로컬 관문으로 구성됩니다. `docs_validate_fast`는 전체 정적
사이트를 빌드하지 않고 내비게이션과 현지화 문서 링크를 확인합니다.
`docs_validate`는 릴리스 민감 변경을 위한 전체 문서 빌드, 검색 색인, 사이트맵
검증으로 유지합니다.

## 역할

- `bun run release:check`: CLI 검사, 문서 사이트 검사, 실제 npm 포장·설치 검증을 한 번에 실행합니다.
- `bun run check:pack`: `npm pack --dry-run --json`으로 패키지 포함 파일 목록을 확인합니다. 이 과정에서 `prepack`이 먼저 빌드됩니다.
- `bun run check:install`: 실제 `.tgz`를 만들고 임시 프로젝트에 설치한 뒤 `npx mf` 공개 흐름을 실행합니다.
- `bun run docs:check:fast`: 전체 정적 빌드 없이 내비게이션과 현지화 문서 링크를 확인합니다.
- `bun run docs:check`: 문서 사이트를 빌드하고 내비게이션, 검색 색인, 사이트맵 출력을 확인합니다.

## 문서 사이트 배포

문서 사이트 소스는 `main` 브랜치의 `docs-site/`에 둡니다.

GitHub Pages 설정에서는 `Deploy from a branch` 대신 `GitHub Actions`를 배포 원본으로 선택합니다.

`.github/workflows/docs-site.yml`은 `docs-site/**` 또는 워크플로 파일이 바뀌면 다음 흐름을 실행합니다.

```sh
bun install --frozen-lockfile
bun run check
```

그 뒤 `docs-site/dist`를 GitHub Pages 아티팩트로 업로드하고 Pages 환경에 배포합니다.

`docs-site/dist`는 생성물이므로 저장소에 커밋하지 않습니다.

## check:install 흐름

`check:install`은 다음 흐름을 검증합니다.

```sh
npm pack
npm install -D ./mustflow-*.tgz
npx mf init --yes
npx mf check --json
npx mf status --json
npx mf update --dry-run --json
npx mf map --write
```

이 검사는 패키지 내부 `dist/`, `templates/`가 실제 설치 환경에서 함께 동작하는지 확인합니다.

## 실패가 의미하는 것

- `npm pack` 실패: 패키지 메타데이터나 포함 파일 설정을 확인해야 합니다.
- `npm install` 실패: 의존성, 패키지 형식, npm 호환성을 확인해야 합니다.
- `npx mf init` 실패: 배포된 CLI가 템플릿 경로를 찾지 못했을 가능성이 큽니다.
- `check/status/update/map` 실패: 설치 후 생성 파일이나 잠금 파일 흐름이 깨졌을 수 있습니다.
