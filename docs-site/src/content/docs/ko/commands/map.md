---
title: mf map
description: 에이전트가 참고할 현재 mustflow 루트의 앵커 파일 기반 지도인 REPO_MAP.md를 생성하는 명령입니다.
---

`mf map`은 현재 mustflow 루트의 구조를 읽어 에이전트용 앵커 파일 기반 탐색 지도를 만듭니다.

이 명령은 전체 파일 목록을 만들지 않습니다. 전체 목록은 `git ls-files`나 편집기 파일 탐색기가 더 적합합니다. `mf map`은 `AGENTS.md`, `README.md`, `DESIGN.md`, `package.json`, `SKILL.md`, 문맥 파일, 주요 설정 파일처럼 저장소 탐색에 도움이 되는 앵커만 골라서 보여줍니다.

## 옵션

- `--stdout`: 생성한 지도를 터미널에 출력합니다.
- `--write`: 생성한 지도를 `REPO_MAP.md`에 씁니다.
- `--depth <number>`: 우선 앵커가 아닌 앵커 파일을 몇 단계 깊이까지 찾을지 지정합니다. 기본값은 `3`입니다.
- `--include-nested`: 설정된 작업대 루트 아래의 하위 독립 저장소를 `Nested Repositories` 섹션에 포함합니다.
- `--root-only`: 설정에서 중첩 저장소 탐색이 켜져 있어도 현재 루트만 대상으로 지도를 만듭니다.

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

`--write`를 사용하면 루트에 `REPO_MAP.md`를 생성하거나 갱신합니다.

생성 결과 상단에는 생성 시각, 해시, 파일 수처럼 자주 바뀌는 값을 넣지 않습니다.

## 중첩 저장소

`.mustflow/config/mustflow.toml`에서 `map.include_nested = true`와 `workspace.enabled = true`를 함께 설정하면, `mf map`은 설정된 `workspace.roots` 아래의 독립 저장소를 찾아 `Nested Repositories` 섹션에 표시합니다.

`--include-nested`는 설정의 `map.include_nested` 값이 `false`여도 이번 실행에서만 중첩 저장소 섹션을 켭니다. 이때도 아무 경로나 재귀 탐색하지 않고, `workspace.roots`에 선언된 경로만 확인합니다.

`--root-only`는 설정에서 중첩 저장소 탐색이 켜져 있어도 이번 실행에서만 현재 루트만 보도록 강제합니다. 두 옵션은 서로 반대 의미이므로 함께 사용할 수 없습니다.

이 섹션은 하위 저장소의 내부 파일을 나열하지 않습니다. `AGENTS.md`, `REPO_MAP.md`, `.mustflow/config/commands.toml`, `.mustflow/context/INDEX.md`, `DESIGN.md`, 주요 매니페스트 파일처럼 하위 저장소로 들어가기 위한 진입점만 표시합니다.

## 구조화된 출력

`mf map`은 현재 JSON 출력 형식을 제공하지 않습니다.

에이전트는 생성된 Markdown의 전체 파일 목록을 색인처럼 파싱하지 말고, `Root Anchors`와 `Nested Repositories` 섹션의 진입점 경로를 우선 읽는 방식으로 사용해야 합니다.

## 도움말과 종료 코드

```sh
npx mf map --help
```

도움말은 `Usage`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.

- 종료 코드 `0`: 지도를 생성했고, 요청한 경우 `REPO_MAP.md`에 썼습니다.
- 종료 코드 `1`: 알 수 없는 선택지, 잘못된 `--depth` 값, 또는 함께 쓸 수 없는 중첩 저장소 선택지를 받은 상태입니다.

`--stdout`과 `--write`를 모두 생략하면 기본적으로 터미널에 지도를 출력합니다.
