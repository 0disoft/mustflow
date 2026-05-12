---
title: mf search
description: 로컬 SQLite 색인에서 mustflow 문서를 검색하는 명령입니다.
---

`mf search`는 `mf index`가 만든 SQLite 색인을 읽습니다.

파일을 만들거나 수정하지 않습니다. 색인이 없다면 먼저 `mf index`를 실행해야 합니다.
색인된 mustflow 파일이 색인 이후 바뀌었다면 검색을 중단하고 색인을 다시 만들라고 안내합니다.
낡은 검색 결과가 에이전트 판단에 조용히 섞이는 일을 막기 위한 안전장치입니다.

검색은 `mf index`가 기록한 검색 방식을 따릅니다. FTS5를 사용할 수 있으면 전문 검색 테이블을 쓰고, 그렇지 않으면 같은 파생 메타데이터를 제한된 테이블 스캔으로 조회합니다. 두 방식 모두 짧은 n-gram 행도 함께 사용하므로, 한국어처럼 공백이나 SQLite 토큰화 방식이 정확히 맞지 않는 검색어도 색인된 용어와 맞을 수 있습니다.

## 검색 범위

기본값으로 이 명령은 mustflow 워크플로 데이터만 검색합니다.

- `AGENTS.md`, `.mustflow/docs/*.md` 같은 색인된 문서
- `.mustflow/skills/*/SKILL.md`에서 가져온 스킬 항목
- `.mustflow/config/commands.toml`에서 가져온 명령 의도

사용자 프로젝트의 임의 소스 파일은 검색하지 않습니다. 다만 `mf index --source`로 색인을 만들었다면
`--scope source`로 구조화된 소스 앵커를 검색할 수 있습니다.

`--scope all`은 워크플로 결과와 소스 앵커 힌트를 함께 보여줍니다. 이때 mustflow는 워크플로 권한과
명령 계약 결과를 소스 앵커보다 위에 둡니다. 소스 앵커는 코드 탐색 힌트일 뿐이며 명령 규칙, 스킬,
워크플로 문서, `AGENTS.md`를 덮어쓸 수 없습니다.

## 사용법

```sh
npx mf index
npx mf index --source
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search "role mapping" --scope source
npx mf search mustflow_check --scope all --json
npx mf search test --limit 5
```

## 선택지

- `--json`: 자동화 도구가 읽기 쉬운 JSON을 출력합니다.
- `--limit <number>`: 반환할 결과 수를 정합니다. 기본값은 `10`, 최대값은 `50`입니다.
- `--scope <workflow|source|all>`: 색인된 워크플로 데이터, 소스 앵커, 또는 둘 다를 선택합니다. 기본값은 `workflow`입니다.

## JSON 필드

```sh
npx mf search mustflow_check --json
```

자동화 도구가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`number`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `search`입니다.
- `ok` (`boolean`): 검색 성공 여부입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `database_path` (`string`): 검색에 사용한 SQLite 파일 경로입니다.
- `query` (`string`): 정규화된 검색어입니다.
- `limit` (`number`): 결과 수 제한입니다.
- `scope` (`string`): 검색 범위입니다. `workflow`, `source`, `all` 중 하나입니다.
- `index_fresh` (`boolean`): 색인이 현재 파일 내용과 일치하는지 나타냅니다.
- `stale_paths` (`string[]`): 색인 이후 바뀐 경로 목록입니다. 성공한 출력에서는 비어 있습니다.
- `search_backend` (`string`): 이 검색에 사용한 검색 방식입니다. `fts5` 또는 `table_scan` 중 하나입니다.
- `search_fts5_available` (`boolean`): 색인을 만들 때 SQLite FTS5 지원을 사용할 수 있었는지 나타냅니다.
- `result_count` (`number`): 반환한 결과 수입니다.
- `results` (`object[]`): 일치한 워크플로 항목과, 요청한 경우 소스 앵커 목록입니다.

각 결과는 다음 필드를 가질 수 있습니다.

- `results[].kind` (`string`): 결과 종류입니다. `document`, `skill`, `skill_route`, `command_intent`, `source_anchor` 중 하나입니다.
- `results[].path` (`string`): 문서 또는 스킬 파일 경로입니다.
- `results[].name` (`string`): 스킬 이름, 명령 의도 이름, 또는 소스 앵커 ID입니다.
- `results[].title` (`string`): 문서 제목입니다.
- `results[].document_type` (`string`): 문서 분류입니다.
- `results[].anchor_id` (`string`): 소스 앵커 ID입니다.
- `results[].line_start` (`number`): 소스 앵커가 시작되는 줄입니다.
- `results[].risk` (`string`): 쉼표로 구분된 소스 앵커 위험 태그입니다.
- `results[].cache_layer` (`string`): 프롬프트 캐시 계층 힌트입니다. `stable`, `task`, `volatile` 중 하나입니다.
- `results[].volatile` (`boolean`): 안정적인 프롬프트 지시문 뒤에 둬야 하는 변동 상태인지 여부입니다.
- `results[].authority_rank` (`number`): 워크플로 결과와 소스 결과를 함께 보여줄 때 쓰는 권한 순서입니다.
- `results[].authority_label` (`string`): `command_contract`, `source_navigation_hint` 같은 권한 분류입니다.
- `results[].source_scope` (`string`): 결과가 워크플로 데이터인지 소스 앵커 데이터인지 나타냅니다.
- `results[].navigation_only` (`boolean`): 결과가 코드 탐색 힌트에만 해당하는지 나타냅니다.
- `results[].can_instruct_agent` (`boolean`): 결과가 워크플로 지시를 담을 수 있는지 나타냅니다.
- `results[].match` (`string`): 검색어와 일치한 문맥 조각입니다.
- `results[].score` (`number`): 검색 결과 정렬에 쓰는 점수입니다.

## 종료 코드

- `0`: 검색을 완료했습니다.
- `1`: 입력이 잘못되었거나, `.mustflow/cache/mustflow.sqlite` 파일이 없거나, 색인이 오래됐습니다.
