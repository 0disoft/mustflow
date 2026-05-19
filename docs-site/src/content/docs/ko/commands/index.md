---
title: mf index
description: mustflow 문서 흐름을 로컬 SQLite 색인으로 만드는 명령입니다.
---

`mf index`는 현재 mustflow 루트의 문서 흐름을 기반으로 재생성 가능한 SQLite 색인을 구축합니다.

기준 원본(Source of Truth)은 디스크에 있는 실제 파일입니다. 색인은 `mf search`와 향후 저장소 지도, 대시보드 기능에서 mustflow 문서를 빠르게 조회하기 위한 캐시 역할을 합니다.

`--source`를 사용하면 구조화된 소스 코드 앵커도 포함할 수 있습니다. 소스 색인은 `.mustflow/config/index.toml`에서 명시적으로 켜지 않는 한 선택 사항이며, 소스 본문 전체가 아니라 앵커 메타데이터만 저장합니다.

## 색인 대상

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- `.mustflow/config/commands.toml`의 명령 의도
- `--source`가 제공되었거나 `.mustflow/config/index.toml`에서 켠 경우에만 구조화된 소스 코드 앵커

기본 명령은 프로젝트 일반 소스 코드를 색인하지 않습니다. 범위는 mustflow 워크플로 관련 파일로만 제한됩니다. `--source`를 사용하거나 소스 색인 설정을 명시하면 소스 파일에서 구조화된 `mf:anchor` 주석을 찾고, 식별자, 경로, 줄, 목적, 검색어, 불변조건, 위험 같은 앵커 필드만 기록합니다.

## 출력 파일

```text
.mustflow/cache/mustflow.sqlite
```

이 파일은 명령 실행 시 자동으로 생성됩니다. 필요하면 지워도 되고, 언제든 다시 만들 수 있습니다.
색인에는 각 파일 내용의 해시가 들어 있어 `mf search` 실행 시 캐시 유효성을 자동으로 확인할 수 있습니다.
또한 `indexed_files` 테이블에 경로, 출처 범위, 파일 크기, 수정 시각, 내용 해시, 색인 시각, 색인 모드, 파서 버전을 기록합니다. 이 테이블에는 색인된 워크플로 파일, 선택적으로 포함된 소스 앵커 파일, 그리고 최신 실행 증거 파일이 있을 때 그 파일의 제한된 읽기 모델 입력도 포함됩니다. 증분 색인 실행은 이 정보를 보고 기존 캐시를 안전하게 재사용할 수 있는지 판단합니다.

SQLite 런타임이 FTS5를 지원하면 `mf index`는 더 빠른 토큰 검색을 위한 파생 전문 검색 테이블을 기록합니다. FTS5를 사용할 수 없어도 같은 기본 테이블과 제한된 테이블 스캔으로 검색할 수 있습니다. 두 방식 모두 검색 가능한 메타데이터에서 짧은 n-gram 행을 함께 저장해, 공백이나 토큰화 방식이 다른 다국어 검색어도 색인된 용어와 맞을 수 있게 합니다. n-gram 생성은 색인 대상마다 제한됩니다. 각 토큰의 앞 64자만 사용하고, 한 대상에는 최대 512개의 n-gram 행만 기록합니다.

## 드라이런 (Dry Run)

```sh
npx mf index --dry-run --json
```

드라이런 모드에서는 색인 대상과 항목 수만 계산해 보여주고, 실제 SQLite 파일은 만들지 않습니다.

## 증분 모드

```sh
npx mf index --incremental --json
```

기본 `mf index`는 전체 색인을 다시 만듭니다. 증분 모드는 먼저 기존 `.mustflow/cache/mustflow.sqlite` 파일을 확인합니다. 소스 앵커 색인이 꺼져 있으면, 저장된 파일 크기와 수정 시각을 현재 워크플로 파일 및 최신 실행 증거 파일과 비교하는 가벼운 사전 검사만으로 호환되는 SQLite 파일을 재사용할 수 있습니다. 이 사전 검사로 재사용을 증명할 수 없거나 소스 앵커 색인이 켜져 있으면 전체 파일 지문 검사로 돌아갑니다. 색인된 워크플로 파일이나 최신 실행 증거 파일이 바뀌었거나, 삭제되었거나, 새로 추가되었거나, 소스 앵커 범위가 달라졌으면 전체 재생성으로 돌아갑니다.

## 소스 앵커

```sh
npx mf index --source --json
```

소스 앵커 색인은 탐색 전용입니다. 생성되는 `source_anchors`, `source_anchor_fingerprints`, `source_anchor_status` 테이블은 작업 규칙, 명령 권한, 검증 권한을 정의할 수 없습니다.
지문과 상태 행은 나중에 앵커가 여전히 의도한 코드를 가리키는지 설명하기 위한 파생 검색 메타데이터입니다.
이전 로컬 SQLite 색인이 있으면 `mf index --source`는 새 앵커 지문을 이전 스냅샷과 비교해 `valid`, `moved`, `changed`, `review`, `stale` 같은 상태를 기록합니다.
고위험 앵커는 보수적으로 처리합니다. 본문, 시그니처, 검색어, 불변조건, 메타데이터가 바뀌면 자동으로 유효하다고 보지 않고 검토 대상으로 표시합니다.
잘못된 앵커는 소스 앵커 테이블에 저장하지 않습니다. 형식이 틀린 앵커, 중복 식별자, 금지된 지시문, 비밀값처럼 보이는 텍스트, 생성물이나 외부 의존성 경로, 알 수 없는 위험 태그는 `mf check --strict`에서 보고합니다.
가까운 함수, 클래스, 메서드, 상수를 감지할 수 있으면 지문 테이블은 종류, 이름, 시그니처 해시, 본문 해시 같은 파생 심볼 메타데이터도 저장합니다.

## 소스 스캔 설정

`.mustflow/config/index.toml`은 워크플로 정책이나 명령 권한을 바꾸지 않고 소스 앵커 스캔 범위만 좁힐 수 있습니다.

```toml
[source_index]
enabled_by_default = false
include = ["src/**/*.ts", "packages/*/src/**/*.ts"]
exclude = ["**/*.generated.ts", "**/__fixtures__/**"]
max_file_bytes = 262144
allowed_extensions = [".ts", ".tsx", ".js", ".py", ".rs", ".go"]
```

`enabled_by_default = true`를 설정하면 `--source` 없이도 `mf index`가 소스 앵커를 포함합니다. 포함·제외 패턴은 스캔 범위만 제한합니다. 생성물, 외부 의존성, 벤더 경로는 포함 패턴에 맞더라도 로컬 소스 색인에서 계속 제외됩니다. 소스 파일은 기본적으로 262144바이트까지만 읽으며, `max_file_bytes`는 이 한도를 낮출 수 있지만 높일 수는 없습니다.

## JSON 필드

```sh
npx mf index --json
```

자동화 도구용 출력에는 다음 필드가 포함됩니다.

- `schema_version` (`number`): 출력 형식의 스키마 버전입니다.
- `command` (`string`): 항상 `index` 값입니다.
- `ok` (`boolean`): 색인 생성 성공 여부입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `database_path` (`string`): 대상 SQLite 파일 경로입니다.
- `dry_run` (`boolean`): 파일 쓰기를 끈 상태인지 나타냅니다.
- `wrote_files` (`boolean`): SQLite 파일을 썼는지 나타냅니다.
- `index_mode` (`string`): 기본 전체 재생성 경로에서는 `full`, `--incremental`을 요청한 경우에는 `incremental`입니다.
- `reused_existing` (`boolean`): 증분 모드가 기존 SQLite 파일을 재사용했는지 나타냅니다.
- `rebuild_reason` (`string | null`): 증분 모드가 기존 파일을 재사용하지 않고 다시 만든 이유입니다.
- `document_count` (`number`): 색인한 mustflow 문서와 설정 파일 수입니다.
- `skill_count` (`number`): 색인한 스킬 문서 수입니다.
- `skill_route_count` (`number`): `.mustflow/skills/INDEX.md`에서 색인한 스킬 라우트 행 수입니다.
- `command_intent_count` (`number`): 색인한 명령 의도 수입니다.
- `command_effect_count` (`number`): `effects` 또는 `writes`에서 파생해 색인한 명령 효과 행 수입니다.
- `source_index_enabled` (`boolean`): `--source` 또는 로컬 색인 설정으로 소스 앵커 색인이 켜졌는지 나타냅니다.
- `source_anchor_count` (`number`): 색인한 구조화된 소스 앵커 수입니다.
- `search_backend` (`string`): 이 색인에 선택된 검색 방식입니다. `fts5` 또는 `table_scan` 중 하나입니다.
- `search_fts5_available` (`boolean`): 색인을 만들 때 SQLite 실행 환경이 FTS5 지원을 보고했는지 나타냅니다.
- `content_mode` (`string`): 저장할 본문 정책입니다. 현재 값은 `metadata_and_snippets`입니다.
- `store_full_content` (`boolean`): 로컬 색인 읽기 모델에서는 항상 `false`입니다.
- `max_snippet_bytes_per_document` (`number`): 문서마다 저장할 수 있는 짧은 발췌의 최대 바이트 수입니다.
- `excluded_raw_data_kinds` (`string[]`): SQLite 색인이 저장하면 안 되는 원본 데이터 종류입니다.
- `indexed_file_count` (`number`): `indexed_files`에 기록된 파일 지문 수입니다.
- `indexed_paths` (`string[]`): 문서 색인에 포함된 파일 경로 목록입니다.

## 도움말 및 종료 코드

- `0`: 색인 대상 계산 및 파일 작성이 성공적으로 완료되었습니다.
- `1`: 유효하지 않은 옵션이 제공되었거나 색인 생성에 실패했습니다.
