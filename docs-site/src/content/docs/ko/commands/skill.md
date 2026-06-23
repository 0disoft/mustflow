---
title: mf skill
description: 작업에 맞는 간결한 skill route 후보를 고르는 명령입니다.
---

`mf skill route`는 에이전트와 호스트 통합이 쓰는 읽기 전용 라우팅 사전 단계입니다.

작업 문장, 예상 또는 변경 경로, 분류·검증 이유를 받아 작은 skill route 후보 목록을 점수순으로
반환합니다. resolver는 기본 route source로 펼쳐진 `.mustflow/skills/INDEX.md` 표가 아니라
route metadata와 `SKILL.md` frontmatter를 사용합니다. 에이전트가 어떤 스킬 문서를 읽을지
고르기 위해 거대한 index 전체를 프롬프트에 넣는 일을 줄이기 위한 명령입니다.

JSON 출력에는 `read_plan`도 포함됩니다. 호스트 통합은 이 계획을 사용해
`.mustflow/skills/router.toml`은 stable prefix에 두고, 선택된 `SKILL.md`는 task context에서
읽고, `.mustflow/skills/INDEX.md`는 보고서가 fallback 이유를 제시할 때만 읽는 식으로
프롬프트를 조립할 수 있습니다.

JSON 출력에는 `script_pack_suggestions`도 포함될 수 있습니다. 이 값은 route 입력과 선택된
skill 후보에서 만든 읽기 전용 helper 목록입니다. 스크립트를 실행하지 않고 명령 권한도 주지
않으며, 호출자가 저장소 명령 계약 안에서 검토할 수 있는 선택적 helper만 알려줍니다.

이 명령은 필수 skill-selection gate를 대체하지 않습니다. 에이전트는 여전히 일치하는 파일을
수정하기 전에 선택된 `.mustflow/skills/<name>/SKILL.md`를 읽어야 합니다. 명령 실행 권한은
계속 `.mustflow/config/commands.toml`에서만 옵니다.

프로젝트는 `.mustflow/skills/route-fixtures.json`을 추가해 중요한 routing 기대값을 고정할 수
있습니다. 이 파일이 있으면 `mf check --strict`가 케이스를 다시 실행하고, 선택된 main route,
필수 후보, 선택된 adjunct, 금지 후보가 달라졌을 때 실패합니다.

## 사용법

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change
npx mf skill route --task "review prompt cache token budgets" --path src/cli/lib/agent-context.ts --reason performance_change --json
```

## 선택지

- `--task <text>`: route 점수 계산에 사용할 작업 문장입니다.
- `--path <path>`: 변경되었거나 변경될 경로입니다. 여러 번 사용할 수 있습니다.
- `--reason <reason>`: 분류 또는 검증 이유입니다. 여러 번 사용할 수 있습니다.
- `--max-candidates <count>`: 후보 수 제한입니다. `1`부터 `10`까지 허용하며 기본값은 `5`입니다.
- `--json`: route 보고서를 자동화 도구가 읽기 쉬운 JSON으로 출력합니다.

## JSON 필드

```sh
npx mf skill route --task "change TypeScript CLI output" --path src/cli/index.ts --reason code_change --json
```

자동화 도구가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`string`): 출력 형식 버전입니다.
- `command` (`string`): 항상 `skill`입니다.
- `action` (`string`): 항상 `route`입니다.
- `kind` (`string`): 항상 `skill_route_resolution`입니다.
- `input` (`object`): 정규화된 작업 문장 여부, 경로, 이유, 후보 수 제한입니다.
- `signals` (`object`): 토큰화된 작업·경로 용어, 이유, resolver가 읽은 route metadata와
  frontmatter shard입니다.
- `selected.main` (`object | null`): 가장 높은 점수의 primary 또는 authoring route입니다.
- `selected.adjuncts` (`object[]`): 같은 category에서 호환되는 adjunct route를 최대 두 개까지 보여줍니다.
- `candidates` (`object[]`): 점수 분해와 선택 이유를 포함한 route 후보 목록입니다.
- `read_plan` (`object`): 캐시 친화적인 프롬프트 조립을 위한 stable kernel 파일, 선택된
  skill 경로, 후보 skill 경로, fallback route metadata, expanded-index fallback 규칙,
  기본적으로 피해야 하는 파일, 선택 제한입니다.
- `source_files` (`string[]`): resolver가 사용한 route metadata와 skill frontmatter source입니다.
- `gap_notes` (`string[]`): 호출자가 지켜야 하는 경계입니다.
- `script_pack_suggestions` (`object`, 선택): route 경로와 선택된 skill 후보에서 만든 읽기 전용
  script-pack helper 추천입니다. 이 추천은 스크립트를 실행하지 않고 명령 권한도 주지 않습니다.

공개 JSON Schema는 `schemas/skill-route-report.schema.json`입니다.

## 종료 코드

- `0`: route 후보를 계산했습니다.
- `1`: 입력이 잘못되었습니다.
