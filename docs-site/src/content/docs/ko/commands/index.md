---
title: mf index
description: mustflow 문서 흐름을 로컬 SQLite 색인으로 만드는 명령입니다.
---

`mf index`는 현재 mustflow 루트의 문서 흐름을 기반으로 재생성 가능한 SQLite 색인을 구축합니다.

기준 원본(Source of Truth)은 디스크에 있는 실제 파일입니다. 색인은 `mf search`와 향후 저장소 지도, 대시보드 기능에서 mustflow 문서를 빠르게 조회하기 위한 캐시 역할을 합니다.

## 색인 대상

- `AGENTS.md`
- `.mustflow/docs/*.md`
- `.mustflow/skills/INDEX.md`
- `.mustflow/skills/*/SKILL.md`
- `.mustflow/config/*.toml`
- `.mustflow/config/commands.toml`의 명령 의도

이 명령은 프로젝트 일반 소스 코드를 색인하지 않습니다. 범위는 mustflow 워크플로 관련 파일로만 제한됩니다.

## 출력 파일

```text
.mustflow/cache/mustflow.sqlite
```

이 파일은 명령 실행 시 자동으로 생성됩니다. 필요하면 지워도 되고, 언제든 다시 만들 수 있습니다.
색인에는 각 파일 내용의 해시가 들어 있어 `mf search` 실행 시 캐시 유효성을 자동으로 확인할 수 있습니다.

## 드라이런 (Dry Run)

```sh
npx mf index --dry-run --json
```

드라이런 모드에서는 색인 대상과 항목 수만 계산해 보여주고, 실제 SQLite 파일은 만들지 않습니다.

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
- `document_count` (`number`): 색인한 mustflow 문서와 설정 파일 수입니다.
- `skill_count` (`number`): 색인한 스킬 문서 수입니다.
- `command_intent_count` (`number`): 색인한 명령 의도 수입니다.
- `indexed_paths` (`string[]`): 문서 색인에 포함된 파일 경로 목록입니다.

## 도움말 및 종료 코드

- `0`: 색인 대상 계산 및 파일 작성이 성공적으로 완료되었습니다.
- `1`: 유효하지 않은 옵션이 제공되었거나 색인 생성에 실패했습니다.
