---
title: mf check
description: 사용자 저장소에 설치된 mustflow 워크플로 구성을 점검하는 명령입니다.
---

`mf check`는 현재 저장소의 mustflow 파일을 에이전트가 문제없이 읽고 사용할 수 있는지 확인합니다.
워크플로 구성을 바꾼 뒤에는 `--strict` 옵션으로 안전 점검을 더 강하게 수행할 수 있습니다.
자동화 도구나 에이전트가 결과를 읽어야 한다면 `--json` 옵션을 사용하세요.

## 검증 기준

- 저장소 루트에 `AGENTS.md`가 있는지 확인합니다.
- `.mustflow/config/mustflow.toml`, `commands.toml` 파일이 유효하고 읽을 수 있는 형식인지 확인합니다.
- `.mustflow/config/preferences.toml`이 있으면, 해당 파일도 정상적으로 읽을 수 있는지 확인합니다.
- `mustflow.toml`의 `[map]`, `[workspace]`, `[context]` 항목에서 자료형과 상대 경로 안전성을 검사합니다.
- `preferences.toml`이 있으면 언어, 서식, 코드 스타일 등 설정값의 자료형을 검사합니다.
- `manifest.lock.toml`이 있으면 기록된 해시와 실제 파일 내용을 비교해 일치 여부를 확인합니다.
- `.mustflow/skills/INDEX.md`가 있는지 확인합니다.
- 모든 스킬 문서(`.mustflow/skills/*/SKILL.md`)에 필수 표준 섹션이 있는지 검사합니다.
- 프로젝트 맥락 문서(`.mustflow/context/*.md`)가 mustflow 규격에 맞는지 확인합니다.
- `status = "configured"`인 명령 의도에 필수 실행 정보(생명주기, 정책, 제한시간 등)가 있는지 확인합니다.
- 장기 실행 명령(long-running)이 `run_policy = "agent_allowed"`로 열려 있지 않은지 확인합니다.

## 엄격 검사

```sh
npx mf check --strict
```

`--strict`는 기본 검사에 더해, 에이전트 입력 안정성과 실행 안전성에 직접 영향을 주는 항목을 추가로 점검합니다.

- 스킬 문서에 `sh`, `bash`, `powershell` 같은 원시 셸 코드 블록이 있는지 확인합니다.
- `.mustflow/skills/<name>/` 아래에 `SKILL.md` 없이 보조 파일만 있는 폴더가 있는지 점검합니다.
- `resources.toml`에 등록한 자원이 실제 경로(`references/`, `assets/`, `scripts/`)에 있는지 확인합니다.
- `.mustflow/skills/<name>/scripts/` 아래에 등록되지 않은 파일이 있는지 확인합니다.
- 스크립트 자원이 `run_policy = "requires_command_contract"`를 지키고, 연결된 의도가 `commands.toml`에 정의되어 있는지 확인합니다.
- 스크립트 자원이 네트워크 접근, 파괴적 작업, 폴더 밖 쓰기 권한을 기본으로 열어두지 않았는지 검사합니다.
- `REPO_MAP.md`에 생성 시각, 파일 수처럼 입력 안정성을 해칠 수 있는 가변 메타데이터가 들어갔는지 확인합니다.
- `REPO_MAP.md`에 원격 저장소 주소, 브랜치 정보 같은 민감 정보가 노출되지 않았는지 확인합니다.
- `commands.toml`에 `max_output_bytes`, `on_timeout` 설정이 있는지 확인합니다.
- `mustflow.toml`에 `[retention]` 보존 정책이 정의되어 있는지 확인합니다.
- 생성 파일(`REPO_MAP.md`, `latest.json` 등)이 보존 크기 제한을 지키는지 확인합니다.
- `.mustflow/context/*.md`가 크기 제한을 넘기거나 절대 경로, 민감한 키/값, 중복된 디자인 토큰 등을 담고 있지 않은지 검사합니다.
- `.mustflow/knowledge/**` 파일이 크기 제한을 지키는지 확인합니다.
- `.mustflow/**` 경로에 원시 JSONL 로그가 그대로 노출되지 않았는지 확인합니다.
- `.mustflow/state/runs/latest.json`의 JSON 구조가 유효한지 확인합니다.

엄격 검사는 워크플로를 가볍게 유지하기 위해 선택 항목으로 제공됩니다. mustflow 문서, 스킬, 명령 계약, 저장소 지도 생성 규칙을 변경한 뒤 실행하는 것을 권장합니다.

## 설정 검사 기준

`mf check`는 `[map]`, `[workspace]`, `[context]` 설정을 유연하게 해석하되, 보안상 위험하거나 의미가 모호한 값은 실패로 처리합니다.
`manifest.lock.toml`이 없으면 기존 설치 환경과의 호환성을 위해 경고 없이 통과합니다. 반대로 파일이 있으면, 기록된 파일 누락이나 해시 불일치를 엄격하게 검사합니다.

- `map.output`: 비어 있지 않은 유효한 상대 경로여야 합니다.
- `map.mode`: 현재는 `anchors_only` 모드만 지원합니다.
- `map.privacy`: 현재는 `minimal` 수준만 지원합니다.
- `map.include_nested`: 불리언(Boolean) 값이어야 합니다.
- `map.anchor_files`: 비어 있지 않은 상대 경로 문자열의 배열이어야 합니다.
- `workspace.roots`: 현재 루트 내부의 유효한 상대 경로 배열이어야 합니다.
- `workspace.max_depth`, `workspace.max_repositories`: 양의 정수여야 합니다.
- `workspace.follow_symlinks`, `workspace.stop_at_repository_root`: 불리언 값이어야 합니다.
- `context.root`, `context.index` 등: 비어 있지 않은 유효한 상대 경로를 사용해야 합니다.
- `context.read_policy`: 현재는 `task_relevant_only`만 지원합니다.
- `context.authority`: 현재는 `contextual`만 지원합니다.
- `preferences.toml` 내 주요 설정값: 유효한 문자열이어야 합니다.
- 자동 커밋, 민감 정보 포함 설정 등: 불리언 값이어야 합니다.
- `docs.update_when`: 문자열 배열 형태여야 합니다.
- 실행 가능한 명령 의도: `lifecycle`, `run_policy`, `timeout_seconds`, `stdin` 항목을 반드시 포함해야 합니다.
- `lifecycle = "oneshot"` 의도: `timeout_seconds` 설정 및 `stdin = "closed"` 상태가 필수입니다.
- 장기 실행 의도(`server`, `watch` 등): 에이전트가 직접 실행 가능한 명령으로 노출되면 안 됩니다.

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
- `issueCount` (`number`): 발견된 문제의 총 개수입니다.
- `issues` (`string[]`): 사용자 가독성을 위한 문제 설명 목록입니다.

문제가 발견될 경우 JSON 출력 모드에서도 종료 코드 `1`을 반환합니다.

## 도움말 및 종료 코드

```sh
npx mf check --help
```

도움말 출력은 `Usage`, `Options`, `Examples`, `Exit codes` 순서를 따릅니다.

- 종료 코드 `0`: 모든 필수 파일 및 설정의 유효성이 확인되었습니다.
- 종료 코드 `1`: 검증 실패 또는 유효하지 않은 옵션이 제공되었습니다.

에이전트나 자동화 도구는 텍스트 기반 성공/실패 메시지 대신 `--json` 출력의 `ok`, `issues` 필드를 활용하세요.
