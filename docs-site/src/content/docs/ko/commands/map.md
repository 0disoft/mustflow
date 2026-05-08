---
title: mf map
description: 에이전트 탐색을 위한 저장소 지도(REPO_MAP.md)를 생성하는 명령입니다.
---

`mf map`은 현재 mustflow 루트의 구조를 분석하여 에이전트가 참고할 앵커 파일 기반의 탐색 지도를 생성합니다.

이 명령은 전체 파일 목록을 만들지 않습니다. 자세한 파일 목록이 필요하면 `git ls-files`나 편집기 파일 탐색기를 사용하세요. `mf map`은 `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, 맥락 문서, 핵심 설정 파일처럼 저장소 파악에 중요한 앵커 파일만 골라 보여줍니다.

## 주요 옵션

- `--stdout`: 생성된 지도를 터미널 표준 출력으로 보여줍니다.
- `--write`: 생성된 지도를 `REPO_MAP.md` 파일로 저장합니다.
- `--depth <number>`: 일반 앵커 파일을 검색할 최대 디렉터리 깊이를 지정합니다 (기본값: `3`).
- `--include-nested`: 설정된 작업 공간 루트 아래 독립 저장소를 `Nested Repositories` 섹션에 포함합니다.
- `--root-only`: 설정에서 중첩 저장소 탐색이 켜져 있어도 현재 루트만 대상으로 지도를 생성합니다.

## 포함 대상

다음 파일은 발견되면 지도에 포함될 수 있습니다.

```text
AGENTS.md
.mustflow/config/mustflow.toml
.mustflow/config/commands.toml
.mustflow/config/preferences.toml
.mustflow/context/INDEX.md
.mustflow/context/PROJECT.md
.mustflow/skills/INDEX.md
README.md
DESIGN.md
package.json
pyproject.toml
go.mod
Cargo.toml
deno.json
SKILL.md
justfile
Taskfile.yml
Makefile
Dockerfile
compose.yaml
tsconfig.json
ruff.toml
.golangci.yml
```

## 제외 경로

다음 경로는 기본적으로 제외합니다.

```text
.git
.mustflow/backups
node_modules
dist
build
coverage
cache
.cache
.astro
```

## 예시

```sh
npx mf map --stdout
npx mf map --write
npx mf map --stdout --depth 3
npx mf map --write --include-nested
npx mf map --write --root-only
```

`--write`를 사용하면 루트에 `REPO_MAP.md`를 만들거나 갱신합니다.

생성 결과 상단에는 `anchor_count`, `source_fingerprint`처럼 다시 생성 여부를 판단하는 데 쓰는 안정적인 생성 메타데이터가 붙습니다.
생성 시각, 브랜치명, 원격 저장소 주소, 변경 로그처럼 실행할 때마다 쉽게 달라지는 값은 넣지 않습니다.
`mf check --strict`는 소스 지문이 오래된 경우 `mf map --write`로 다시 생성하라고 알려줍니다.

## 중첩 저장소 처리

`.mustflow/config/mustflow.toml`에서 `map.include_nested = true`, `workspace.enabled = true`를 설정하면 `mf map`은 `workspace.roots` 아래에서 독립 저장소를 찾아 `Nested Repositories` 섹션에 표시합니다.

`--include-nested`는 설정 파일의 `map.include_nested`가 `false`여도 현재 실행에 한해서만 중첩 저장소 탐색을 켭니다. 이 경우에도 임의 경로를 재귀 탐색하지 않고 `workspace.roots`에 정의된 경로만 확인합니다.

`--root-only`는 설정에서 중첩 저장소 탐색이 켜져 있더라도, 현재 실행은 루트 저장소만 보도록 강제합니다. 이 옵션은 `--include-nested`와 함께 쓸 수 없습니다.

중첩 저장소 섹션은 하위 저장소의 내부 파일을 상세히 나열하지 않습니다. 대신 `AGENTS.md`, `REPO_MAP.md`, 명령 계약 파일처럼 작업 시작에 필요한 최소 진입점(Entry points)만 표시합니다.

## 구조화된 출력

`mf map`은 현재 JSON 출력을 지원하지 않습니다.

에이전트는 생성된 마크다운 전체를 색인처럼 파싱하기보다 `Root Anchors`, `Nested Repositories` 섹션의 진입점 경로를 우선 읽는 방식으로 사용해야 합니다.

## 도움말 및 종료 코드

```sh
npx mf map --help
```

도움말 출력은 `Usage`, `Options`, `Examples`, `Exit codes` 순서를 따릅니다.

- 종료 코드 `0`: 지도가 성공적으로 생성되었으며, 요청에 따라 파일 작성이 완료되었습니다.
- 종료 코드 `1`: 유효하지 않은 옵션, 잘못된 `--depth` 값, 또는 상호 호환되지 않는 옵션이 제공되었습니다.

`--stdout`과 `--write` 옵션을 모두 생략할 경우, 기본적으로 생성된 지도를 터미널에 출력합니다.
