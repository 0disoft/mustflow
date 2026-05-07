---
title: mf index
description: mustflow 문서 흐름을 로컬 SQLite 색인으로 만드는 명령입니다.
---

`mf index`는 현재 mustflow 루트의 문서 흐름을 재생성 가능한 SQLite 색인으로 만듭니다.

기준 원본은 계속 디스크의 파일입니다. 색인은 `mf search`와 후속 저장소 지도, 대시보드 기능이 mustflow 문서를 빠르게 읽도록 돕는 캐시입니다.

## 색인 대상

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- `.mustflow/config/commands.toml`의 명령 의도

이 명령은 사용자 프로젝트의 임의 소스 파일을 색인하지 않습니다. mustflow 작업 흐름 파일로 범위를 제한합니다.

## 출력 파일

```text
.mustflow/cache/mustflow.sqlite
```

이 파일은 생성물입니다. 삭제해도 다시 만들 수 있어야 합니다.
색인에는 색인 대상 파일의 내용 해시도 저장합니다. 그래서 `mf search`가 오래된 캐시를 감지할 수 있습니다.

## 드라이런

```sh
npx mf index --dry-run --json
```

드라이런은 색인 대상을 계산하고 개수를 출력하지만 SQLite 파일을 쓰지 않습니다.

## JSON 필드

```sh
npx mf index --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`number`): 출력 형식 판 번호입니다.
- `command` (`string`): 항상 `index`입니다.
- `ok` (`boolean`): 색인 생성 성공 여부입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `database_path` (`string`): 대상 SQLite 파일 경로입니다.
- `dry_run` (`boolean`): 파일 쓰기를 비활성화했는지 나타냅니다.
- `wrote_files` (`boolean`): SQLite 파일을 썼는지 나타냅니다.
- `document_count` (`number`): 색인한 mustflow 문서와 설정 파일 수입니다.
- `skill_count` (`number`): 색인한 스킬 문서 수입니다.
- `command_intent_count` (`number`): 색인한 명령 의도 수입니다.
- `indexed_paths` (`string[]`): 문서 색인에 들어간 경로 목록입니다.

## 종료 코드

- `0`: 색인 대상을 계산했고 선택적으로 파일을 썼습니다.
- `1`: 알 수 없는 선택지를 받았거나 색인 생성에 실패했습니다.
