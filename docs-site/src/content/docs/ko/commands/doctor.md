---
title: mf doctor
description: 현재 mustflow 루트를 읽기 전용으로 진단하는 명령입니다.
---

`mf doctor`는 현재 mustflow 루트의 상태를 빠르게 요약합니다.
`mf check`와 `mf context`에서 에이전트에게 특히 필요한 부분을 모아 보여주고, 이어서 실행할 수 있는 안전한 다음 단계를 제안합니다.

이 명령은 파일을 쓰지 않습니다. 에이전트나 사람이 무언가를 수정하기 전에 첫 방향을 잡아야 할 때 사용합니다.

## 확인하는 것

- 현재 mustflow 루트입니다.
- `AGENTS.md`와 `.mustflow/` 존재 여부입니다.
- `mf check` 기준 검사 결과입니다.
- `manifest.lock.toml` 상태입니다.
- 잠금 파일에 기록된 템플릿 식별자와 판 번호입니다.
- `.mustflow/config/commands.toml`이 있고 실행 가능한 끝나는 명령 의도를 제공하는지 여부입니다.
- `mustflow.toml`의 필수 읽기 순서와 선택 읽기 순서 중 빠진 경로입니다.
- `REPO_MAP.md` 생성 여부입니다.
- `.mustflow/cache/mustflow.sqlite` 로컬 색인 생성 여부입니다.
- 마지막 `mf run` 실행 영수증 존재 여부입니다.
- 상태 점검 항목과 이어서 실행하기 좋은 명령 목록입니다.

## 예시

```sh
npx mf doctor
```

출력 예시는 다음과 같습니다.

```text
mustflow doctor
mustflow root: /path/to/project
Installed: yes
Strict: no
Check: passed
Issues: 0
Command contract: present
Runnable intents: 3

Health:
- [ok] Install: installed
- [ok] Validation: 0 issues
- [ok] Command contract: present, 3 runnable intents
- [ok] Read order: all required files present
- [info] REPO_MAP.md: not generated (run: mf map --write)
- [info] Local index: not generated (run: mf index)
- [info] Latest run: no run receipt yet (run: mf run <intent>)

Suggested commands:
- mf help workflow
- mf help commands
- mf context --json
- mf check --strict
- mf map --write
- mf index
- mf run <intent>

No files were written.
```

## JSON 필드

```sh
npx mf doctor --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `schema_version` (`number`): 출력 형식 판 번호입니다.
- `command` (`string`): 항상 `doctor`입니다.
- `mustflow_root` (`string`): 현재 mustflow 루트입니다.
- `installed` (`boolean`): `AGENTS.md`와 `.mustflow/`가 있는지 나타냅니다.
- `strict` (`boolean`): `--strict` 검사를 함께 실행했는지 나타냅니다.
- `ok` (`boolean`): 설치가 있고 검사가 통과했는지 나타냅니다.
- `check` (`object`): `mf check` 기준 검증 결과입니다.
- `context` (`object`): 에이전트 시작에 필요한 주요 문맥 상태입니다.
- `diagnostics` (`object[]`): 설치, 검증, 명령 계약, 읽기 순서, 저장소 지도, 로컬 색인, 최근 실행을 항목별로 판정한 목록입니다.
- `next_steps` (`string[]`): 에이전트가 추측 없이 이어서 실행할 수 있는 명령입니다.

중첩 객체는 다음 필드를 가집니다.

- `check.ok` (`boolean`): 검증 통과 여부입니다.
- `check.issue_count` (`number`): 검증 문제 수입니다.
- `check.issues` (`string[]`): 검증 문제 설명 목록입니다.
- `context.manifest_lock` (`string`): 잠금 파일 상태입니다. `present`, `missing`, `invalid` 중 하나입니다.
- `context.template` (`object | null`): 알 수 있는 경우 템플릿 식별자와 판 번호입니다.
- `context.command_contract_exists` (`boolean`): `commands.toml`이 있는지 나타냅니다.
- `context.runnable_intents` (`string[]`): 에이전트가 실행할 수 있는 설정된 끝나는 명령 의도 이름입니다.
- `context.missing_read_order` (`string[]`): 필수 읽기 순서 중 빠진 파일입니다.
- `context.missing_optional_read_order` (`string[]`): 선택 읽기 순서 중 빠진 파일입니다.
- `context.latest_run_exists` (`boolean`): 마지막 실행 영수증이 있는지 나타냅니다.
- `diagnostics[].id` (`string`): 진단 항목 이름입니다.
- `diagnostics[].status` (`string`): 진단 상태입니다. `ok`, `warn`, `fail`, `info` 중 하나입니다.
- `diagnostics[].summary` (`string`): 사람이 읽을 수 있는 짧은 상태 설명입니다.
- `diagnostics[].action` (`string | null`): 이어서 실행할 수 있는 명령입니다.

## 엄격 모드

```sh
npx mf doctor --strict --json
```

엄격 모드는 `mf check --strict`와 같은 추가 검사를 사용합니다.
mustflow 문서, 스킬, 명령 계약, 보존 설정, 저장소 지도 생성 방식을 바꾼 뒤에 사용합니다.

## 종료 코드

- `0`: 루트를 확인했고 문제가 없습니다.
- `1`: 검증 문제가 있거나, 설치가 없거나, 알 수 없는 선택지를 받은 상태입니다.

에이전트나 자동화는 사람용 요약 문장을 파싱하지 말고 `--json` 출력의 `ok`, `check.issues`, `diagnostics`, `next_steps`를 읽어야 합니다.
