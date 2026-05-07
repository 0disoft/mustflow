---
title: mf check
description: 사용자 저장소의 mustflow 문서 흐름을 검사하는 명령입니다.
---

`mf check`는 현재 저장소에 설치된 mustflow 파일들이 에이전트가 읽고 사용할 수 있는 상태인지 확인합니다.
문서 흐름 자체를 바꾼 뒤에는 `--strict`로 더 엄격한 안전 검사를 실행할 수 있습니다.
자동화나 에이전트가 결과를 파싱해야 한다면 `--json`을 사용합니다.

## 검사하는 것

- `AGENTS.md`가 루트에 있는지 확인합니다.
- `.mustflow/config/mustflow.toml`을 읽을 수 있는지 확인합니다.
- `.mustflow/config/commands.toml`을 읽을 수 있는지 확인합니다.
- `.mustflow/config/preferences.toml`이 있으면 읽을 수 있는지 확인합니다.
- `.mustflow/config/mustflow.toml`의 `[map]`, `[workspace]`, `[context]` 필드 타입과 안전한 상대 경로를 확인합니다.
- `.mustflow/config/preferences.toml`이 있으면 언어, 서식, 코드 스타일, 커밋, 문서, 로그 선호값의 기본 타입을 확인합니다.
- `.mustflow/config/manifest.lock.toml`이 있으면 기록된 파일 해시와 현재 파일 내용을 비교합니다.
- `.mustflow/skills/INDEX.md`가 있는지 확인합니다.
- `.mustflow/skills/*/SKILL.md`에 표준 섹션이 있는지 확인합니다.
- `.mustflow/context/*.md`가 있으면 mustflow 문맥 문서로 식별되는지 확인합니다.
- `commands.toml`에서 `status = "configured"`인 명령 의도가 실행 정보, 생명주기, 실행 정책, 제한 시간을 갖고 있는지 확인합니다.
- 장기 실행 생명주기가 `run_policy = "agent_allowed"`로 열려 있지 않은지 확인합니다.

## 엄격 검사

```sh
npx mf check --strict
```

`--strict`는 기본 검사에 더해 에이전트 입력 안정성과 실행 안전성에 가까운 항목을 확인합니다.

- 스킬 문서 안에 `sh`, `bash`, `powershell` 같은 원시 셸 코드 블록이 있는지 확인합니다.
- `.mustflow/skills/<name>/` 아래에 `SKILL.md` 없이 보조 파일만 있는 스킬 폴더가 있는지 확인합니다.
- 스킬의 `resources.toml`이 있으면 등록된 보조 파일이 실제로 존재하고, `references/`, `assets/`, `scripts/` 아래에 있는지 확인합니다.
- 등록되지 않은 `.mustflow/skills/<name>/scripts/` 파일이 있는지 확인합니다.
- 스킬 스크립트 자원이 `run_policy = "requires_command_contract"`와 `command_intent`를 선언하고, 그 의도가 `commands.toml`에 설정되어 있는지 확인합니다.
- 스킬 스크립트 자원이 기본값으로 네트워크 사용, 파괴적 작업, 스킬 폴더 밖 파일 쓰기를 열어두지 않았는지 확인합니다.
- `REPO_MAP.md`에 생성 시각, 최근 갱신 시각, 파일 수, 변경 파일 수처럼 자주 바뀌는 메타데이터가 있는지 확인합니다.
- `REPO_MAP.md`에 원격 저장소 주소나 브랜치 정보처럼 민감하거나 현재 작업 루트와 어긋날 수 있는 메타데이터가 있는지 확인합니다.
- `commands.toml`의 `[defaults].max_output_bytes`와 `[defaults].on_timeout`이 있는지 확인합니다.
- `mustflow.toml`에 `[retention]` 보존 정책이 있는지 확인합니다.
- `REPO_MAP.md`와 `.mustflow/state/runs/latest.json`이 보존 정책의 크기 상한을 넘는지 확인합니다.
- `.mustflow/context/*.md`가 `[retention.context].max_file_kb` 상한을 넘는지 확인합니다.
- `.mustflow/context/*.md`에 로컬 절대 경로, 비밀정보처럼 보이는 키/값, `DESIGN.md`와 중복되는 디자인 토큰 정의가 있는지 확인합니다.
- `.mustflow/knowledge/**`가 있으면 파일 크기 상한을 넘는지 확인합니다.
- `.mustflow/**` 안에 원시 JSONL 로그가 있는지 확인합니다.
- `.mustflow/state/runs/latest.json`이 있으면 JSON 객체로 읽을 수 있는지 확인합니다.

엄격 검사는 일반 사용 흐름을 복잡하게 만들지 않기 위해 선택 사항입니다. mustflow 문서,
스킬, 명령 계약, 저장소 지도 생성 규칙을 바꾼 뒤에 실행하는 것을 권장합니다.

## 설정 검사 기준

`mf check`는 `[map]`, `[workspace]`, `[context]`를 느슨한 기본값 기반 설정으로 다루되, 위험하거나 해석하기 어려운 값은 실패로 보고합니다.
`manifest.lock.toml`은 기존 설치본 호환을 위해 없다고 바로 실패시키지는 않습니다. 하지만 파일이 있으면 기록된 파일이 사라졌거나 해시가 달라진 경우 실패로 보고합니다.

- `map.output`: 비어 있지 않은 상대 경로여야 합니다.
- `map.mode`: 현재는 `anchors_only`만 허용합니다.
- `map.privacy`: 현재는 `minimal`만 허용합니다.
- `map.include_nested`: 참/거짓 값이어야 합니다.
- `map.anchor_files`: 비어 있지 않은 상대 경로 배열이어야 합니다.
- `workspace.roots`: 현재 루트 안쪽의 상대 경로 배열이어야 합니다.
- `workspace.max_depth`, `workspace.max_repositories`: 양의 정수여야 합니다.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: 참/거짓 값이어야 합니다.
- `context.root`, `context.index`, `context.default_files`, `context.external_anchors`: 비어 있지 않은 상대 경로를 사용해야 합니다.
- `context.read_policy`: 현재는 `task_relevant_only`만 허용합니다.
- `context.authority`: 현재는 `contextual`만 허용합니다.
- `preferences.toml`의 주요 선호값은 문자열이어야 합니다.
- `preferences.toml`의 자동 커밋, 민감정보 포함, 무관한 리팩터링 회피 설정은 참/거짓 값이어야 합니다.
- `preferences.toml`의 `docs.update_when`은 문자열 배열이어야 합니다.
- `commands.toml`의 실행 가능한 의도는 `lifecycle`, `run_policy`, `timeout_seconds`, `stdin`을 명확히 가져야 합니다.
- `lifecycle = "oneshot"`인 의도는 `timeout_seconds`와 `stdin = "closed"`가 필요합니다.
- `server`, `watch`, `interactive`, `browser`, `background` 의도는 에이전트 기본 실행 대상으로 열면 안 됩니다.

## 표준 스킬 섹션

스킬 문서는 다음 섹션을 포함해야 합니다.

```text
## 목적
## 사용 조건
## 사용하지 않는 경우
## 필요한 입력
## 절차
## 검증
## 실패 대응
## 출력 형식
```

## 예시

```sh
npx mf check
```

성공하면 다음처럼 보고합니다.

```text
mustflow check passed
```

실패하면 빠진 파일이나 섹션을 표준 오류로 출력하고 종료 코드 `1`로 끝납니다.

## JSON 필드

```sh
npx mf check --json
```

기계가 읽는 출력은 다음 필드를 사용합니다.

- `ok` (`boolean`): 모든 검사를 통과했는지 나타냅니다.
- `strict` (`boolean`): `--strict` 검사를 함께 실행했는지 나타냅니다.
- `issueCount` (`number`): 발견한 문제 수입니다.
- `issues` (`string[]`): 사람이 읽을 수 있는 문제 설명 목록입니다.

문제가 있으면 JSON 출력에서도 종료 코드 `1`로 끝납니다.

## 도움말과 종료 코드

```sh
npx mf check --help
```

도움말은 `Usage`, `Options`, `Examples`, `Exit codes` 순서로 출력됩니다.

- 종료 코드 `0`: 모든 필수 파일과 설정이 유효합니다.
- 종료 코드 `1`: 검증 문제가 있거나 알 수 없는 선택지를 받은 상태입니다.

에이전트나 자동화는 사람용 성공/실패 문장을 파싱하지 말고 `--json` 출력의 `ok`, `issues` 값을 읽어야 합니다.
