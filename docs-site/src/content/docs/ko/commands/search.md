---
title: mf search
description: 로컬 SQLite 색인에서 mustflow 문서를 검색하는 명령입니다.
---

`mf search`는 `mf index`가 만든 SQLite 색인을 읽습니다.

파일을 만들거나 수정하지 않습니다. 색인이 없다면 먼저 `mf index`를 실행해야 합니다.
색인된 mustflow 파일이 색인 이후 바뀌었다면 검색을 중단하고 색인을 다시 만들라고 안내합니다.
낡은 검색 결과가 에이전트 판단에 조용히 섞이는 일을 막기 위한 안전장치입니다.

## 검색 범위

이 명령은 mustflow 워크플로 데이터만 검색합니다.

- `AGENTS.md`, `.mustflow/docs/*.md` 같은 색인된 문서
- `.mustflow/skills/*/SKILL.md`에서 가져온 스킬 항목
- `.mustflow/config/commands.toml`에서 가져온 명령 의도

사용자 프로젝트의 임의 소스 파일은 검색하지 않습니다.

## 사용법

```sh
npx mf index
npx mf search mustflow_check
npx mf search "code review" --json
npx mf search test --limit 5
```

## 선택지

- `--json`: 자동화 도구가 읽기 쉬운 JSON을 출력합니다.
- `--limit <number>`: 반환할 결과 수를 정합니다. 기본값은 `10`, 최대값은 `50`입니다.

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
- `index_fresh` (`boolean`): 색인이 현재 파일 내용과 일치하는지 나타냅니다.
- `stale_paths` (`string[]`): 색인 이후 바뀐 경로 목록입니다. 성공한 출력에서는 비어 있습니다.
- `result_count` (`number`): 반환한 결과 수입니다.
- `results` (`object[]`): 일치한 문서, 스킬, 명령 의도 목록입니다.

각 결과는 다음 필드를 가질 수 있습니다.

- `results[].kind` (`string`): 결과 종류입니다. `document`, `skill`, `command_intent` 중 하나입니다.
- `results[].path` (`string`): 문서 또는 스킬 파일 경로입니다.
- `results[].name` (`string`): 스킬 이름 또는 명령 의도 이름입니다.
- `results[].title` (`string`): 문서 제목입니다.
- `results[].document_type` (`string`): 문서 분류입니다.
- `results[].match` (`string`): 검색어와 일치한 문맥 조각입니다.
- `results[].score` (`number`): 검색 결과 정렬에 쓰는 점수입니다.

## 종료 코드

- `0`: 검색을 완료했습니다.
- `1`: 입력이 잘못되었거나, `.mustflow/cache/mustflow.sqlite` 파일이 없거나, 색인이 오래됐습니다.
